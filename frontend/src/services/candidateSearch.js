import { generateGrid, isValidCandidate } from './geoUtils';
import { analyzeCandidate } from './analysisEngine';

export async function findAlternativeAreas(parameters, allStations) {
  // Step size approx 1.0km for denser sampling
  const grid = generateGrid(1.0);
  const { radius } = parameters;

  // Adaptive separation: max(1.5 km, 0.30 * analysis radius), capped reasonably
  const minSeparation = Math.min(4.0, Math.max(1.5, 0.30 * radius));

  const evaluated = [];

  // Evaluate each grid point
  grid.forEach(point => {
    // 1. Point-in-polygon validation (water & bounds) - HARD FILTER
    if (!isValidCandidate(point.lat, point.lng)) {
      return;
    }

    // 2. Pre-Ranking Urban Relevance Check (SOFT FILTER)
    const distToCenter = calculateDistanceSimple(point.lat, point.lng, 21.1702, 72.8311);

    let minGlobalDist = Infinity;
    allStations.forEach(st => {
      const d = calculateDistanceSimple(point.lat, point.lng, st.coordinates[0], st.coordinates[1]);
      if (d < minGlobalDist) minGlobalDist = d;
    });

    let urbanRelevance = 0;
    if (distToCenter <= 5) urbanRelevance += 0.8;
    else if (distToCenter <= 9) urbanRelevance += 0.5;
    else urbanRelevance += 0.2; // Edge/outskirts

    if (minGlobalDist <= 2.5) urbanRelevance += 0.4;
    else if (minGlobalDist <= 5) urbanRelevance += 0.2;
    else urbanRelevance += 0.05;

    urbanRelevance = Math.min(1, urbanRelevance / 1.2);

    const result = analyzeCandidate(point, parameters, allStations);

    // 3. Meaningful Gap Calculation
    let scarcityScore = 0;
    if (result.nearbyCount === 0) {
      scarcityScore = 0.5; // Treated as limited mapped evidence, not perfect opportunity
    } else if (result.nearbyCount <= 2) {
      scarcityScore = 1.0; // Ideal gap in an established area
    } else if (result.nearbyCount <= 5) {
      scarcityScore = 0.7;
    } else {
      scarcityScore = 0.2;
    }

    let accessScore = 0;
    if (result.factors.access.nearestDistance === null) {
      accessScore = 0.5;
    } else {
      const dist = result.factors.access.nearestDistance;
      if (dist >= 4) accessScore = 1.0;
      else if (dist >= 2) accessScore = 0.7;
      else accessScore = 0.3;
    }

    let rawGapScore = Math.max(0, Math.min(1, result.signal.gapScore / 10));

    // Composite Score
    const compositeScore =
      (urbanRelevance * 0.35) +
      (accessScore * 0.25) +
      (scarcityScore * 0.20) +
      (rawGapScore * 0.20);

    // Dynamic phrasing based on new logic
    if (result.nearbyCount === 0) {
      result.signal.headline = "LIMITED MAPPED COVERAGE";
      result.signal.explanation = "Few similar chargers are mapped nearby, but this area has less proven context.";
    } else if (compositeScore >= 0.7 && urbanRelevance >= 0.6) {
      result.signal.headline = "STRONG CHARGING GAP";
      result.signal.explanation = "Few similar chargers nearby.";
    } else {
      result.signal.headline = "MODERATE CHARGING GAP";
      result.signal.explanation = "Existing chargers are present, but coverage is limited.";
    }

    evaluated.push({
      ...result,
      internalScore: compositeScore,
      urbanRelevance
    });
  });

  // Sort descending by score
  evaluated.sort((a, b) => b.internalScore - a.internalScore);

  // TIERED SYSTEM
  const tier1 = evaluated.filter(c => c.urbanRelevance >= 0.6 && c.internalScore >= 0.65);
  const tier2 = evaluated.filter(c => c.urbanRelevance >= 0.4 && c.internalScore >= 0.5 && !tier1.includes(c));
  const tier3 = evaluated.filter(c => !tier1.includes(c) && !tier2.includes(c));

  const diversifyAndSelect = (pool, target) => {
    const selected = [];
    for (let candidate of pool) {
      if (selected.length >= target) break;
      let isDistinct = true;
      for (let s of selected) {
        const dist = calculateDistanceSimple(
          candidate.candidate.lat, candidate.candidate.lng,
          s.candidate.lat, s.candidate.lng
        );
        if (dist < minSeparation) {
          isDistinct = false;
          break;
        }
      }
      if (isDistinct) {
        selected.push(candidate);
      }
    }
    return selected;
  };

  let candidatePool = diversifyAndSelect(tier1, 6);
  if (candidatePool.length < 6) {
    candidatePool = diversifyAndSelect([...tier1, ...tier2], 6);
  }
  if (candidatePool.length < 6) {
    candidatePool = diversifyAndSelect([...tier1, ...tier2, ...tier3], 6);
  }

  candidatePool = candidatePool.slice(0, 6);

  const existingNames = [];
  const namedCandidates = [];

  for (let area of candidatePool) {
    if (namedCandidates.length >= 3) break;

    const resolvedName = await getHumanReadableAreaName(area.candidate.lat, area.candidate.lng, existingNames);

    // Only accept it if it's a genuine geographic name (not a fallback)
    if (resolvedName.source !== 'fallback') {
      area.candidate.name = resolvedName;
      existingNames.push(resolvedName.displayName);
      namedCandidates.push(area);
    } else {
      // Temporarily store the fallback name on the candidate in case we need it as a last resort
      area.candidate.name = resolvedName;
    }
  }

  // If we couldn't find 3 fully qualified named candidates, backfill from the pool
  if (namedCandidates.length < 3) {
    for (let area of candidatePool) {
      if (namedCandidates.length >= 3) break;
      if (!namedCandidates.includes(area)) {
        // Ensure its name isn't a duplicate if we're falling back
        if (!existingNames.includes(area.candidate.name.displayName)) {
          existingNames.push(area.candidate.name.displayName);
        }
        namedCandidates.push(area);
      }
    }
  }

  return namedCandidates;
}

