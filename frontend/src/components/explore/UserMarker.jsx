import { Marker, Circle } from 'react-leaflet';
import L from 'leaflet';

// The Volterra Lime navigation chevron
const userIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 20px; height: 20px; background-color: #C7F36B; border: 2px solid #101A18; border-radius: 50%; box-shadow: 0 4px 12px rgba(199,243,107,0.4);"></div>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#101A18" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="position: relative; z-index: 10;">
        <path d="M12 19V5M5 12l7-7 7 7"/>
      </svg>
    </div>
  `,
  className: 'volterra-user-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export default function UserMarker({ location }) {
  if (!location || !location.lat || !location.lng) return null;

  const position = [location.lat, location.lng];

  return (
    <>
      {location.accuracy && (
        <Circle
          center={position}
          radius={location.accuracy}
          pathOptions={{
            fillColor: '#C7F36B',
            fillOpacity: 0.15,
            color: '#C7F36B',
            weight: 1,
            opacity: 0.4
          }}
        />
      )}
      <Marker position={position} icon={userIcon} zIndexOffset={1000} />
    </>
  );
}
