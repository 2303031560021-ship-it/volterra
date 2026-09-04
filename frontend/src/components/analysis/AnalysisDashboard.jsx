import { useState } from 'react';
import AlternativeAreas from './AlternativeAreas';
import { MapContainer, TileLayer, Circle, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

export default function AnalysisDashboard({ params, analysisResult, allStations, onEdit, onGetDashboard }) {
  const [showAlternatives, setShowAlternatives] = useState(false);

  const { candidate, parameters, factors, signal, relevantStations, nearbyCount } = analysisResult;

  if (showAlternatives) {
    return (
      <AlternativeAreas 
        params={parameters} 
        allStations={allStations} 
        onBack={() => setShowAlternatives(false)} 
        originalCandidate={candidate}
      />
    );
  }

  const typeLabel = parameters.focus === 'Any' ? 'chargers' : `${parameters.focus} chargers`;
  const singleTypeLabel = parameters.focus === 'Any' ? 'charger' : `${parameters.focus} charger`;

  return (
    <div className="max-w-[1440px] mx-auto animate-in fade-in duration-700">
      
      {/* A. HEADER */}
      <div className="flex justify-between items-start mb-12 pb-6 border-b border-outline-variant/20">
        <div>
          <span className="font-label-sm text-[11px] uppercase tracking-widest text-on-surface-variant font-bold block mb-1">Location Intelligence</span>
          <h1 className="font-headline-md text-2xl md:text-3xl text-primary">{candidate.name?.displayName || (typeof candidate.name === 'string' ? candidate.name : 'Selected Area')}</h1>
          <p className="font-body-md text-sm text-on-surface-variant mt-1">
            {parameters.focus} · {parameters.radius} km
          </p>
        </div>
        <button onClick={onEdit} className="text-sm font-bold text-primary underline underline-offset-4 hover:text-[#b5e05c] transition-colors mt-2">
          Edit
        </button>
      </div>

      {/* B. MAIN RESULT */}
      <div className="mb-16">
        <div className="bg-[#101A18] text-white rounded-[24px] md:rounded-[28px] p-8 md:p-10 shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <span className="font-label-sm text-[10px] uppercase tracking-widest text-[#C7F36B] font-bold mb-4 block">
              {signal.classification}
            </span>
            <h2 className="font-headline-md text-3xl md:text-4xl text-white/95 mb-8 leading-tight max-w-3xl">
              {signal.primarySentence}
            </h2>
            
            <div className="flex flex-wrap gap-4 mt-8">
              <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 flex flex-col">
                <span className="font-label-sm text-[10px] text-white/60 uppercase tracking-widest mb-1">01</span>
                <span className="font-body-md text-sm text-white font-medium">{nearbyCount} {nearbyCount === 1 ? singleTypeLabel : typeLabel}</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 flex flex-col">
                <span className="font-label-sm text-[10px] text-white/60 uppercase tracking-widest mb-1">02</span>
                <span className="font-body-md text-sm text-white font-medium">
                  {factors.access.nearestDistance !== null ? `${factors.access.nearestDistance.toFixed(1)} km nearest` : 'No similar charger found'}
                </span>
              </div>
            </div>
          </div>
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#C7F36B]/5 blur-[80px] rounded-full pointer-events-none"></div>
        </div>
      </div>

      {/* C. KEY EVIDENCE */}
      <div className="mb-16">
        <h3 className="font-label-sm text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-6">Why this result</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {signal.evidence && signal.evidence.slice(0, 3).map((item, idx) => (
            <div key={idx} className="bg-[#FAF9F6] p-6 rounded-2xl border border-outline-variant/20 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col h-full min-h-[180px] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all">
              <span className="font-label-sm text-xs bg-[#101A18] text-[#C7F36B] px-2 py-1 w-fit rounded font-bold mb-4">0{idx + 1}</span>
              <h4 className="font-headline-md text-xl text-[#101A18] mb-2">{item.headline}</h4>
              <p className="font-body-md text-sm text-[#4E5C56] leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* D. MAP */}
      <div className="mb-16">
        <div className="mb-4">
          <h3 className="font-headline-md text-xl text-primary">What's around this site?</h3>
          <p className="font-body-md text-sm text-on-surface-variant">Existing chargers within your selected radius.</p>
        </div>
        <div className="rounded-[24px] overflow-hidden border border-outline-variant/20 shadow-sm h-[460px] relative bg-surface-container">
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
          <div className="absolute bottom-4 right-4 z-10 bg-white/90 backdrop-blur-md px-3 py-2 rounded-lg border border-outline-variant/20 shadow-sm flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-[#101A18] rounded-full border border-white"></div>
              <span className="font-label-sm text-[10px] text-primary">Existing charger</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-[#C7F36B] rounded-full border border-[#101A18]"></div>
              <span className="font-label-sm text-[10px] text-primary">Your site</span>
            </div>
          </div>
        </div>
      </div>

      {/* E. WHAT THIS MEANS */}
      <div className="mb-12 bg-[#101A18] text-white p-8 md:p-10 rounded-[24px] relative overflow-hidden max-w-4xl">
        <div className="relative z-10">
          <span className="font-label-sm text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-3 block">What this means</span>
          <p className="font-headline-md text-xl md:text-2xl text-white/95">{signal.meaning}</p>
        </div>
      </div>

      {/* F. NEXT STEP */}
      <div className="mb-16 bg-[#e1f5e2] p-8 md:p-10 rounded-[24px] border border-[#C8E6C9] flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-4xl">
        <div>
          <span className="font-label-sm text-xs uppercase tracking-widest text-[#2E7D32] font-bold mb-3 block">Next Step</span>
          <p className="font-headline-md text-xl md:text-2xl text-[#1B5E20] max-w-lg">
            {signal.color === 'green' 
              ? "Continue evaluating this area."
              : signal.color === 'yellow'
              ? "Compare this area with other parts of Surat."
              : "Other parts of Surat may be more worth comparing."
            }
          </p>
        </div>
        <div className="flex flex-col sm:flex-row md:flex-col gap-3">
          <button 
            onClick={onGetDashboard}
            className="whitespace-nowrap bg-secondary-container text-primary px-8 py-4 rounded-xl font-label-sm text-sm font-bold hover:bg-[#b5e05c] transition-colors shadow-sm text-center"
          >
            Get Dashboard →
          </button>
          <button 
            onClick={() => signal.color === 'green' ? onEdit() : setShowAlternatives(true)}
            className="whitespace-nowrap bg-[#101A18] text-white px-8 py-4 rounded-xl font-label-sm text-sm font-bold hover:bg-[#101A18]/90 transition-colors shadow-sm text-center"
          >
            {signal.color === 'green' ? 'Continue evaluating →' : 'Find 3 other areas →'}
          </button>
        </div>
      </div>

      {/* G. MORE DETAILS */}
      <div className="mb-12">
        <details className="group border-t border-outline-variant/20">
          <summary className="font-label-sm text-sm uppercase font-bold text-primary cursor-pointer list-none flex justify-between items-center py-6">
            More Details
            <span className="material-symbols-outlined text-on-surface-variant group-open:rotate-180 transition-transform">expand_more</span>
          </summary>
          <div className="pb-8 pt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-5 border border-outline-variant/20 rounded-2xl bg-white/40 flex flex-col justify-center">
              <span className="font-label-sm text-[10px] uppercase text-on-surface-variant tracking-widest block mb-2">How chargers are spread out</span>
              <p className="font-body-md text-sm text-primary font-medium">
                {factors.spatial.text}
              </p>
            </div>
            <div className="p-5 border border-outline-variant/20 rounded-2xl bg-white/40 flex flex-col justify-center">
              <span className="font-label-sm text-[10px] uppercase text-on-surface-variant tracking-widest block mb-2">Operators</span>
              <p className="font-body-md text-sm text-primary font-medium">
                {factors.operator.text}
              </p>
            </div>
            <div className="p-5 border border-outline-variant/20 rounded-2xl bg-white/40 flex flex-col justify-center">
              <span className="font-label-sm text-[10px] uppercase text-on-surface-variant tracking-widest block mb-2">Power</span>
              <p className="font-body-md text-sm text-primary font-medium">
                {factors.power.text}
              </p>
            </div>
          </div>
        </details>
      </div>

      {/* H. METHODOLOGY */}
      <div className="border-t border-outline-variant/20 pt-8 pb-12">
        <details className="group">
          <summary className="font-label-sm text-xs uppercase font-bold text-on-surface-variant cursor-pointer list-none flex items-center gap-2">
            <span className="material-symbols-outlined text-sm group-open:rotate-90 transition-transform">chevron_right</span>
            How this analysis works
          </summary>
          <div className="mt-4 font-body-md text-xs text-on-surface-variant/80 max-w-3xl leading-relaxed">
            <p className="mb-2">We look at chargers already mapped around your site and check their distance, charging type, power, location and operator. This helps describe the existing charging network around the site.</p>
            <p>This does not predict traffic, customers, revenue or profit.</p>
          </div>
        </details>
      </div>

    </div>
  );
}

