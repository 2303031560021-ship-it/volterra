import { useState, useEffect } from 'react';
import AnalysisInputPanel from '../components/analysis/AnalysisInputPanel';
import AnalysisDashboard from '../components/analysis/AnalysisDashboard';
import { fetchStations } from '../services/api';

export default function LocationAnalysis() {
  const [viewState, setViewState] = useState('INPUT'); // 'INPUT', 'ANALYZING', 'DASHBOARD'
  const [analysisState, setAnalysisState] = useState({
    candidate: null,
    radius: 5,
    focus: 'Any',
    minPower: 'Any'
  });
  
  const [allStations, setAllStations] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // Load stations on mount
  useEffect(() => {
    async function loadData() {
      setIsLoadingData(true);
      try {
        const data = await fetchStations();
        setAllStations(data);
      } catch (err) {
        console.error("Failed to load stations for analysis", err);
      } finally {
        setIsLoadingData(false);
      }
    }
    loadData();
  }, []);

  const handleAnalyze = (params) => {
    setAnalysisState(params);
    setViewState('ANALYZING');
    
    // Simulate short transition for visual polish
    setTimeout(() => {
      setViewState('DASHBOARD');
    }, 1500);
  };

  const handleEditAnalysis = () => {
    setViewState('INPUT');
  };

  return (
    <div className="min-h-screen pb-20 pt-28">
      {viewState === 'INPUT' && (
        <AnalysisInputPanel 
          initialState={analysisState}
          onAnalyze={handleAnalyze} 
          isLoadingData={isLoadingData} 
          stations={allStations}
        />
      )}
      
      {viewState === 'ANALYZING' && (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-container-padding text-center animate-in fade-in duration-700">
          <div className="w-16 h-16 mb-8 relative">
            <div className="absolute inset-0 border-4 border-outline-variant/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin"></div>
          </div>
          <h2 className="font-headline-md text-2xl text-primary mb-2">Analyzing location...</h2>
          <p className="font-body-md text-on-surface-variant max-w-md mx-auto">
            Mapping nearby infrastructure and evaluating the charging landscape.
          </p>
        </div>
      )}
      
      {viewState === 'DASHBOARD' && (
        <AnalysisDashboard 
          params={analysisState} 
          allStations={allStations}
          onEdit={handleEditAnalysis}
        />
      )}
    </div>
  );
}
