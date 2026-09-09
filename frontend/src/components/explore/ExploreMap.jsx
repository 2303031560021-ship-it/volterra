import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createStationIcon } from './StationMarker';
import UserMarker from './UserMarker';
import UserLocationControl from './UserLocationControl';

// Tracks viewport bounds and zoom changes during user pan and zoom
function ViewportTracker({ onViewportChange }) {
  const map = useMapEvents({
    moveend: () => {
      if (onViewportChange) {
        const b = map.getBounds();
        onViewportChange({
          bounds: [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()],
          zoom: map.getZoom()
        });
      }
    }
  });
  return null;
}

// Manages intentional centering (route, selection, search) without fighting user pan
function MapController({ routeCoordinates, searchQuery, searchBounds, searchPositionKey }) {
  const map = useMap();
  const lastSearchRef = useRef(searchQuery);
  const lastSearchPositionRef = useRef(searchPositionKey);

  useEffect(() => {
    // Fit bounds when a route is calculated.
    if (routeCoordinates && routeCoordinates.length > 0) {
      const bounds = L.latLngBounds(routeCoordinates);
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 16,
        animate: true,
        duration: 0.8
      });
    }
  }, [routeCoordinates, map]);

  useEffect(() => {
    // Position once after an explicit search selection completes.
    if (searchPositionKey !== lastSearchPositionRef.current && searchBounds && searchBounds.length === 4) {
      lastSearchPositionRef.current = searchPositionKey;
      lastSearchRef.current = searchQuery;
      const [minLat, minLon, maxLat, maxLon] = searchBounds;
      map.fitBounds([[minLat, minLon], [maxLat, maxLon]], {
        padding: [50, 50],
        maxZoom: 15,
        animate: true,
        duration: 0.8
      });
      return;
    }

    // When search is cleared, restore default pan-India view.
    if (!searchQuery && lastSearchRef.current) {
      lastSearchRef.current = '';
      map.setView([21.5, 78.96], 5, {
        animate: true,
        duration: 0.8
      });
    }
  }, [searchQuery, searchBounds, searchPositionKey, map]);

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
  routeCoordinates,
  searchQuery,
  searchBounds,
  searchPositionKey,
  onViewportChange
}) {
  const INDIA_CENTER = [21.5, 78.96];

  return (
    <div className="w-full h-full rounded-[32px] overflow-hidden border border-outline-variant/20 shadow-xl shadow-primary/5 bg-surface-container relative z-0">
      <MapContainer
        center={INDIA_CENTER}
        zoom={5}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
          location={userLocation}
          onLocate={onLocateUser}
          onRecenter={onRecenterUser}
        />

        <MapController
          routeCoordinates={routeCoordinates}
          searchQuery={searchQuery}
          searchBounds={searchBounds}
          searchPositionKey={searchPositionKey}
        />

        <ViewportTracker onViewportChange={onViewportChange} />
      </MapContainer>

      <div className="absolute bottom-4 left-4 z-[500] pointer-events-none rounded-lg border border-outline-variant/20 bg-white/90 px-3 py-2 shadow-sm backdrop-blur-md">
        <div className="font-label-sm text-[10px] font-bold tracking-wide text-primary">
          Data status: Under development
        </div>
        <div className="font-body-sm text-[10px] text-on-surface-variant">
          Coverage may be incomplete. Some stations or locations may not yet be available.
        </div>
      </div>

      {/* Internal Map CSS overrides */}
      <style>{`
        .leaflet-container {
          background: #F2F4EF;
          font-family: 'Inter', sans-serif;
        }
        .volterra-station-marker:hover {
          transform: scale(1.3);
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
