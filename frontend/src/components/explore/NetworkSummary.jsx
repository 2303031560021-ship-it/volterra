export default function NetworkSummary({ stations }) {
  if (!stations || stations.length === 0) return null;

  const numStations = stations.length;
  
  // Calculate unique cities only for stations that have a city
  const cities = stations.filter(s => s.city).map(s => s.city);
  const uniqueCities = new Set(cities).size;
  
  // Calculate unique operators only for stations that have an operator
  const operators = stations.filter(s => s.operator).map(s => s.operator);
  const uniqueOperators = new Set(operators).size;

  return (
    <div className="flex items-center gap-6 md:gap-12 bg-white/40 border border-outline-variant/10 rounded-2xl px-6 py-4">
      <div className="flex flex-col">
        <span className="font-headline-sm text-2xl font-bold text-primary">{numStations}</span>
        <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider">Stations</span>
      </div>
      
      {uniqueCities > 0 && (
        <>
          <div className="w-[1px] h-8 bg-outline-variant/20"></div>
          <div className="flex flex-col">
            <span className="font-headline-sm text-2xl font-bold text-primary">{uniqueCities}</span>
            <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider">Cities</span>
          </div>
        </>
      )}

      {uniqueOperators > 0 && (
        <>
          <div className="w-[1px] h-8 bg-outline-variant/20"></div>
          <div className="flex flex-col">
            <span className="font-headline-sm text-2xl font-bold text-primary">{uniqueOperators}</span>
            <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider">Operators</span>
          </div>
        </>
      )}
    </div>
  );
}
