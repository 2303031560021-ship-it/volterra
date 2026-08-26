import Papa from 'papaparse';

let cachedStations = null;

/**
 * Fetches and parses stations from the real final_master.csv.
 * 
 * @param {Object} filters 
 * @param {string} filters.type - e.g., 'All', 'AC', 'DC', 'AC/DC'
 * @param {string} filters.search - Search query
 * @returns {Promise<Array>} Array of station objects
 */
export async function fetchStations(filters = {}) {
  // Load and parse CSV once, then cache
  if (!cachedStations) {
    const response = await fetch('/final_master.csv');
    const csvText = await response.text();
    
    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });
    
    // Normalize dataset
    cachedStations = parsed.data
      .filter(row => row.latitude && row.longitude) // keep only valid coordinates
      .map((row, idx) => ({
        id: `st-${idx}`,
        name: row.station_name || 'Unknown Station',
        city: null, 
        state: null,
        coordinates: [parseFloat(row.latitude), parseFloat(row.longitude)],
        power_kw: row.power_kw ? parseFloat(row.power_kw) : null,
        ac_dc: row.ac_dc || null,
        charger_types: row.ac_dc ? [row.ac_dc] : [],
        connectors: row.connector_type ? row.connector_type.split(',').map(s => s.trim()) : [],
        points: null, // missing in dataset
        operator: row.operator && row.operator !== '(Unknown Operator)' ? row.operator : null,
        status: row.status || null,
        usage_cost: row.usage_cost ? parseFloat(row.usage_cost) : null,
        source: row.source || null
      }));
  }

  let results = [...cachedStations];

  if (filters.type && filters.type !== 'All') {
    results = results.filter(s => s.ac_dc && s.ac_dc.includes(filters.type));
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(s => 
      s.name.toLowerCase().includes(q) || 
      (s.operator && s.operator.toLowerCase().includes(q))
    );
  }

  return results;
}
