import { calculateDistance, getSector } from './geoUtils';

export function analyzeCandidate(location, parameters, allStations) {
  const { lat, lng } = location;
  const { radius, focus, minPower } = parameters;
  
  // 1. Calculate distances and filter by radius
  let nearbyStations = [];
  
  allStations.forEach(st => {
    if (!st.coordinates || st.coordinates.length < 2) return;
    const distance = calculateDistance(lat, lng, st.coordinates[0], st.coordinates[1]);
    if (distance <= radius) {
      nearbyStations.push({ ...st, distance });
    }
  });

  // 2. Filter relevant stations based on Focus and Power
  let relevantStations = nearbyStations.filter(st => {
    // Check Focus
    if (focus === 'AC') {
      if (!st.charger_types.includes('AC') && st.ac_dc !== 'AC' && st.ac_dc !== 'AC (Single-Phase)') return false;
    } else if (focus === 'DC') {
      if (!st.charger_types.includes('DC') && st.ac_dc !== 'DC') return false;
    } else if (focus === 'High-Power DC') {
      if (!st.charger_types.includes('DC') && st.ac_dc !== 'DC') return false;
      // Also require high power explicitly if defined. For this dataset, we can use >= 50 or fallback.
      const isHighPower = st.power_kw >= 50;
      if (!isHighPower) return false;
    }

    // Check Minimum Power
    if (minPower !== 'Any') {
      const p = parseFloat(minPower);
      if (st.power_kw === null || st.power_kw < p) return false;
    }

    return true;
  });

  // Sort by distance
  relevantStations.sort((a, b) => a.distance - b.distance);

  // 3. Calculate the 6 factors
  const factors = {};
  
  const N = relevantStations.length;
  
  // A. Infrastructure Pressure
  const area = Math.PI * radius * radius;
  const density = N / area;
  let pressureClass = 'Low';
  if (N >= 5 || density >= 0.5) pressureClass = 'High';
  else if (N >= 2) pressureClass = 'Moderate';
  factors.pressure = {
    value: N,
    density: density.toFixed(2),
    classification: pressureClass,
    text: `${N} ${N === 1 ? 'charger' : 'chargers'} within ${radius} km`
  };

  // B. Proximity & Access Gap
  let accessClass = 'Large';
  let nearestDist = N > 0 ? relevantStations[0].distance : null;
  if (nearestDist === null) {
    accessClass = 'Large';
  } else if (nearestDist <= 1.0) {
    accessClass = 'Small';
  } else if (nearestDist <= 3.0) {
    accessClass = 'Moderate';
  }
  factors.access = {
    nearestDistance: nearestDist,
    classification: accessClass,
    text: nearestDist !== null ? `Nearest charger: ${nearestDist.toFixed(1)} km` : 'No chargers nearby'
  };

  // C. Charging Mix Gap (using all nearby to compare mix)
  const acCount = nearbyStations.filter(s => s.charger_types.includes('AC') || s.ac_dc === 'AC' || s.ac_dc === 'AC (Single-Phase)').length;
  const dcCount = nearbyStations.filter(s => s.charger_types.includes('DC') || s.ac_dc === 'DC').length;
  let mixClass = 'Mixed';
  if (focus === 'DC' || focus === 'High-Power DC') {
    if (dcCount === 0) mixClass = 'DC underrepresented';
    else if (dcCount >= 3) mixClass = 'DC well represented';
    else mixClass = 'DC moderately represented';
  } else if (focus === 'AC') {
    if (acCount === 0) mixClass = 'AC underrepresented';
    else if (acCount >= 3) mixClass = 'AC well represented';
    else mixClass = 'AC moderately represented';
  }
  factors.mix = {
    acCount,
    dcCount,
    classification: mixClass,
    text: nearbyStations.length > 0 ? `${Math.round((focus.includes('DC') ? dcCount : acCount) / nearbyStations.length * 100)}% selected type` : 'No chargers nearby'
  };

  // D. Power Capability Gap
  const stationsWithPower = relevantStations.filter(s => s.power_kw !== null);
  const powerVals = stationsWithPower.map(s => s.power_kw).sort((a,b)=>a-b);
  let medianPower = null;
  if (powerVals.length > 0) {
    const mid = Math.floor(powerVals.length / 2);
    medianPower = powerVals.length % 2 !== 0 ? powerVals[mid] : (powerVals[mid - 1] + powerVals[mid]) / 2;
  }
  
  let powerClass = 'Limited coverage';
  if (powerVals.length === 0) {
    powerClass = 'Power data limited';
  } else {
    if (medianPower >= 60) powerClass = 'High-power present';
    else if (medianPower >= 22) powerClass = 'Moderate power';
    else powerClass = 'High-power limited';
  }
  
  factors.power = {
    medianPower,
    coverage: stationsWithPower.length,
    classification: powerClass,
    text: medianPower !== null ? `Median: ${medianPower} kW` : 'Unknown'
  };

  // E. Spatial Pattern
  let spatialClass = 'Insufficient evidence';
  let sectorCount = 0;
  if (N >= 2) {
    const sectors = new Set();
    relevantStations.forEach(st => {
      sectors.add(getSector(lat, lng, st.coordinates[0], st.coordinates[1]));
    });
    sectorCount = sectors.size;
    if (sectorCount >= 4) spatialClass = 'Broadly distributed';
    else if (sectorCount >= 2) spatialClass = 'Concentrated';
    else spatialClass = 'Highly concentrated';
  }
  factors.spatial = {
    sectorCount,
    classification: spatialClass,
    text: N >= 2 ? `${sectorCount} / 8 sectors represented` : 'Too few chargers'
  };

  // F. Operator Landscape
  const opCounts = {};
  let knownOps = 0;
  relevantStations.forEach(st => {
    if (st.operator && st.operator !== '(Unknown Operator)') {
      let op = st.operator;
      if (op === 'Evolute' || op === 'EVolute') op = 'EVolute';
      opCounts[op] = (opCounts[op] || 0) + 1;
      knownOps++;
    }
  });
  const opKeys = Object.keys(opCounts);
  let opClass = 'Insufficient evidence';
  if (opKeys.length > 2) opClass = 'Distributed';
  else if (opKeys.length === 2) opClass = 'Moderately concentrated';
  else if (opKeys.length === 1 && knownOps >= 2) opClass = 'Highly concentrated';
  
  factors.operator = {
    identifiedOperators: opKeys.length,
    classification: opClass,
    text: opKeys.length > 0 ? `${opKeys.length} identified operators` : 'Unknown operators'
  };

  // 4. Synthesis: Infrastructure Gap & Location Signal
  let gapScore = 0; 
  // Higher score = larger gap = better opportunity
  
  if (pressureClass === 'Low') gapScore += 3;
  else if (pressureClass === 'Moderate') gapScore += 1;
  
  if (accessClass === 'Large') gapScore += 3;
  else if (accessClass === 'Moderate') gapScore += 1;
  
  if (mixClass.includes('underrepresented')) gapScore += 2;
  
  if (powerClass === 'High-power limited') gapScore += 2;
  
  let signalClass = 'LIMITED CHARGING GAP';
  let signalHeadline = 'LIMITED CHARGING GAP';
  let signalColor = 'gray'; 
  
  if (N === 0) {
    signalClass = 'LIMITED MAPPED COVERAGE';
    signalHeadline = 'LIMITED MAPPED COVERAGE';
    signalColor = 'gray';
  } else if (gapScore >= 6) {
    signalClass = 'STRONG CHARGING GAP';
    signalHeadline = 'STRONG CHARGING GAP';
    signalColor = 'green';
  } else if (gapScore >= 3) {
    signalClass = 'MODERATE CHARGING GAP';
    signalHeadline = 'MODERATE CHARGING GAP';
    signalColor = 'yellow';
  }

  // Generate dynamic, grammar-aware, plain-English sentences
  const typeLabel = focus === 'Any' ? 'chargers' : `${focus} chargers`;
  const singleTypeLabel = focus === 'Any' ? 'charger' : `${focus} charger`;
  
  let primarySentence = "";
  let meaning = "";
  
  if (N === 0) {
    primarySentence = `No ${typeLabel} are mapped within ${radius} km.`;
    meaning = `Because there is very little mapped infrastructure here, the evidence is limited.`;
  } else if (signalColor === 'green') {
    primarySentence = `Few similar ${typeLabel} are nearby, and the nearest ones are relatively far away.`;
    meaning = `This means the area may be worth comparing with other parts of Surat.`;
  } else if (signalColor === 'yellow') {
    primarySentence = `Some ${typeLabel} are nearby, but they are not very common in this area.`;
    meaning = `Some charging is already available here, but it is not common.`;
  } else {
    primarySentence = `Similar ${typeLabel} are already fairly common and close to this site.`;
    meaning = `This area is already well covered by existing chargers.`;
  }

  const evidence = [];
  
  // Fact 1: Count
  if (N === 0) {
    evidence.push({
      headline: `0 ${typeLabel}`,
      text: `are mapped within ${radius} km.`
    });
  } else if (N === 1) {
    evidence.push({
      headline: `1 ${singleTypeLabel}`,
      text: `is mapped within ${radius} km.`
    });
  } else {
    evidence.push({
      headline: `${N} ${typeLabel}`,
      text: `are mapped within ${radius} km.`
    });
  }
  
  // Fact 2: Distance
  if (N > 0 && nearestDist !== null) {
    evidence.push({
      headline: `${nearestDist.toFixed(1)} km`,
      text: `to the nearest ${singleTypeLabel}.`
    });
  }

  // Fact 3: Mix (if relevant)
  if (N > 0 && nearbyStations.length > N) {
    evidence.push({
      headline: `${N} of ${nearbyStations.length}`,
      text: `nearby chargers ${N === 1 ? 'is' : 'are'} ${focus !== 'Any' ? focus : 'relevant'}.`
    });
  } else if (N > 0 && nearbyStations.length === N && focus !== 'Any') {
    evidence.push({
      headline: `All ${N}`,
      text: `nearby chargers are ${focus}.`
    });
  }
  
  // Fact 4: Power (if available) - use to fill out the 3 cards if needed
  if (N > 0 && medianPower !== null && evidence.length < 3) {
    evidence.push({
      headline: `${medianPower} kW`,
      text: N === 1 ? `provided by the nearby charger.` : `typical ${singleTypeLabel} power.`
    });
  }

  // Final conclusion line for evidence if we need a 3rd card
  if (evidence.length < 3) {
    if (N === 0) {
      evidence.push({ headline: 'Limited data', text: `This area has limited mapped coverage.` });
    } else if (signalColor === 'green') {
      evidence.push({ headline: 'Strong gap', text: `This area has a strong charging gap.` });
    } else if (signalColor === 'yellow') {
      evidence.push({ headline: 'Moderate gap', text: `This area has a moderate charging gap.` });
    } else {
      evidence.push({ headline: 'Well covered', text: `This area is already well covered.` });
    }
  }

  // Update Factors text for "More Details"
  if (N >= 2 && sectorCount >= 4) {
    factors.spatial.text = `Chargers are spread across most parts of the search area.`;
  } else if (N >= 2) {
    factors.spatial.text = `Most chargers are clustered on one side of the search area.`;
  } else {
    factors.spatial.text = `Not enough nearby chargers to clearly describe the spread.`;
  }

  if (opKeys.length === 1 && knownOps >= 2) {
    factors.operator.text = `Most nearby chargers are run by the same operator.`;
  } else if (opKeys.length > 1) {
    factors.operator.text = `Nearby chargers are run by several different operators.`;
  } else {
    factors.operator.text = `Operator information is limited for nearby chargers.`;
  }

  if (stationsWithPower.length > 0) {
    factors.power.text = `Power information is available for ${stationsWithPower.length} of ${N} nearby ${typeLabel}.`;
  } else {
    factors.power.text = `Power information is not available for nearby chargers.`;
  }

  return {
    candidate: location,
    parameters,
    nearbyCount: nearbyStations.length,
    relevantStations,
    factors,
    signal: {
      classification: signalClass,
      headline: signalHeadline,
      color: signalColor,
      primarySentence,
      meaning,
      evidence,
      gapScore
    },
    raw: {
      nearbyStations,
      opCounts
    }
  };
}
