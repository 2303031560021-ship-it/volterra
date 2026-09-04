import { useState, useEffect } from 'react';
import AnalysisInputPanel from '../components/analysis/AnalysisInputPanel';
import AnalysisDashboard from '../components/analysis/AnalysisDashboard';
import DecisionDashboard from '../components/analysis/DecisionDashboard';
import { analyzeCandidate } from '../services/analysisEngine';
import { fetchStations } from '../services/api';

export default function LocationAnalysis() {
  const [viewState, setViewState] = useState('INPUT'); // 'INPUT', 'ANALYZING', 'RESULT', 'DECISION_DASHBOARD'
  const [analysisState, setAnalysisState] = useState({
    candidate: null,
    radius: 5,
    focus: 'Any',
    minPower: 'Any'
  });
  
  const [analysisResult, setAnalysisResult] = useState(null);
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
      // Compute the analysis once, ensuring a single source of truth
      const result = analyzeCandidate(params.candidate, params, allStations);
      setAnalysisResult(result);
      setViewState('RESULT');
    }, 1500);
  };

  const handleEditAnalysis = () => {
    setViewState('INPUT');
  };

  const handleGetDashboard = () => {
    setViewState('DECISION_DASHBOARD');
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
      
      {viewState === 'RESULT' && analysisResult && (
        <AnalysisDashboard 
          params={analysisState} 
          analysisResult={analysisResult}
          allStations={allStations}
          onEdit={handleEditAnalysis}
          onGetDashboard={handleGetDashboard}
        />
      )}

      {viewState === 'DECISION_DASHBOARD' && analysisResult && (
        <DecisionDashboard 
          params={analysisState} 
          analysisResult={analysisResult}
          allStations={allStations}
          onBack={() => setViewState('RESULT')}
        />
      )}
    </div>
  );
}
