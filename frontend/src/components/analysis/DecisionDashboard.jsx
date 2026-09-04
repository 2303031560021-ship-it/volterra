import React, { useState } from 'react';
import { MapContainer, TileLayer, Circle, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import AnalysisPdfReport from './AnalysisPdfReport';

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

export default function DecisionDashboard({ analysisResult, params, allStations, onBack }) {
  const { candidate, parameters, factors, signal, relevantStations, nearbyCount, alternatives } = analysisResult;
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);

  const handlePrint = () => {
    setIsPreparingPdf(true);
    // Give DOM time to update if needed, then print
    setTimeout(() => {
      window.print();
      setIsPreparingPdf(false);
    }, 500);
  };

  const locName = candidate.name?.displayName || (typeof candidate.name === 'string' ? candidate.name : 'Selected Area');
  const typeLabel = parameters.focus === 'Any' ? 'chargers' : `${parameters.focus} chargers`;

  // Calculate analytics
  const acCount = relevantStations.filter(s => s.ac_dc === 'AC' || s.connector_type?.toLowerCase().includes('ac')).length;
  const dcCount = relevantStations.filter(s => s.ac_dc === 'DC' || s.connector_type?.toLowerCase().includes('dc')).length;
  
  // Group by operators
  const operatorCounts = relevantStations.reduce((acc, st) => {
    const op = st.operator || 'Unknown';
    acc[op] = (acc[op] || 0) + 1;
    return acc;
  }, {});
  const topOperators = Object.entries(operatorCounts).sort((a,b) => b[1] - a[1]).slice(0, 4);

  return (
    <div className="max-w-[1440px] mx-auto animate-in fade-in duration-700">
      {/* PDF REPORT (Visible only during print) */}
      <AnalysisPdfReport analysisResult={analysisResult} />

      {/* INTERACTIVE DASHBOARD (Hidden during print) */}
      <div className="print:hidden">
        
        {/* A. HEADER */}
        <div className="flex justify-between items-start mb-12 pb-6 border-b border-outline-variant/20">
          <div>
            <span className="font-label-sm text-[11px] uppercase tracking-widest text-on-surface-variant font-bold block mb-1">Decision Intelligence Dashboard</span>
            <h1 className="font-headline-md text-2xl md:text-3xl text-primary">{locName}</h1>
            <p className="font-body-md text-sm text-on-surface-variant mt-1">
              {parameters.focus} · {parameters.radius} km
            </p>
          </div>
          <button onClick={onBack} className="text-sm font-bold text-primary underline underline-offset-4 hover:text-[#b5e05c] transition-colors mt-2">
            ← Back to Result
          </button>
        </div>

        {/* B. EXPORT ACTIONS */}
        <div className="mb-12 bg-surface-container rounded-3xl p-6 flex flex-wrap gap-4 items-center justify-between border border-outline-variant/20">
          <div>
            <h3 className="font-label-sm text-xs uppercase tracking-widest text-primary font-bold mb-1">Export Options</h3>
            <p className="font-body-md text-sm text-on-surface-variant">Generate a report or connect data.</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={handlePrint}
              disabled={isPreparingPdf}
              className="bg-primary text-white font-label-sm text-sm font-bold px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
              {isPreparingPdf ? 'Preparing PDF...' : 'Download PDF'}
            </button>
            <button 
              disabled
              className="bg-white text-outline font-label-sm text-sm font-bold px-6 py-3 rounded-xl border border-outline-variant/30 flex items-center gap-2 opacity-60 cursor-not-allowed"
              title="Coming soon"
            >
              <span className="material-symbols-outlined text-[18px]">bar_chart</span>
              Power BI
              <span className="text-[10px] bg-surface-dim px-2 py-0.5 rounded-full ml-1">Soon</span>
            </button>
            <button 
              disabled
              className="bg-white text-outline font-label-sm text-sm font-bold px-6 py-3 rounded-xl border border-outline-variant/30 flex items-center gap-2 opacity-60 cursor-not-allowed"
              title="Coming soon"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Export Data
              <span className="text-[10px] bg-surface-dim px-2 py-0.5 rounded-full ml-1">Soon</span>
            </button>
          </div>
        </div>

        {/* C. MAIN CONCLUSION & EVIDENCE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Main Conclusion */}
          <div className="lg:col-span-2 bg-[#101A18] text-white rounded-[32px] p-8 md:p-10 relative overflow-hidden shadow-lg flex flex-col justify-center">
            <div className="relative z-10">
              <span className="font-label-sm text-[10px] uppercase tracking-widest text-[#C7F36B] font-bold mb-4 block">
                {signal.classification}
              </span>
              <h2 className="font-headline-md text-2xl md:text-3xl text-white/95 mb-6 leading-tight max-w-2xl">
                {signal.primarySentence}
              </h2>
              <p className="font-body-md text-white/80 max-w-xl leading-relaxed">
                {signal.meaning}
              </p>
            </div>
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-[#C7F36B]/5 blur-[60px] rounded-full pointer-events-none"></div>
          </div>
          
          {/* Key Evidence */}
          <div className="bg-[#FAF9F6] rounded-[32px] p-8 border border-outline-variant/20 flex flex-col justify-center gap-6">
            <h3 className="font-label-sm text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-2">Key Evidence</h3>
            
            <div className="flex justify-between items-center border-b border-outline-variant/20 pb-4">
              <span className="font-body-md text-on-surface-variant text-sm">Nearby chargers</span>
              <span className="font-headline-md text-primary">{nearbyCount}</span>
            </div>
            
            <div className="flex justify-between items-center border-b border-outline-variant/20 pb-4">
              <span className="font-body-md text-on-surface-variant text-sm">Nearest relevant</span>
              <span className="font-headline-md text-primary">
                {factors.access.nearestDistance !== null ? `${factors.access.nearestDistance.toFixed(1)} km` : 'N/A'}
              </span>
            </div>
            
            <div className="flex justify-between items-center pb-2">
              <span className="font-body-md text-on-surface-variant text-sm">Focus area</span>
              <span className="font-label-sm text-xs uppercase tracking-widest bg-secondary-container text-primary px-3 py-1 rounded-full font-bold">
                {parameters.focus}
              </span>
            </div>
          </div>
        </div>

        {/* D. MAP */}
        <div className="mb-16">
          <h3 className="font-label-sm text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-4">Area Context</h3>
          <div className="rounded-[32px] overflow-hidden border border-outline-variant/20 shadow-sm h-[400px] relative bg-surface-container">
            <MapContainer 
              center={[candidate.lat, candidate.lng]} 
              zoom={13} 
              style={{ height: '100%', width: '100%', zIndex: 1 }}
              zoomControl={false}
              scrollWheelZoom={false}
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

        {/* E. ANALYTICAL BREAKDOWNS */}
        <div className="mb-16">
          <h3 className="font-label-sm text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-6">Network Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Mix */}
            <div className="bg-white p-8 rounded-3xl border border-outline-variant/20 shadow-sm">
              <h4 className="font-headline-md text-lg text-primary mb-6">Charging Mix</h4>
              {relevantStations.length === 0 ? (
                <p className="font-body-md text-sm text-on-surface-variant italic">No data available.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 text-right font-label-sm text-xs font-bold text-on-surface-variant">AC</div>
                    <div className="flex-1 h-3 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${(acCount / relevantStations.length) * 100}%` }}></div>
                    </div>
                    <div className="w-8 font-body-md text-sm text-primary">{acCount}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 text-right font-label-sm text-xs font-bold text-on-surface-variant">DC</div>
                    <div className="flex-1 h-3 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-secondary-container" style={{ width: `${(dcCount / relevantStations.length) * 100}%` }}></div>
                    </div>
                    <div className="w-8 font-body-md text-sm text-primary">{dcCount}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Operator */}
            <div className="bg-white p-8 rounded-3xl border border-outline-variant/20 shadow-sm">
              <h4 className="font-headline-md text-lg text-primary mb-6">Top Operators</h4>
              {topOperators.length === 0 ? (
                <p className="font-body-md text-sm text-on-surface-variant italic">No operator data available.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {topOperators.map(([op, count], i) => (
                    <div key={op} className="flex justify-between items-center border-b border-outline-variant/10 pb-2 last:border-0 last:pb-0">
                      <span className="font-body-md text-sm text-on-surface-variant truncate max-w-[140px]" title={op}>{op}</span>
                      <span className="font-label-sm text-xs bg-surface-container text-primary px-2 py-1 rounded font-bold">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Power Insight */}
            <div className="bg-white p-8 rounded-3xl border border-outline-variant/20 shadow-sm">
              <h4 className="font-headline-md text-lg text-primary mb-4">Power Availability</h4>
              <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                {factors.power.text}
              </p>
            </div>
          </div>
        </div>

        {/* F. POTENTIAL AREAS */}
        {alternatives && alternatives.length > 0 && (
          <div className="mb-16">
            <h3 className="font-label-sm text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-6">Areas worth investigating</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {alternatives.slice(0, 3).map((alt, idx) => (
                <div key={idx} className="bg-white p-6 rounded-2xl border border-outline-variant/20 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="font-label-sm text-[10px] text-outline uppercase tracking-widest font-bold mb-2 block">Alternative 0{idx + 1}</span>
                    <h4 className="font-headline-md text-lg text-primary mb-2 line-clamp-2">{alt.name?.displayName || alt.name}</h4>
                    <p className="font-body-md text-sm text-on-surface-variant">
                      {alt.distanceToOriginal.toFixed(1)} km away from your selected site.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
