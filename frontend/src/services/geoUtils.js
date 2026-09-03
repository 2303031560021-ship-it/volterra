// Haversine distance in km
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

export const SURAT_BOUNDS = {
  minLat: 21.0500,
  maxLat: 21.3000,
  minLng: 72.7000,
  maxLng: 72.9500
};

// Simplified rough boundary of Surat Municipal Corporation / City urban area
const SURAT_CITY_POLYGON = [
  [21.250, 72.750], // NW (Adajan/Pal outer)
  [21.290, 72.820], // N (Amroli/Kosad)
  [21.280, 72.920], // NE (Kamrej approach)
  [21.180, 72.930], // E (Kadodara approach)
  [21.100, 72.870], // SE (Sachin)
  [21.060, 72.820], // S (Bhestan/Un)
  [21.070, 72.740], // SW (Dumas approach)
  [21.130, 72.720], // W (Coastal edge)
  [21.170, 72.730]  // W (Hazira approach)
];

// Rough polygon for the Tapi River to exclude water candidates
const TAPI_RIVER_POLYGON = [
  [21.160, 72.710], // river mouth south
  [21.175, 72.770], 
  [21.190, 72.810],
  [21.220, 72.850],
  [21.240, 72.890],
  [21.270, 72.950], // river enters surat
  [21.285, 72.950], // north bank
  [21.250, 72.890],
  [21.235, 72.845],
  [21.205, 72.805],
  [21.195, 72.765],
  [21.180, 72.710] // river mouth north
];

export function pointInPolygon(point, vs) {
  const x = point[1], y = point[0]; // lng, lat
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][1], yi = vs[i][0];
    const xj = vs[j][1], yj = vs[j][0];
    
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function isValidCandidate(lat, lng) {
  // Must be in general bounding box first (fast check)
  if (lat < SURAT_BOUNDS.minLat || lat > SURAT_BOUNDS.maxLat || 
      lng < SURAT_BOUNDS.minLng || lng > SURAT_BOUNDS.maxLng) {
    return false;
  }
  
  const point = [lat, lng];
  
  // Must be inside Surat land boundary
  if (!pointInPolygon(point, SURAT_CITY_POLYGON)) {
    return false;
  }
  
  // Must NOT be in the river
  if (pointInPolygon(point, TAPI_RIVER_POLYGON)) {
    return false;
  }
  
  return true;
}

export function isWithinSurat(lat, lng) {
  return isValidCandidate(lat, lng);
}

export function generateGrid(stepKm = 1.0) {
  const grid = [];
  // Roughly 1 degree lat ~ 111 km, 1 degree lng ~ 104 km at this latitude
  const latStep = stepKm / 111;
  const lngStep = stepKm / 104;

  for (let lat = SURAT_BOUNDS.minLat; lat <= SURAT_BOUNDS.maxLat; lat += latStep) {
    for (let lng = SURAT_BOUNDS.minLng; lng <= SURAT_BOUNDS.maxLng; lng += lngStep) {
      grid.push({ lat, lng, name: `Grid Point (${lat.toFixed(3)}, ${lng.toFixed(3)})` });
    }
  }
  return grid;
}

export function getSector(centerLat, centerLng, pointLat, pointLng) {
  const dLat = pointLat - centerLat;
  const dLng = pointLng - centerLng;
  // Angle in radians from -PI to PI
  let angle = Math.atan2(dLat, dLng);
  // Convert to degrees 0-360
  angle = (angle * 180 / Math.PI + 360) % 360;
  
  // E=0, NE=45, N=90, NW=135, W=180, SW=225, S=270, SE=315
  if (angle >= 337.5 || angle < 22.5) return 'E';
  if (angle >= 22.5 && angle < 67.5) return 'NE';
  if (angle >= 67.5 && angle < 112.5) return 'N';
  if (angle >= 112.5 && angle < 157.5) return 'NW';
  if (angle >= 157.5 && angle < 202.5) return 'W';
  if (angle >= 202.5 && angle < 247.5) return 'SW';
  if (angle >= 247.5 && angle < 292.5) return 'S';
  if (angle >= 292.5 && angle < 337.5) return 'SE';
  return 'Unknown';
}
