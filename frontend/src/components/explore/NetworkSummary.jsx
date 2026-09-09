export default function NetworkSummary({ stations, summary }) {
  if (!stations && !summary) return null;

  const numStations = summary?.total_stations ? summary.total_stations.toLocaleString() : stations.length.toLocaleString();
  const numStates = summary?.unique_states_count || null;
  const numOperators = summary?.unique_operators_count || (stations ? new Set(stations.filter(s => s.operator).map(s => s.operator)).size : 0);

  return (
    <div className="flex flex-wrap items-center gap-6 md:gap-10 bg-white/50 border border-outline-variant/15 rounded-2xl px-6 py-4 shadow-sm">
      <div className="flex flex-col">
        <span className="font-headline-sm text-2xl font-bold text-primary">{numStations}</span>
        <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider">Stations Across India</span>
      </div>
      
      {numStates > 0 && (
        <>
          <div className="hidden sm:block w-[1px] h-8 bg-outline-variant/20"></div>
          <div className="flex flex-col">
            <span className="font-headline-sm text-2xl font-bold text-primary">{numStates}</span>
            <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider">States & UTs</span>
          </div>
        </>
      )}

      {numOperators > 0 && (
        <>
          <div className="hidden sm:block w-[1px] h-8 bg-outline-variant/20"></div>
          <div className="flex flex-col">
            <span className="font-headline-sm text-2xl font-bold text-primary">{numOperators}</span>
            <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider">Operators</span>
          </div>
        </>
      )}
    </div>
  );
}
