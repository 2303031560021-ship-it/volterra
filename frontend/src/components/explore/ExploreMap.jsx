import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createStationIcon } from './StationMarker';
import UserMarker from './UserMarker';
import UserLocationControl from './UserLocationControl';

// Helper component to manage map view bounds and centering
function MapController({ stations, selectedStation, routeCoordinates, userLocation }) {
  const map = useMap();
  
  useEffect(() => {
    // 1. If we have a route, fit bounds to the route
    if (routeCoordinates && routeCoordinates.length > 0) {
      const bounds = L.latLngBounds(routeCoordinates);
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 16,
        animate: true,
        duration: 0.8
      });
      return;
    }

    // 2. If a specific station is selected without a route, zoom to it
    if (selectedStation && selectedStation.coordinates) {
      map.setView(selectedStation.coordinates, 16, {
        animate: true,
        duration: 0.5
      });
      return;
    }

    // 3. Otherwise, fit bounds to all visible stations
    if (stations && stations.length > 0) {
      const bounds = L.latLngBounds(stations.map(s => s.coordinates));
      
      // If user location exists, include it in the initial framing
      if (userLocation && userLocation.lat && userLocation.lng) {
        bounds.extend([userLocation.lat, userLocation.lng]);
      }
      
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 14,
        animate: true,
        duration: 0.5
      });
    }
  }, [selectedStation, stations, routeCoordinates, userLocation, map]);
  
  return null;
}

export default function ExploreMap({ 
  stations, 
  selectedStationId, 
  onStationSelect,
  userLocation,
  isLocating,
  onLocateUser,
  onRecenterUser,
  routeCoordinates 
}) {
  // A temporary fallback center until the bounds fit triggers
  const fallbackCenter = stations.length > 0 ? stations[0].coordinates : [21.1702, 72.8311]; 

  return (
    <div className="w-full h-full rounded-[32px] overflow-hidden border border-outline-variant/20 shadow-xl shadow-primary/5 bg-surface-container relative z-0">
      <MapContainer 
        center={fallbackCenter} 
        zoom={11} 
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {/* Route Polyline */}
        {routeCoordinates && routeCoordinates.length > 0 && (
          <Polyline 
            positions={routeCoordinates} 
            pathOptions={{ 
              color: '#101A18', 
              weight: 4, 
              dashArray: '10, 10', 
              lineCap: 'round', 
              lineJoin: 'round',
              opacity: 0.8 
            }} 
          />
        )}

        {/* Station Markers */}
        {stations.map((station) => (
          <Marker
            key={station.id}
            position={station.coordinates}
            icon={createStationIcon(station.id === selectedStationId)}
            eventHandlers={{
              click: () => onStationSelect(station)
            }}
          />
        ))}

        {/* User Marker */}
        <UserMarker location={userLocation} />

        {/* UI Controls overlay */}
        <UserLocationControl 
          isLocating={isLocating}
          hasLocation={!!userLocation}
          onLocate={onLocateUser}
          onRecenter={onRecenterUser}
        />

        <MapController 
          stations={stations}
          selectedStation={stations.find(s => s.id === selectedStationId)} 
          routeCoordinates={routeCoordinates}
          userLocation={userLocation}
        />
      </MapContainer>

      {/* Internal Map CSS overrides */}
      <style>{`
        .leaflet-container {
          background: #F2F4EF;
          font-family: 'Inter', sans-serif;
        }
        .volterra-station-marker:hover {
          transform: scale(1.2);
          z-index: 1000 !important;
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
