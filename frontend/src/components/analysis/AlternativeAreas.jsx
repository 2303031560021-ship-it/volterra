import { useState, useEffect } from 'react';
import { findAlternativeAreas } from '../../services/candidateSearch';
import AnalysisDashboard from './AnalysisDashboard';
import { MapContainer, TileLayer, Circle, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

const candidateIcon = L.divIcon({
  html: `<div style="width: 16px; height: 16px; background-color: #C7F36B; border: 2px solid #101A18; border-radius: 50%; box-shadow: 0 2px 8px rgba(199,243,107,0.5);"></div>`,
  className: 'alt-marker',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const originalIcon = L.divIcon({
  html: `<div style="width: 12px; height: 12px; background-color: #101A18; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  className: 'orig-marker',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

export default function AlternativeAreas({ params, allStations, onBack, originalCandidate }) {
  const [isScanning, setIsScanning] = useState(true);
  const [topAreas, setTopAreas] = useState([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const scan = async () => {
      setIsScanning(true);
      const results = await findAlternativeAreas(params, allStations);
      if (isMounted) {
        setTopAreas(results);
        setIsScanning(false);
      }
    };
    scan();
    return () => { isMounted = false; };
  }, [params, allStations]);

  if (selectedAnalysis) {
    return (
      <div>
        <button onClick={() => setSelectedAnalysis(null)} className="mb-6 flex items-center gap-2 font-label-sm text-sm text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to Potential Areas
        </button>
        <AnalysisDashboard
          params={{ ...params, candidate: selectedAnalysis.candidate }}
          allStations={allStations}
          onEdit={onBack}
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto animate-in fade-in duration-700 pb-20">

      <button onClick={onBack} className="mb-8 flex items-center gap-2 font-label-sm text-sm text-on-surface-variant hover:text-primary transition-colors">
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        Back to current candidate
      </button>

      <div className="mb-12">
        <span className="font-label-sm text-[11px] uppercase tracking-widest text-on-surface-variant font-bold mb-2 block">Location Intelligence</span>
        <h1 className="font-headline-md text-3xl md:text-4xl text-primary tracking-tight">{topAreas.length} {topAreas.length === 1 ? 'area' : 'areas'} worth checking</h1>
        <p className="font-body-md text-on-surface-variant mt-3 max-w-2xl">
          Based on the same requirements you entered.
        </p>
      </div>

      {isScanning ? (
        <div className="h-[400px] flex flex-col items-center justify-center bg-surface-container rounded-[32px] border border-outline-variant/20">
          <div className="w-12 h-12 mb-6 relative">
            <div className="absolute inset-0 border-4 border-outline-variant/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin"></div>
          </div>
          <h2 className="font-headline-md text-xl text-primary">Scanning Surat...</h2>
        </div>
      ) : topAreas.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Top 3 Cards (Left Column, ~40%) */}
          <div className="col-span-1 lg:col-span-5 flex flex-col gap-4">
            {topAreas.map((area, idx) => (
              <div key={idx} className="bg-white/60 p-6 rounded-2xl border border-outline-variant/20 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#C7F36B]/5 blur-2xl rounded-full group-hover:bg-[#C7F36B]/15 transition-colors"></div>

                <div className="flex gap-4">
                  <span className="font-label-sm text-xs bg-primary text-[#C7F36B] px-2 py-1 h-fit rounded font-bold">0{idx + 1}</span>
                  <div>
                    <h3 className="font-headline-md text-lg text-primary mb-1">{area.candidate.name?.displayName || area.candidate.name}</h3>
                    <span className="font-label-sm text-[10px] font-bold text-primary uppercase tracking-widest mb-2 block">
                      {area.signal.headline}
                    </span>
                    <p className="font-body-md text-sm text-primary mb-2">
                      {area.factors.pressure.value} {area.factors.pressure.value === 1 ? (area.parameters.focus === 'Any' ? 'charger' : `${area.parameters.focus} charger`) : (area.parameters.focus === 'Any' ? 'chargers' : `${area.parameters.focus} chargers`)} nearby · {area.factors.access.nearestDistance ? `Nearest: ${area.factors.access.nearestDistance.toFixed(1)} km` : 'No similar charger found'}
                    </p>
                    <p className="font-body-md text-sm text-on-surface-variant mb-4">
                      {area.signal.explanation}
                    </p>
                    <button
                      onClick={() => setSelectedAnalysis(area)}
                      className="font-label-sm text-sm font-bold text-primary flex items-center gap-2 hover:text-[#b5e05c] transition-colors"
                    >
                      View Analysis →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Map (Right Column, ~60%, Sticky) */}
          <div className="col-span-1 lg:col-span-7 h-[500px] lg:h-[calc(100vh-140px)] lg:sticky lg:top-28 bg-surface-container rounded-[32px] overflow-hidden border border-outline-variant/20 relative">
            <MapContainer
              center={[21.1702, 72.8311]}
              zoom={11}
              style={{ height: '100%', width: '100%', zIndex: 1 }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                className="map-tiles-desaturated"
              />

              <Marker position={[originalCandidate.lat, originalCandidate.lng]} icon={originalIcon} />

              {topAreas.map((area, idx) => {
                const labelIcon = L.divIcon({
                  html: `<div style="width: 20px; height: 20px; background-color: #C7F36B; border: 2px solid #101A18; border-radius: 50%; box-shadow: 0 2px 8px rgba(199,243,107,0.5); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: #101A18;">0${idx + 1}</div>`,
                  className: 'numbered-marker',
                  iconSize: [20, 20],
                  iconAnchor: [10, 10],
                });
                return (
                  <div key={idx}>
                    <Circle
                      center={[area.candidate.lat, area.candidate.lng]}
                      radius={params.radius * 1000}
                      pathOptions={{
                        fillColor: '#C7F36B',
                        fillOpacity: 0.1,
                        color: '#C7F36B',
                        weight: 1,
                        dashArray: '4 6'
                      }}
                    />
                    <Marker position={[area.candidate.lat, area.candidate.lng]} icon={labelIcon} />
                  </div>
                )
              })}

              <MapCenterer areas={topAreas} originalCandidate={originalCandidate} />
            </MapContainer>

            <div className="absolute top-6 right-6 z-10 bg-white/80 backdrop-blur-md px-3 py-2 rounded-xl border border-outline-variant/20 shadow-sm flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-[#101A18] rounded-full border border-white"></div>
                <span className="font-label-sm text-[10px] font-bold text-primary">Your current site</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-[#C7F36B] rounded-full border border-[#101A18]"></div>
                <span className="font-label-sm text-[10px] font-bold text-primary">Areas to check</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-surface-container p-10 rounded-[32px] border border-outline-variant/20 max-w-2xl">
          <h3 className="font-headline-md text-2xl text-primary mb-4">Couldn't find enough different areas with the current data.</h3>
          <p className="font-body-md text-on-surface-variant">
            Try a larger radius or a different charging focus.
          </p>
        </div>
      )}
    </div>
  );
}

function MapCenterer({ areas, originalCandidate }) {
  const map = useMap();
  useEffect(() => {
    if (areas.length > 0 && originalCandidate) {
      const allPoints = areas.map(a => [a.candidate.lat, a.candidate.lng]);
      allPoints.push([originalCandidate.lat, originalCandidate.lng]);
      const bounds = L.latLngBounds(allPoints);
      map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
    }
  }, [areas, originalCandidate, map]);
  return null;
}
