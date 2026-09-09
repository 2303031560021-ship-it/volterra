import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ScrollReveal from '../components/ui/ScrollReveal';
import StationSearch from '../components/explore/StationSearch';
import StationFilters from '../components/explore/StationFilters';
import NetworkSummary from '../components/explore/NetworkSummary';
import ExploreMap from '../components/explore/ExploreMap';
import StationDetails from '../components/explore/StationDetails';
import { fetchStationsWithMeta, fetchNetworkSummary } from '../services/api';
import { getRoute, calculateHaversineDistance } from '../services/routing';

export default function ExploreNetwork() {
  const [stations, setStations] = useState([]);
  const [networkSummary, setNetworkSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchBounds, setSearchBounds] = useState(null);
  const [searchPositionKey, setSearchPositionKey] = useState(0);
  const [searchFeedback, setSearchFeedback] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedStation, setSelectedStation] = useState(null);

  // Viewport tracking for dynamic bounding-box queries
  const [viewportBounds, setViewportBounds] = useState(null);
  const [viewportZoom, setViewportZoom] = useState(5);

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

  const locationWatcherRef = useRef(null);

  useEffect(() => {
    return () => {
      if (locationWatcherRef.current !== null) {
        navigator.geolocation.clearWatch(locationWatcherRef.current);
      }
    };
  }, []);

  // Load network summary once on mount
  useEffect(() => {
    fetchNetworkSummary()
      .then(setNetworkSummary)
      .catch(err => console.error("Failed to load network summary", err));
  }, []);

  // Query stations with viewport bounds or hierarchical location search
  const loadStations = useCallback(async (bounds = null, customSearch = null, positionSearch = false) => {
    setIsLoading(true);
    setError(null);
    const queryToUse = customSearch !== null ? customSearch : searchQuery;
    try {
      const data = await fetchStationsWithMeta({
        search: queryToUse,
        type: activeFilter,
        bounds: bounds,
        limit: 1500
      });

      const returnedStations = data.stations || [];
      setStations(returnedStations);

      if (data.bounds) {
        setSearchBounds(data.bounds);
      } else {
        setSearchBounds(null);
      }

      if (data.selected_station) {
        setSelectedStation(data.selected_station);
      }

      if (queryToUse && queryToUse.trim() && returnedStations.length === 0) {
        setSearchFeedback(data.message || "No EV stations found for this location.");
      } else {
        setSearchFeedback(null);
      }

      if (positionSearch) {
        setSearchPositionKey((current) => current + 1);
      }
    } catch (err) {
      setError("We couldn't load charging station data right now. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, activeFilter]);

  // Debounce API requests on search, filter, or viewport changes
  useEffect(() => {
    const timer = setTimeout(() => {
      // Use bounding box only when zoomed in (zoom >= 7) and not searching a specific term
      const boundsToUse = (viewportZoom >= 7 && !searchQuery.trim()) ? viewportBounds : null;
      loadStations(boundsToUse);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, activeFilter, viewportBounds, viewportZoom, loadStations]);

  const handleSelectSuggestion = useCallback((item) => {
    setSearchQuery(item.value);
    setSearchFeedback(null);
    loadStations(null, item.value, true);
  }, [loadStations]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchBounds(null);
    setSearchFeedback(null);
    setSelectedStation(null);
    loadStations(null, '');
  }, [loadStations]);

  const handleSearchSubmit = useCallback((val) => {
    const query = val !== undefined ? val : searchQuery;
    if (val !== undefined) setSearchQuery(val);
    loadStations(null, query, true);
  }, [searchQuery, loadStations]);

  const handleViewportChange = useCallback(({ bounds, zoom }) => {
    setViewportBounds(bounds);
    setViewportZoom(zoom);
  }, []);

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
    requestLocation().catch(() => { });
  };

  const handleRecenterUser = () => {
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
        return;
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
              Explore 28,969 public EV charging stations across all 35 Indian States and Union Territories.
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
        <ScrollReveal delay={100} className="relative z-30 flex flex-col md:flex-row items-start md:items-center gap-6 justify-between">
          <div className="flex-1 w-full max-w-lg relative z-30">
            <StationSearch
              value={searchQuery}
              onChange={setSearchQuery}
              onSelectSuggestion={handleSelectSuggestion}
              onClear={handleClearSearch}
              onSearchSubmit={handleSearchSubmit}
            />
          </div>
          <div className="w-full md:w-auto">
            <StationFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />
          </div>
        </ScrollReveal>

        {/* Network Summary */}
        <ScrollReveal delay={200} className="relative z-10">
          <NetworkSummary stations={stations} summary={networkSummary} />
        </ScrollReveal>

        {/* Search Feedback / No Results Alert */}
        {searchFeedback && (
          <ScrollReveal>
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 px-5 py-3.5 rounded-2xl font-body-md flex items-center justify-between shadow-sm animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">info</span>
                <span className="text-[14px] font-medium">{searchFeedback}</span>
              </div>
              <button
                onClick={handleClearSearch}
                className="text-xs font-semibold uppercase tracking-wider underline hover:opacity-80 transition-opacity ml-4"
              >
                Clear Search
              </button>
            </div>
          </ScrollReveal>
        )}

        {/* Error Notice */}
        {error && (
          <ScrollReveal>
            <div className="bg-error-container/50 border border-error/20 text-error px-4 py-3 rounded-xl font-body-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">error</span>
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)} className="hover:bg-error/10 p-1 rounded-full">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          </ScrollReveal>
        )}

        {/* Main Map Experience */}
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
              searchQuery={searchQuery}
              searchBounds={searchBounds}
              searchPositionKey={searchPositionKey}
              onViewportChange={handleViewportChange}
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
