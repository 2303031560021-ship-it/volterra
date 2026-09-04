import React from 'react';
import { MapContainer, TileLayer, Circle, Marker } from 'react-leaflet';
import L from 'leaflet';

const candidateIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 24px; height: 24px; background-color: #C7F36B; border: 3px solid #101A18; border-radius: 50%; box-shadow: 0 4px 12px rgba(199,243,107,0.5);"></div>
      <div style="position: absolute; width: 8px; height: 8px; background-color: #101A18; border-radius: 50%;"></div>
    </div>
  `,
  className: 'candidate-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const stationIcon = L.divIcon({
  html: `<div style="width: 12px; height: 12px; background-color: #101A18; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>`,
  className: 'station-dot-marker',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

export default function AnalysisPdfReport({ analysisResult }) {
  if (!analysisResult) return null;

  const { candidate, parameters, factors, signal, relevantStations, nearbyCount, alternatives } = analysisResult;
  const locName = candidate.name?.displayName || (typeof candidate.name === 'string' ? candidate.name : 'Selected Area');

  // Calculate analytics
  const acCount = relevantStations.filter(s => s.ac_dc === 'AC' || s.connector_type?.toLowerCase().includes('ac')).length;
  const dcCount = relevantStations.filter(s => s.ac_dc === 'DC' || s.connector_type?.toLowerCase().includes('dc')).length;

  const operatorCounts = relevantStations.reduce((acc, st) => {
    const op = st.operator || 'Unknown';
    acc[op] = (acc[op] || 0) + 1;
    return acc;
  }, {});
  const topOperators = Object.entries(operatorCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <div className="hidden print:block print:bg-white print:text-black">
      
      {/* --- PAGE 1 --- */}
      <div className="pdf-page">
        {/* Header */}
        <div className="border-b-2 border-primary pb-6 mb-8">
          <span className="font-label-sm uppercase tracking-widest text-on-surface-variant font-bold">Volterra</span>
          <h1 className="font-headline-lg text-3xl text-primary mt-2">Location Intelligence Report</h1>
          <div className="mt-6">
            <h2 className="font-headline-md text-2xl text-primary">{locName}</h2>
            <p className="font-body-md text-on-surface-variant">Generated from Volterra Location Analysis · {parameters.focus} Focus · {parameters.radius} km Radius</p>
          </div>
        </div>

        {/* Main Conclusion */}
        <div className="bg-surface-container rounded-2xl p-8 mb-8 border border-outline-variant/30 print-avoid-break">
          <span className="font-label-sm text-xs uppercase tracking-widest text-primary font-bold mb-3 block">
            {signal.classification}
          </span>
          <h3 className="font-headline-md text-2xl text-primary mb-4 leading-snug">
            {signal.primarySentence}
          </h3>
          <p className="font-body-md text-on-surface-variant">
            {signal.meaning}
          </p>
        </div>

        {/* Key Evidence Grid */}
        <div className="grid grid-cols-2 gap-6 mb-8 print-avoid-break">
          <div className="border-t border-outline-variant/30 pt-4">
            <span className="font-label-sm text-[10px] uppercase tracking-widest text-on-surface-variant block mb-1">Nearby chargers</span>
            <span className="font-headline-md text-xl text-primary">{nearbyCount}</span>
          </div>
          <div className="border-t border-outline-variant/30 pt-4">
            <span className="font-label-sm text-[10px] uppercase tracking-widest text-on-surface-variant block mb-1">Nearest relevant</span>
            <span className="font-headline-md text-xl text-primary">
              {factors.access.nearestDistance !== null ? `${factors.access.nearestDistance.toFixed(1)} km` : 'N/A'}
            </span>
          </div>
          <div className="border-t border-outline-variant/30 pt-4">
            <span className="font-label-sm text-[10px] uppercase tracking-widest text-on-surface-variant block mb-1">Charging Type Context</span>
            <span className="font-body-md text-sm text-primary">{factors.access.text}</span>
          </div>
          <div className="border-t border-outline-variant/30 pt-4">
            <span className="font-label-sm text-[10px] uppercase tracking-widest text-on-surface-variant block mb-1">Power Context</span>
            <span className="font-body-md text-sm text-primary">{factors.power.text}</span>
          </div>
        </div>

        {/* Map */}
        <div className="mb-4 print-avoid-break">
          <h3 className="font-label-sm text-xs uppercase tracking-widest text-primary font-bold mb-3 block">Map Context</h3>
          <div className="border border-outline-variant/30 rounded-xl overflow-hidden h-[360px] bg-surface-container relative">
             {/* MapContainer renders correctly in print if tiles are loaded. The print trigger in dashboard adds a small delay. */}
             <MapContainer 
              center={[candidate.lat, candidate.lng]} 
              zoom={13} 
              style={{ height: '100%', width: '100%', zIndex: 1 }}
              zoomControl={false}
              scrollWheelZoom={false}
              dragging={false}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                className="map-tiles-desaturated"
              />
              <Circle 
                center={[candidate.lat, candidate.lng]}
                radius={parameters.radius * 1000}
                pathOptions={{
                  fillColor: signal.color === 'green' ? '#C7F36B' : (signal.color === 'yellow' ? '#E8C96A' : '#A9B0AE'),
                  fillOpacity: 0.1,
                  color: signal.color === 'green' ? '#C7F36B' : (signal.color === 'yellow' ? '#E8C96A' : '#A9B0AE'),
                  weight: 2,
                  opacity: 0.5,
                  dashArray: '4 6'
                }}
              />
              {relevantStations.map(st => (
                <Marker key={st.id} position={st.coordinates} icon={stationIcon} />
              ))}
              <Marker position={[candidate.lat, candidate.lng]} icon={candidateIcon} />
            </MapContainer>
          </div>
        </div>
      </div>

      {/* --- PAGE 2 --- */}
      <div className="pdf-page break-before-page pt-12">
        <h3 className="font-headline-md text-2xl text-primary mb-8 border-b border-outline-variant/30 pb-4">What the area looks like</h3>
        
        <div className="grid grid-cols-2 gap-8 mb-12 print-avoid-break">
          {/* Charging Mix */}
          <div>
            <h4 className="font-label-sm text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-4">Charging Mix</h4>
            {relevantStations.length === 0 ? (
              <p className="font-body-md text-sm text-on-surface-variant italic">No data available.</p>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 font-label-sm text-xs font-bold text-on-surface-variant">AC</div>
                  <div className="flex-1 h-3 bg-surface-container overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(acCount / relevantStations.length) * 100}%` }}></div>
                  </div>
                  <div className="w-8 text-right font-body-md text-sm text-primary">{acCount}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 font-label-sm text-xs font-bold text-on-surface-variant">DC</div>
                  <div className="flex-1 h-3 bg-surface-container overflow-hidden">
                    <div className="h-full bg-secondary-container border border-primary/20" style={{ width: `${(dcCount / relevantStations.length) * 100}%` }}></div>
                  </div>
                  <div className="w-8 text-right font-body-md text-sm text-primary">{dcCount}</div>
                </div>
              </div>
            )}
          </div>

          {/* Operator Presence */}
          <div>
             <h4 className="font-label-sm text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-4">Operator Presence</h4>
             {topOperators.length === 0 ? (
                <p className="font-body-md text-sm text-on-surface-variant italic">No operator data available.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {topOperators.map(([op, count], i) => (
                    <div key={op} className="flex justify-between items-center border-b border-outline-variant/20 pb-2">
                      <span className="font-body-md text-sm text-primary">{op}</span>
                      <span className="font-label-sm text-xs text-on-surface-variant font-bold">{count}</span>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-12 print-avoid-break">
           <div>
             <h4 className="font-label-sm text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-4">Spatial Distribution</h4>
             <p className="font-body-md text-sm text-primary leading-relaxed">{factors.spatial.text}</p>
           </div>
           <div>
             <h4 className="font-label-sm text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-4">Operator Context</h4>
             <p className="font-body-md text-sm text-primary leading-relaxed">{factors.operator.text}</p>
           </div>
        </div>

      </div >

    {/* --- PAGE 3 --- */ }
    < div className = "pdf-page break-before-page pt-12" >
        <h3 className="font-headline-md text-2xl text-primary mb-8 border-b border-outline-variant/30 pb-4">What this means</h3>
        
        <div className="mb-12 print-avoid-break">
          <h4 className="font-label-sm text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-4">Location Insight</h4>
          <ul className="list-disc pl-5 font-body-md text-primary leading-relaxed space-y-3">
             {signal.evidence.map((item, idx) => (
               <li key={idx}><strong>{item.headline}:</strong> {item.text}</li>
             ))}
          </ul>
        </div>

  {
    alternatives && alternatives.length > 0 && (
      <div className="mb-12 print-avoid-break">
        <h4 className="font-label-sm text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-4">Areas Worth Investigating</h4>
        <div className="flex flex-col gap-4">
          {alternatives.slice(0, 3).map((alt, idx) => (
            <div key={idx} className="border border-outline-variant/30 p-4 rounded-xl flex justify-between items-center bg-surface">
              <div>
                <h5 className="font-headline-md text-lg text-primary m-0">{alt.name?.displayName || alt.name}</h5>
                <span className="font-body-md text-xs text-on-surface-variant">Alternative Candidate 0{idx + 1}</span>
              </div>
              <div className="text-right">
                <span className="font-headline-md text-lg text-primary block">{alt.distanceToOriginal.toFixed(1)} km</span>
                <span className="font-body-md text-xs text-on-surface-variant">away from site</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

      </div >

    {/* Footer across all printed pages is typically handled by browser, but we can add an explicit end note */ }
    < div className = "mt-12 pt-8 border-t border-outline-variant/30 print-avoid-break text-center" >
        <span className="font-headline-md text-xl text-primary block mb-2">Volterra</span>
        <span className="font-body-md text-sm text-primary italic mb-4 block">"Build where the opportunity is."</span>
        <p className="font-label-sm text-[9px] uppercase tracking-widest text-on-surface-variant max-w-2xl mx-auto">
          Analysis is based on mapped charging infrastructure available to Volterra at the time of analysis. 
          This report is a decision aid, not a guarantee of business success.
        </p>
      </div >

    </div >
  );
}
