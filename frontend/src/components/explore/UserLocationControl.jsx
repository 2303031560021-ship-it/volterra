import { useMap } from 'react-leaflet';

export default function UserLocationControl({ 
  onLocate, 
  isLocating, 
  hasLocation, 
  onRecenter 
}) {
  const map = useMap(); // Used to stop propagation if needed, but not strictly necessary for this UI layer since we position absolute outside MapContainer or inside custom container.
  
  // Note: we'll actually use this component outside the MapContainer so it floats naturally,
  // or inside it using a standard leaflet portal. Given the user's styling constraints, 
  // absolute positioning over the map wrapper is often cleanest in React.
  // Wait, I am importing useMap, so it MUST be inside MapContainer.

  return (
    <div className="leaflet-top leaflet-right z-[1000] mt-4 mr-4 pointer-events-auto absolute right-0 top-0">
      <div className="leaflet-control">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (hasLocation && onRecenter) {
              onRecenter();
            } else if (onLocate) {
              onLocate();
            }
          }}
          disabled={isLocating}
          className={`flex items-center justify-center w-10 h-10 bg-white/90 backdrop-blur-md border border-outline-variant/20 rounded-xl shadow-sm hover:bg-surface-container transition-all group ${hasLocation ? 'text-secondary-container bg-primary hover:bg-primary/90 hover:text-secondary-container' : 'text-primary'}`}
          title={hasLocation ? "Re-center on my location" : "Use my location"}
          aria-label={hasLocation ? "Re-center on my location" : "Use my location"}
        >
          {isLocating ? (
            <div className="w-5 h-5 border-2 border-outline-variant/30 border-t-primary rounded-full animate-spin"></div>
          ) : (
            <span className="material-symbols-outlined text-lg transition-transform group-hover:scale-110">
              {hasLocation ? 'my_location' : 'location_searching'}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
