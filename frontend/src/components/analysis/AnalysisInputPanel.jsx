import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom icons
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
  html: `<div style="width: 6px; height: 6px; background-color: #101A18; border-radius: 50%; opacity: 0.4;"></div>`,
  className: 'station-dot-marker',
  iconSize: [6, 6],
  iconAnchor: [3, 3],
});

const SURAT_CENTER = [21.1702, 72.8311];

export default function AnalysisInputPanel({ initialState, onAnalyze, isLoadingData, stations }) {
  const [candidate, setCandidate] = useState(initialState.candidate); 
  const [radius, setRadius] = useState(initialState.radius || 5);
  const [focus, setFocus] = useState(initialState.focus || 'Any');
  const [minPower, setMinPower] = useState(initialState.minPower || 'Any');
  const [searchQuery, setSearchQuery] = useState(initialState.candidate?.name || '');
  const [isSearching, setIsSearching] = useState(false);
  
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ', Surat')}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        setCandidate({
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          name: data[0].display_name.split(',')[0]
        });
      } else {
        alert("Couldn't locate that place. Try an area or landmark in Surat.");
      }
    } catch (err) {
      console.error(err);
      alert("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAnalyzeClick = () => {
    if (!candidate) return;
    onAnalyze({
      candidate,
      radius,
      focus,
      minPower
    });
  };

  const radiusOptions = [1, 2, 5, 10];
  const focusOptions = [
    { id: 'Any', label: 'Any', icon: 'electric_car' },
    { id: 'AC', label: 'AC', icon: 'power' },
    { id: 'DC', label: 'DC', icon: 'bolt' },
    { id: 'High-Power DC', label: 'High-Power DC', icon: 'electric_bolt' },
  ];
  const powerOptions = ['Any', '7', '22', '50', '60', '100'];

  return (
    <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
      
      {/* LEFT: Input Form */}
      <div className="col-span-1 lg:col-span-7 flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div>
          <span className="font-label-sm text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-3 block">Location Intelligence</span>
          <h1 className="font-headline-lg text-4xl lg:text-5xl text-primary tracking-tight">Where are you considering building?</h1>
          <p className="font-body-md text-on-surface-variant mt-4 max-w-xl text-lg">
            Analyze the charging infrastructure around a potential site before you commit to the area.
          </p>
        </div>

        <div className="space-y-10 bg-white/40 p-8 rounded-[32px] border border-outline-variant/20 shadow-sm">
          
          <div className="space-y-3">
            <div>
              <label className="font-label-sm font-bold text-primary text-sm">Candidate Location</label>
              <p className="text-xs text-on-surface-variant mt-1">Search for an area, address, or place in Surat.</p>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50">search</span>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="e.g. Adajan, VR Mall, Vesu"
                  className="w-full bg-surface-container pl-12 pr-4 py-4 rounded-xl text-primary font-body-md border-2 border-transparent focus:border-primary/20 focus:outline-none transition-all"
                />
              </div>
              <button 
                onClick={handleSearch}
                disabled={isSearching}
                className="bg-primary text-white px-6 rounded-xl font-label-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-70"
              >
                {isSearching ? '...' : 'Search'}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="font-label-sm font-bold text-primary text-sm">Analysis Radius</label>
              <p className="text-xs text-on-surface-variant mt-1">The area around your candidate site that will be analyzed.</p>
            </div>
            <div className="flex bg-surface-container p-1 rounded-xl w-fit">
              {radiusOptions.map(r => (
                <button
                  key={r}
                  onClick={() => setRadius(r)}
                  className={`px-6 py-2.5 rounded-lg font-label-sm text-sm font-bold transition-all ${radius === r ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant hover:text-primary'}`}
                >
                  {r} km
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="font-label-sm font-bold text-primary text-sm">What are you evaluating?</label>
              <p className="text-xs text-on-surface-variant mt-1">The selected charging focus changes the infrastructure analysis.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {focusOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setFocus(opt.id)}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${focus === opt.id ? 'border-[#C7F36B] bg-[#C7F36B]/10' : 'border-outline-variant/20 bg-surface-container hover:border-primary/20'}`}
                >
                  <span className={`material-symbols-outlined ${focus === opt.id ? 'text-primary' : 'text-on-surface-variant'}`}>{opt.icon}</span>
                  <span className={`font-label-sm text-xs font-bold ${focus === opt.id ? 'text-primary' : 'text-on-surface-variant'}`}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="font-label-sm font-bold text-primary text-sm">Minimum Power (Optional)</label>
              <p className="text-xs text-on-surface-variant mt-1">Only analyze stations with a known power rating at or above this threshold.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {powerOptions.map(p => (
                <button
                  key={p}
                  onClick={() => setMinPower(p)}
                  className={`px-4 py-2 rounded-full font-label-sm text-xs font-bold border transition-all ${minPower === p ? 'bg-primary border-primary text-white' : 'border-outline-variant/30 text-on-surface-variant hover:border-primary/30'}`}
                >
                  {p === 'Any' ? 'Any Power' : `${p} kW+`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button 
            onClick={handleAnalyzeClick}
            disabled={!candidate || isLoadingData}
            className="w-full lg:w-auto bg-secondary-container text-primary px-10 py-5 rounded-2xl font-label-sm text-base font-bold hover:bg-[#b5e05c] transition-colors flex items-center justify-center gap-3 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Analyze Location <span>→</span>
          </button>
        </div>

      </div>
      
      {/* RIGHT: Preview Map */}
      <div className="col-span-1 lg:col-span-5 relative animate-in fade-in slide-in-from-right-8 duration-700 delay-150 lg:sticky lg:top-[112px] lg:self-start lg:h-[calc(100vh-140px)] z-10">
        <div className="w-full h-[500px] lg:h-full rounded-[32px] overflow-hidden border border-outline-variant/20 shadow-sm bg-surface-container">
          <MapContainer 
            center={candidate ? [candidate.lat, candidate.lng] : SURAT_CENTER} 
            zoom={candidate ? 13 : 11} 
            style={{ height: '100%', width: '100%', zIndex: 1 }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              className="map-tiles-desaturated"
            />
            
            {stations && stations.map(st => (
              <Marker 
                key={st.id} 
                position={st.coordinates}
                icon={stationIcon}
                interactive={false}
              />
            ))}

            {candidate && (
              <>
                <Circle 
                  center={[candidate.lat, candidate.lng]}
                  radius={radius * 1000}
                  pathOptions={{
                    fillColor: '#C7F36B',
                    fillOpacity: 0.15,
                    color: '#C7F36B',
                    weight: 2,
                    opacity: 0.6,
                    dashArray: '4 6'
                  }}
                />
                <Marker position={[candidate.lat, candidate.lng]} icon={candidateIcon} />
              </>
            )}
            
            <MapCenterer candidate={candidate} />
          </MapContainer>
          
          {!candidate && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/50 backdrop-blur-[2px] pointer-events-none p-6 text-center">
              <span className="material-symbols-outlined text-4xl text-primary/30 mb-2">location_searching</span>
              <p className="font-body-md text-sm text-primary/60 font-medium">Search for a location to preview the analysis area.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MapCenterer({ candidate }) {
  const map = useMap();
  useEffect(() => {
    if (candidate) {
      map.flyTo([candidate.lat, candidate.lng], 13, { duration: 1.5 });
    }
  }, [candidate, map]);
  return null;
}
