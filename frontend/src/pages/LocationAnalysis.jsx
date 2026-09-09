import { useState } from 'react';
import AnalysisInputPanel from '../components/analysis/AnalysisInputPanel';
import AnalysisDashboard from '../components/analysis/AnalysisDashboard';
import DecisionDashboard from '../components/analysis/DecisionDashboard';
import { analyzeLocation } from '../services/api';

export default function LocationAnalysis() {
  const [viewState, setViewState] = useState('INPUT'); // 'INPUT', 'ANALYZING', 'RESULT', 'DECISION_DASHBOARD'
  const [analysisState, setAnalysisState] = useState({
    candidate: null,
    radius: 5,
    focus: 'Any',
    minPower: 'Any'
  });
  
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  const handleAnalyze = async (params) => {
    setAnalysisState(params);
    setViewState('ANALYZING');
    setAnalysisError(null);
    
    try {
      const result = await analyzeLocation(params.candidate, params);
      setAnalysisResult(result);
      setViewState('RESULT');
    } catch (err) {
      console.error("Backend analysis failed:", err);
      setAnalysisError("Unable to analyze this location. Please ensure the backend service is running and try again.");
      setViewState('INPUT');
    }
  };

  const handleEditAnalysis = () => {
    setViewState('INPUT');
  };

  const handleGetDashboard = () => {
    setViewState('DECISION_DASHBOARD');
  };

  return (
    <div className="min-h-screen pb-20 pt-28">
      {analysisError && (
        <div className="max-w-[1440px] mx-auto px-container-padding mb-6">
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 px-6 py-4 rounded-2xl flex items-center justify-between">
            <span>{analysisError}</span>
            <button onClick={() => setAnalysisError(null)} className="font-bold underline ml-4">Dismiss</button>
          </div>
        </div>
      )}

      {viewState === 'INPUT' && (
        <AnalysisInputPanel 
          initialState={analysisState}
          onAnalyze={handleAnalyze} 
          isLoadingData={isLoadingData} 
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
            Evaluating existing charging infrastructure around candidate site against real India-wide data.
          </p>
        </div>
      )}
      
      {viewState === 'RESULT' && analysisResult && (
        <AnalysisDashboard 
          params={analysisState} 
          analysisResult={analysisResult}
          onEdit={handleEditAnalysis}
          onGetDashboard={handleGetDashboard}
        />
      )}

      {viewState === 'DECISION_DASHBOARD' && analysisResult && (
        <DecisionDashboard 
          params={analysisState} 
          analysisResult={analysisResult}
          onBack={() => setViewState('RESULT')}
        />
      )}
    </div>
  );
}
