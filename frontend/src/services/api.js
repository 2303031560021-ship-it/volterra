/**
 * VOLTERRA API Client
 * ===================
 * Communicates with the backend REST API serving final_india_dataset.csv.
 * Removes mock data dependency and ensures all station intelligence is
 * loaded dynamically from the verified BEE 26 October 2025 dataset snapshot.
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

/**
 * Fetches filtered stations from the backend API.
 * @param {Object} filters
 * @param {string} [filters.search] - Search string (station, operator, city, etc.)
 * @param {string} [filters.type] - e.g., 'All', 'AC', 'DC'
 * @param {string} [filters.state] - State name
 * @param {number} [filters.limit=500] - Max stations to return
 * @param {Array<number>} [filters.bounds] - [min_lat, min_lon, max_lat, max_lon]
 * @returns {Promise<Array>} Array of station objects
 */
export async function fetchStations(filters = {}) {
  const data = await fetchStationsWithMeta(filters);
  return data.stations || [];
}

/**
 * Fetches stations along with search metadata (bounds, entity_type, selected_station, message)
 */
export async function fetchStationsWithMeta(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.type && filters.type !== 'All') params.set('type', filters.type);
  if (filters.state && filters.state !== 'All') params.set('state', filters.state);
  if (filters.limit) params.set('limit', filters.limit.toString());
  else params.set('limit', '1500');
  if (filters.offset !== undefined) params.set('offset', filters.offset.toString());

  if (filters.bounds && filters.bounds.length === 4) {
    params.set('bounds', filters.bounds.join(','));
  }

  const response = await fetch(`${API_BASE_URL}/api/stations?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch stations: ${response.statusText}`);
  }
  return await response.json();
}

/**
 * Fetches hierarchical autocomplete suggestions as the user types
 */
export async function fetchSearchSuggestions(query) {
  if (!query || !query.trim()) return [];
  try {
    const response = await fetch(`${API_BASE_URL}/api/search/suggest?q=${encodeURIComponent(query.trim())}`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.suggestions || [];
  } catch (err) {
    console.error("Failed to fetch suggestions", err);
    return [];
  }
}

/**
 * Resolves precision hierarchical location query
 */
export async function resolveLocationSearch(query) {
  if (!query || !query.trim()) return null;
  const response = await fetch(`${API_BASE_URL}/api/search/resolve?q=${encodeURIComponent(query.trim())}`);
  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }
  return await response.json();
}

/**
 * Queries stations within radius from candidate coordinates.
 */
export async function fetchNearbyStations(lat, lng, options = {}) {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lng: lng.toString(),
    radius: (options.radius || 5).toString(),
    focus: options.focus || 'Any',
    minPower: options.minPower || 'Any'
  });

  const response = await fetch(`${API_BASE_URL}/api/stations/nearby?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch nearby stations: ${response.statusText}`);
  }
  return await response.json();
}

/**
 * Executes full location intelligence analysis on candidate coordinates.
 */
export async function analyzeLocation(candidate, options = {}) {
  const response = await fetch(`${API_BASE_URL}/api/analyze-location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      candidate,
      radius: options.radius || 5,
      focus: options.focus || 'Any',
      minPower: options.minPower || 'Any'
    })
  });
  if (!response.ok) {
    throw new Error(`Analysis request failed: ${response.statusText}`);
  }
  return await response.json();
}

/**
 * Generates alternative areas around candidate location with strong/moderate charging gaps.
 */
export async function fetchAlternativeAreas(candidate, options = {}) {
  const response = await fetch(`${API_BASE_URL}/api/alternative-areas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      candidate,
      radius: options.radius || 5,
      focus: options.focus || 'Any',
      minPower: options.minPower || 'Any'
    })
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch alternative areas: ${response.statusText}`);
  }
  const data = await response.json();
  return data.alternatives || [];
}

/**
 * Fetches dataset summary metadata.
 */
export async function fetchNetworkSummary() {
  const response = await fetch(`${API_BASE_URL}/api/network-summary`);
  if (!response.ok) {
    throw new Error(`Failed to fetch network summary: ${response.statusText}`);
  }
  return await response.json();
}
