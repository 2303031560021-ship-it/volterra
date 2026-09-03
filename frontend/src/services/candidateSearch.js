import { generateGrid, isValidCandidate } from './geoUtils';
import { analyzeCandidate } from './analysisEngine';

export async function findAlternativeAreas(parameters, allStations) {
  // Step size approx 1.5km
  const grid = generateGrid(1.5);
  const { radius } = parameters;
  const minSeparation = 0.75 * radius; 
  
  const evaluated = [];

  // Evaluate each grid point
  grid.forEach(point => {
    // 1. Point-in-polygon validation (water & bounds)
    if (!isValidCandidate(point.lat, point.lng)) {
      return;
    }

    // 2. Pre-Ranking Urban Relevance Check
    const distToCenter = calculateDistanceSimple(point.lat, point.lng, 21.1702, 72.8311);
    
    let minGlobalDist = Infinity;
    allStations.forEach(st => {
      const d = calculateDistanceSimple(point.lat, point.lng, st.coordinates[0], st.coordinates[1]);
      if (d < minGlobalDist) minGlobalDist = d;
    });

    // Hard filter: Reject extreme isolated outskirts
    if (distToCenter > 10 && minGlobalDist > 6) {
      return; 
    }

    let urbanRelevance = 0;
    if (distToCenter <= 5) urbanRelevance += 0.6;
    else if (distToCenter <= 9) urbanRelevance += 0.3;
    else urbanRelevance += 0.1;

    if (minGlobalDist <= 2.5) urbanRelevance += 0.4;
    else if (minGlobalDist <= 5) urbanRelevance += 0.2;

    const result = analyzeCandidate(point, parameters, allStations);
    
    // 3. Meaningful Gap Calculation (Avoid rewarding absolute zero mathematically)
    let scarcityScore = 0;
    if (result.nearbyCount === 0) {
      scarcityScore = 0.7; // Good, but less confident
    } else if (result.nearbyCount <= 2) {
      scarcityScore = 1.0; // Ideal gap in an established area
    } else if (result.nearbyCount <= 5) {
      scarcityScore = 0.6;
    } else {
      scarcityScore = 0.2;
    }

    let accessScore = 0;
    if (result.factors.access.nearestDistance === null) {
      accessScore = 0.7; // No nearest within radius
    } else {
      const dist = result.factors.access.nearestDistance;
      if (dist >= 4) accessScore = 1.0;
      else if (dist >= 2) accessScore = 0.6;
      else accessScore = 0.2;
    }

    let rawGapScore = Math.max(0, Math.min(1, result.signal.gapScore / 10));

    // Composite Score (35% Urban, 25% Access, 20% Scarcity, 20% Type/Power)
    const compositeScore = 
      (urbanRelevance * 0.35) + 
      (accessScore * 0.25) + 
      (scarcityScore * 0.20) + 
      (rawGapScore * 0.20);

    // Override Signal logic for alternatives
    if (result.nearbyCount === 0) {
      result.signal.headline = "LIMITED MAPPED COVERAGE";
      result.signal.explanation = "Very few similar chargers are mapped nearby, but this area has less proven context.";
    } else if (compositeScore >= 0.7) {
      result.signal.headline = "STRONG CHARGING GAP";
      result.signal.explanation = `Established area with limited nearby coverage for your focus.`;
    } else {
      result.signal.headline = "MODERATE CHARGING GAP";
      result.signal.explanation = `Some coverage exists, but it leaves a measurable gap.`;
    }

    // Add urban context suffix to explanation if highly relevant
    if (urbanRelevance > 0.8 && result.nearbyCount > 0) {
      result.signal.explanation = "Established urban area. " + result.signal.explanation;
    }

    evaluated.push({
      ...result,
      internalScore: compositeScore
    });
  });

  // Sort descending by score
  evaluated.sort((a, b) => b.internalScore - a.internalScore);

  // Pick top 3 geographically distinct
  const top3 = [];
  
  for (let candidate of evaluated) {
    if (top3.length >= 3) break;
    
    let isDistinct = true;
    for (let selected of top3) {
      const dist = calculateDistanceSimple(
        candidate.candidate.lat, candidate.candidate.lng,
        selected.candidate.lat, selected.candidate.lng
      );
      if (dist < minSeparation) {
        isDistinct = false;
        break;
      }
    }
    
    if (isDistinct && candidate.internalScore >= 3) {
      top3.push(candidate);
    }
  }

  const existingNames = [];
  
  for (let area of top3) {
    area.candidate.name = await getHumanReadableAreaName(area.candidate.lat, area.candidate.lng, existingNames);
    existingNames.push(area.candidate.name);
  }

  return top3;
}

const geocodeCache = new Map();

async function getHumanReadableAreaName(lat, lng, existingNames) {
  const roundLat = Math.round(lat * 1000) / 1000;
  const roundLng = Math.round(lng * 1000) / 1000;
  const cacheKey = `${roundLat},${roundLng}`;

  let data = geocodeCache.get(cacheKey);
  if (!data) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`);
      data = await res.json();
      geocodeCache.set(cacheKey, data);
    } catch (err) {
      console.error("Geocoding failed", err);
      data = null;
    }
  }

  const cleanName = (name) => {
    if (!name) return "";
    return name.replace(/,\s*(Surat|Surat District|Surat Taluka|Gujarat|India|\d{6}).*/ig, '').trim();
  };

  const attemptName = (name) => {
    if (!name) return null;
    const clean = cleanName(name);
    if (clean && !existingNames.includes(clean)) return clean;
    return null;
  };

  let finalName = null;

  if (data && data.address) {
    // 1. Priority 1 - Locality
    const locality = data.address.suburb || data.address.neighbourhood || data.address.locality || data.address.city_district || data.address.village;
    finalName = attemptName(locality);
    if (finalName) return finalName;

    // 2. Priority 2 - Landmark
    const landmark = data.address.amenity || data.address.tourism || data.address.leisure || data.address.shop || data.address.aeroway || data.address.building;
    if (landmark) {
      finalName = attemptName(`Near ${landmark}`);
      if (finalName) return finalName;
    }

    // 3. Priority 3 - Road
    const road = data.address.road;
    if (road) {
      finalName = attemptName(`Near ${road}`);
      if (finalName) return finalName;
      
      // Try combining locality and road if both exist but were individually duplicated
      if (locality) {
        finalName = attemptName(`${locality} — Near ${road}`);
        if (finalName) return finalName;
      }
    }
  }

  // 4. Priority 4 - Directional Fallback
  const getDirectionalFallback = () => {
    if (lat > 21.19) return "North Surat";
    if (lat < 21.15) return "South Surat";
    if (lng > 72.85) return "East Surat";
    if (lng < 72.81) return "West Surat";
    return "Central Surat";
  };
  
  finalName = attemptName(getDirectionalFallback());
  if (finalName) return finalName;

  // 5. Ultimate Fallback
  const baseFallback = "Unnamed area in Surat";
  if (!existingNames.includes(baseFallback)) return baseFallback;
  
  let i = 2;
  while (existingNames.includes(`${baseFallback} ${i}`)) {
    i++;
  }
  return `${baseFallback} ${i}`;
}

function calculateDistanceSimple(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
