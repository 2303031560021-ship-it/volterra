export default function StationDetails({ station, onClose, distanceFromUserKm, routeData, isRouting, onGetDirections, onClearRoute }) {
  if (!station) return null;

  return (
    <div className="bg-white rounded-[32px] p-6 shadow-xl border border-outline-variant/10 h-full flex flex-col max-h-[80vh] md:max-h-none overflow-y-auto relative scrollbar-hide">
      
      {/* Close Button (Mobile primarily, but useful on desktop too) */}
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container transition-colors"
        aria-label="Close details"
      >
        <span className="material-symbols-outlined text-sm text-on-surface-variant">close</span>
      </button>

      {/* Header */}
      <div className="mb-8 pr-8">
        <div className="text-[10px] font-bold text-primary/50 uppercase tracking-widest mb-2 flex items-center gap-1">
          <span className="material-symbols-outlined text-[12px]">ev_station</span>
          Charging Station
        </div>
        <h2 className="font-headline-lg text-3xl text-primary leading-tight mb-2">
          {station.name}
        </h2>
        {(station.city || station.state) && (
          <div className="flex items-center gap-2 text-on-surface-variant font-body-sm">
            <span className="material-symbols-outlined text-sm">location_on</span>
            {station.city}{station.city && station.state ? ', ' : ''}{station.state}
          </div>
        )}
      </div>

      <div className="w-full h-[1px] bg-outline-variant/20 mb-8"></div>

      {/* Details Grid */}
      <div className="flex-1 space-y-6">
        
        {station.charger_types && station.charger_types.length > 0 && (
          <div>
            <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider block mb-1">
              Charger Type
            </span>
            <div className="font-headline-md text-lg text-primary flex gap-2 flex-wrap">
              {station.charger_types.map(t => (
                <span key={t} className="bg-surface-container px-3 py-1 rounded-full text-sm">{t}</span>
              ))}
            </div>
          </div>
        )}

        {station.power_kw && (
          <div>
            <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider block mb-1">
              Max Power
            </span>
            <div className="font-headline-md text-2xl text-primary flex items-baseline gap-1">
              {station.power_kw} <span className="text-sm font-body-sm text-on-surface-variant">kW</span>
            </div>
          </div>
        )}

        {station.connectors && station.connectors.length > 0 && (
          <div>
            <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider block mb-1">
              Connectors
            </span>
            <div className="font-body-md text-primary flex gap-2 flex-wrap">
              {station.connectors.map(c => (
                <span key={c} className="border border-outline-variant/30 px-3 py-1 rounded-full text-sm font-medium">{c}</span>
              ))}
            </div>
          </div>
        )}

        {station.points && (
          <div>
            <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider block mb-1">
              Charging Points
            </span>
            <div className="font-headline-md text-xl text-primary">
              {station.points}
            </div>
          </div>
        )}

        {station.operator && (
          <div className="pt-4 border-t border-outline-variant/10">
            <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider block mb-1">
              Operator
            </span>
            <div className="font-headline-md text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary-container">business</span>
              {station.operator}
            </div>
          </div>
        )}

        {/* Status and Usage Cost */}
        {(station.status || station.usage_cost !== null) && (
          <div className="pt-4 border-t border-outline-variant/10 flex gap-8">
            {station.status && (
              <div>
                <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                  Status
                </span>
                <div className="font-body-md text-primary font-medium flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${station.status.toLowerCase().includes('available') || station.status.toLowerCase().includes('operational') ? 'bg-secondary' : 'bg-outline'}`}></span>
                  {station.status}
                </div>
              </div>
            )}
            
            {station.usage_cost !== null && (
              <div>
                <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider block mb-1">
                  Usage Cost
                </span>
                <div className="font-headline-md text-primary">
                  ₹{station.usage_cost} <span className="text-sm font-body-sm text-on-surface-variant font-normal">/ kWh</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Distance from you (if route is not active but location is known) */}
        {distanceFromUserKm && !routeData && (
          <div className="pt-4 border-t border-outline-variant/10">
            <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider block mb-1">
              Distance from you
            </span>
            <div className="font-headline-md text-primary">
              {distanceFromUserKm.toFixed(1)} <span className="text-sm font-body-sm text-on-surface-variant font-normal">km</span>
            </div>
          </div>
        )}

        {/* Route Summary (if route is active) */}
        {routeData && (
          <div className="pt-4 border-t border-outline-variant/10 bg-secondary-container/10 -mx-6 px-6 pb-2 mt-4">
            <span className="font-label-sm text-xs text-secondary uppercase tracking-wider block mb-2 pt-2">
              Route Summary
            </span>
            <div className="flex gap-8">
              <div>
                <span className="font-label-sm text-[10px] text-on-surface-variant uppercase block mb-1">Distance</span>
                <div className="font-headline-md text-primary">{routeData.distanceKm.toFixed(1)} <span className="text-sm font-body-sm text-on-surface-variant font-normal">km</span></div>
              </div>
              {routeData.durationMin > 0 && (
                <div>
                  <span className="font-label-sm text-[10px] text-on-surface-variant uppercase block mb-1">Est. Time</span>
                  <div className="font-headline-md text-primary">{routeData.durationMin} <span className="text-sm font-body-sm text-on-surface-variant font-normal">min</span></div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-6 mt-auto">
          {routeData ? (
            <button 
              onClick={onClearRoute}
              className="w-full py-4 rounded-xl border border-outline-variant/30 text-primary font-label-sm text-sm font-bold hover:bg-surface-container transition-colors"
            >
              Clear Route
            </button>
          ) : (
            <button 
              onClick={onGetDirections}
              disabled={isRouting}
              className="w-full bg-secondary-container text-primary py-4 rounded-xl font-label-sm text-sm font-bold hover:bg-[#b5e05c] transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              {isRouting ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                  Calculating...
                </>
              ) : (
                <>Get Directions →</>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
