import L from 'leaflet';

/**
 * Creates a Leaflet divIcon representing a Volterra station marker.
 * @param {boolean} isSelected 
 * @returns {L.DivIcon}
 */
export function createStationIcon(isSelected) {
  const html = isSelected
    ? `
      <div style="position: relative; width: 24px; height: 24px;">
        <div style="position: absolute; top: -4px; left: -4px; width: 32px; height: 32px; background-color: rgba(199,243,107,0.3); border-radius: 50%; animation: pulse 2s infinite;"></div>
        <div style="position: absolute; top: 0; left: 0; width: 24px; height: 24px; background-color: #C7F36B; border: 2px solid #101A18; border-radius: 50%; box-shadow: 0 4px 12px rgba(199,243,107,0.5);"></div>
      </div>
    `
    : `
      <div style="width: 14px; height: 14px; background-color: #101A18; border: 2px solid #F8FAF5; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); transition: transform 0.2s;"></div>
    `;

  return L.divIcon({
    html,
    className: 'volterra-station-marker',
    iconSize: isSelected ? [24, 24] : [14, 14],
    iconAnchor: isSelected ? [12, 12] : [7, 7],
  });
}
