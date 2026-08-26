/**
 * Calculates the straight-line (Haversine) distance between two coordinate pairs.
 * @param {Array} coords1 [lat, lng]
 * @param {Array} coords2 [lat, lng]
 * @returns {number} Distance in kilometers
 */
export function calculateHaversineDistance([lat1, lon1], [lat2, lon2]) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  const distance = R * c; 
  return distance;
}

/**
 * Fetches a road route from the public OSRM routing API.
 * Uses the driving profile.
 * 
 * @param {Array} startCoords [lat, lng]
 * @param {Array} endCoords [lat, lng]
 * @returns {Promise<{ coordinates: Array, distanceKm: number, durationMin: number }>}
 */
export async function getRoute(startCoords, endCoords) {
  // OSRM expects coordinates in lng,lat format
  const startStr = `${startCoords[1]},${startCoords[0]}`;
  const endStr = `${endCoords[1]},${endCoords[0]}`;
  
  const url = `https://router.project-osrm.org/route/v1/driving/${startStr};${endStr}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Routing service returned an error');
    
    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('No route found');
    }

    const route = data.routes[0];
    
    // OSRM GeoJSON geometries return coordinates as [lng, lat]
    // Leaflet expects [lat, lng] for Polylines, so we flip them
    const coordinates = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    
    const distanceKm = route.distance / 1000;
    const durationMin = Math.round(route.duration / 60);

    return {
      coordinates,
      distanceKm,
      durationMin
    };
  } catch (error) {
    console.error("Routing error:", error);
    throw error;
  }
}
