import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ScrollReveal from '../components/ui/ScrollReveal';
import StationSearch from '../components/explore/StationSearch';
import StationFilters from '../components/explore/StationFilters';
import NetworkSummary from '../components/explore/NetworkSummary';
import ExploreMap from '../components/explore/ExploreMap';
import StationDetails from '../components/explore/StationDetails';
import { fetchStations } from '../services/api';
import { getRoute, calculateHaversineDistance } from '../services/routing';

export default function ExploreNetwork() {
  const [stations, setStations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedStation, setSelectedStation] = useState(null);

  // User Location State
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Routing State
  const [routeData, setRouteData] = useState(null);
  const [isRouting, setIsRouting] = useState(false);
  const [routeError, setRouteError] = useState(null);
  
  // Clear route and errors if user selects a different station
  useEffect(() => {
    setRouteData(null);
    setRouteError(null);
    setLocationError(null);
  }, [selectedStation?.id]);
  
  // Ref for the watcher if we want to implement live updates later (currently not actively watching to save battery, just locating once or on demand)
  const locationWatcherRef = useRef(null);

  useEffect(() => {
    return () => {
      if (locationWatcherRef.current !== null) {
        navigator.geolocation.clearWatch(locationWatcherRef.current);
      }
    };
  }, []);

  // Debounce search query slightly for API requests
  useEffect(() => {
    const timer = setTimeout(() => {
      loadStations();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activeFilter]);

  async function loadStations() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchStations({
        search: searchQuery,
        type: activeFilter
      });
      setStations(data);
    } catch (err) {
      setError("We couldn't load charging station data right now. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // Handle locating the user
  const requestLocation = () => {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        setLocationError("Location services are not supported by this browser.");
        reject(new Error("Not supported"));
        return;
      }

      setIsLocating(true);
      setLocationError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          setUserLocation(location);
          setIsLocating(false);
          resolve(location);
        },
        (err) => {
          setIsLocating(false);
          let errMsg = "Unable to determine your location. Please try again.";
          if (err.code === 1) {
            errMsg = "Location access was denied. Enable location permission in your browser to use this feature.";
          }
          setLocationError(errMsg);
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const handleLocateUser = () => {
    requestLocation().catch(() => {});
  };

  const handleRecenterUser = () => {
    // We already have user location, maybe just trigger a slight state update to force MapController to recenter
    if (userLocation) {
      setUserLocation({ ...userLocation }); 
    }
  };

  // Handle Route Calculation
  const handleGetDirections = async () => {
    setRouteError(null);
    let currentLoc = userLocation;
    
    if (!currentLoc) {
      try {
        currentLoc = await requestLocation();
      } catch (err) {
        return; // Error already handled in requestLocation and set in locationError
      }
    }

    if (!selectedStation) return;

    setIsRouting(true);
    
    try {
      const startCoords = [currentLoc.lat, currentLoc.lng];
      const endCoords = selectedStation.coordinates;

      const isValidLat = (lat) => lat >= -90 && lat <= 90;
      const isValidLng = (lng) => lng >= -180 && lng <= 180;

      if (!isValidLat(startCoords[0]) || !isValidLng(startCoords[1]) || 
          !isValidLat(endCoords[0]) || !isValidLng(endCoords[1])) {
        setRouteError("Invalid coordinates detected. Cannot calculate route.");
        setIsRouting(false);
        return;
      }
      
      const route = await getRoute(startCoords, endCoords);
      setRouteData(route);
    } catch (err) {
      setRouteError("Unable to calculate a route right now. Please try again.");
    } finally {
      setIsRouting(false);
    }
  };

  const handleClearRoute = () => {
    setRouteData(null);
  };

  // Calculate straight-line distance if location exists but no route yet
  let distanceFromUserKm = null;
  if (userLocation && selectedStation) {
    distanceFromUserKm = calculateHaversineDistance(
      [userLocation.lat, userLocation.lng],
      selectedStation.coordinates
    );
  }

  return (
    <main className="min-h-screen bg-surface flex flex-col">
      <Navbar />

      <div className="flex-1 pt-32 pb-16 px-container-padding max-w-[1600px] w-full mx-auto flex flex-col gap-8 relative z-10">
        
        {/* Page Introduction */}
        <ScrollReveal delay={0}>
          <div className="max-w-2xl mb-4">
            <h1 className="font-headline-lg text-4xl md:text-5xl text-primary tracking-tight mb-4">
              Explore the charging network.
            </h1>
            <p className="font-body-xl text-on-surface-variant leading-relaxed">
              Explore existing EV charging infrastructure and understand what's already available across different locations.
            </p>
          </div>
        </ScrollReveal>

        {/* Location Error Notice */}
        {locationError && (
          <ScrollReveal>
            <div className="bg-error-container/50 border border-error/20 text-error px-4 py-3 rounded-xl font-body-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">warning</span>
                {locationError}
              </div>
              <button onClick={() => setLocationError(null)} className="hover:bg-error/10 p-1 rounded-full">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          </ScrollReveal>
        )}

        {/* Controls */}
        <ScrollReveal delay={100} className="flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="flex-1 w-full max-w-md">
            <StationSearch value={searchQuery} onChange={setSearchQuery} />
          </div>
          <div className="w-full md:w-auto">
            <StationFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />
          </div>
        </ScrollReveal>

        {/* Network Summary */}
        {!isLoading && !error && stations.length > 0 && (
          <ScrollReveal delay={200}>
            <NetworkSummary stations={stations} />
          </ScrollReveal>
        )}

        {/* Loading / Error / Empty States */}
        {isLoading && (
          <div className="w-full h-[60vh] flex items-center justify-center bg-white/40 rounded-[32px] border border-outline-variant/10">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-secondary-container border-t-primary rounded-full animate-spin"></div>
              <span className="font-label-sm text-on-surface-variant uppercase tracking-wider">Loading network data...</span>
            </div>
          </div>
        )}
        
        {!isLoading && error && (
          <div className="w-full h-[60vh] flex items-center justify-center bg-white/40 rounded-[32px] border border-outline-variant/10">
            <div className="text-center">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">error</span>
              <p className="font-body-md text-on-surface-variant">{error}</p>
            </div>
          </div>
        )}

        {!isLoading && !error && stations.length === 0 && (
          <div className="w-full h-[60vh] flex items-center justify-center bg-white/40 rounded-[32px] border border-outline-variant/10">
            <div className="text-center">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">location_off</span>
              <p className="font-body-md text-on-surface-variant text-lg">No charging stations found in this area.</p>
            </div>
          </div>
        )}

        {/* Main Map Experience */}
        {!isLoading && !error && stations.length > 0 && (
          <ScrollReveal delay={300} className="w-full h-[65vh] min-h-[600px] flex flex-col lg:flex-row gap-6 relative">
            <div className="flex-1 h-full relative transition-all duration-500 ease-out">
              <ExploreMap 
                stations={stations} 
                selectedStationId={selectedStation?.id} 
                onStationSelect={setSelectedStation} 
                userLocation={userLocation}
                isLocating={isLocating}
                onLocateUser={handleLocateUser}
                onRecenterUser={handleRecenterUser}
                routeCoordinates={routeData?.coordinates}
              />
            </div>
            
            {selectedStation && (
              <div className="w-full lg:w-[400px] lg:h-full transition-all duration-500 ease-out shrink-0 animate-in fade-in slide-in-from-right-8">
                <StationDetails 
                  station={selectedStation} 
                  onClose={() => setSelectedStation(null)} 
                  distanceFromUserKm={distanceFromUserKm}
                  routeData={routeData}
                  isRouting={isRouting}
                  isLocating={isLocating}
                  locationError={locationError}
                  routeError={routeError}
                  onGetDirections={handleGetDirections}
                  onClearRoute={handleClearRoute}
                />
              </div>
            )}
          </ScrollReveal>
        )}

        {/* Location Analysis CTA */}
        <ScrollReveal delay={400} className="mt-16 text-center">
          <div className="inline-flex flex-col items-center gap-4 bg-white/50 px-10 py-8 rounded-[40px] border border-outline-variant/10 shadow-sm">
            <h3 className="font-headline-md text-2xl text-primary">Planning a new charging station?</h3>
            <Link to="/analysis" className="group bg-primary text-on-primary px-8 py-4 rounded-full font-label-sm text-sm hover:opacity-90 transition-all flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-primary/20">
              Start Location Analysis 
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </ScrollReveal>
        
      </div>

    </main>
  );
}