const geocodeCache = new Map();
const AREA_NAME_NEAR_DISTANCE_KM = 3.0;

async function getHumanReadableAreaName(lat, lng, existingNames) {
  const roundLat = Math.round(lat * 1000) / 1000;
  const roundLng = Math.round(lng * 1000) / 1000;
  const cacheKey = `${roundLat},${roundLng}`;

  let cached = geocodeCache.get(cacheKey);
  if (cached) return cached;

  const cleanName = (name) => {
    if (!name) return "";
    let cleaned = name.replace(/,\s*(Surat|Surat District|Surat Municipal Corporation.*|Surat Taluka|Gujarat|India|\d{6}).*/ig, '').trim();
    if (/^Ward\s*\d+$/i.test(cleaned)) return "";
    return cleaned;
  };

  const isValidBaseName = (name) => {
    const cleaned = cleanName(name);
    return cleaned && cleaned.toLowerCase() !== 'surat' && cleaned.toLowerCase() !== 'surat city';
  };

  const createResult = (displayName, baseName, source, confidence) => {
    const result = { displayName, baseName, source, confidence };
    geocodeCache.set(cacheKey, result);
    return result;
  };

  try {
    // PASS 1: Zoom 18 for exact locality or immediate street/landmark
    const res18 = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`);
    const data18 = await res18.json();

    let p1, p2, p3, p4, p5, p6;
    if (data18 && data18.address) {
      const addr = data18.address;
      p1 = addr.neighbourhood;
      p2 = addr.suburb;
      p3 = addr.quarter || addr.locality || addr.city_district;
      p4 = addr.town || addr.village || addr.isolated_dwelling || addr.hamlet;
      p5 = addr.aeroway || addr.tourism || addr.amenity || addr.leisure || addr.building; // removed shop to avoid tiny POIs
      p6 = addr.road;

      const exactCandidates = [p1, p2, p3, p4].filter(isValidBaseName);

      // If we find an exact locality
      for (let base of exactCandidates) {
        const cleanBase = cleanName(base);
        if (!existingNames.includes(cleanBase)) {
          return createResult(cleanBase, cleanBase, "locality", "high");
        }
      }

      // If all exact localities are duplicates, try to refine with a road
      const bestExact = exactCandidates[0] ? cleanName(exactCandidates[0]) : null;
      if (bestExact) {
        if (p6 && isValidBaseName(p6)) {
          const refined = `${bestExact} — near ${cleanName(p6)}`;
          if (!existingNames.includes(refined)) {
            return createResult(refined, bestExact, "locality_refined", "high");
          }
        }
        // If we can't refine, we just return the exact duplicate
        return createResult(bestExact, bestExact, "locality", "high");
      }
    }

    // PASS 2: If no exact locality found, zoom=14 lookup to find nearest meaningful suburb/locality
    const res14 = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`);
    const data14 = await res14.json();

    if (data14 && data14.address) {
      const addr14 = data14.address;
      const nearLoc = addr14.suburb || addr14.neighbourhood || addr14.locality || addr14.quarter || addr14.village || addr14.town;

      if (isValidBaseName(nearLoc)) {
        const featureLat = parseFloat(data14.lat);
        const featureLon = parseFloat(data14.lon);
        const distance = calculateDistanceSimple(lat, lng, featureLat, featureLon);

        if (distance <= AREA_NAME_NEAR_DISTANCE_KM) {
          const cleanBase = cleanName(nearLoc);
          const displayName = `Near ${cleanBase}`;

          if (!existingNames.includes(displayName)) {
            return createResult(displayName, cleanBase, "nearby_locality", "medium");
          } else {
            return createResult(displayName, cleanBase, "nearby_locality", "medium");
          }
        }
      }
    }

    // PASS 3: Fallbacks using zoom 18 data (landmark or road)
    if (data18 && data18.address) {
      if (p5 && isValidBaseName(p5)) {
        const cleanBase = cleanName(p5);
        const displayName = `Near ${cleanBase}`;
        if (!existingNames.includes(displayName)) return createResult(displayName, cleanBase, "landmark", "medium");
      }
      if (p6 && isValidBaseName(p6)) {
        const cleanBase = cleanName(p6);
        const displayName = `Near ${cleanBase}`;
        if (!existingNames.includes(displayName)) return createResult(displayName, cleanBase, "road", "low");
      }
    }

  } catch (err) {
    console.error("Geocoding failed", err);
  }

  // 4. Directional Fallback (Absolute Last Resort)
  const getDirectionalFallback = () => {
    if (lat > 21.19) return "North Surat";
    if (lat < 21.15) return "South Surat";
    if (lng > 72.85) return "East Surat";
    if (lng < 72.81) return "West Surat";
    return "Central Surat";
  };

  const directional = getDirectionalFallback();
  if (!existingNames.includes(directional)) {
    return createResult(directional, directional, "fallback", "low");
  }

  return createResult("Unnamed location", "Unnamed location", "fallback", "low");
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
