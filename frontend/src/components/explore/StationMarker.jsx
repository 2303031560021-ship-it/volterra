import L from 'leaflet';

/**
 * Creates a Leaflet divIcon representing a Volterra station marker.
 * Optimized size and rendering for smooth multi-thousand point display.
 * @param {boolean} isSelected 
 * @returns {L.DivIcon}
 */
export function createStationIcon(isSelected) {
  const html = isSelected
    ? `
      <div style="position: relative; width: 22px; height: 22px;">
        <div style="position: absolute; top: -3px; left: -3px; width: 28px; height: 28px; background-color: rgba(199,243,107,0.35); border-radius: 50%; animation: pulse 2s infinite;"></div>
        <div style="position: absolute; top: 0; left: 0; width: 22px; height: 22px; background-color: #C7F36B; border: 2px solid #101A18; border-radius: 50%; box-shadow: 0 4px 12px rgba(199,243,107,0.5);"></div>
      </div>
    `
    : `
      <div style="width: 10px; height: 10px; background-color: #101A18; border: 1.5px solid #F8FAF5; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.3); transition: transform 0.15s;"></div>
    `;

  return L.divIcon({
    html,
    className: 'volterra-station-marker',
    iconSize: isSelected ? [22, 22] : [10, 10],
    iconAnchor: isSelected ? [11, 11] : [5, 5],
  });
}
