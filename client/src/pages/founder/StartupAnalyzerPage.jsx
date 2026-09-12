import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStartupById } from '../../api/startups';
import { generateStartupAnalysis, getStartupAnalysis } from '../../api/ai';
import StartupHeader from '../../components/common/StartupHeader';
import AIAnalysisCard from '../../components/ai/AIAnalysisCard';
import { Loader2, Sparkles, Presentation } from 'lucide-react';

const StartupAnalyzerPage = () => {
  const { startupId } = useParams();
  const [startup, setStartup] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const sRes = await getStartupById(startupId);
      const s = sRes.startup;
      setStartup(s);
      try {
        localStorage.setItem('sprintfounders_active_startup', startupId);
      } catch (e) {}

      if (s?.aiAnalysis?.overallAssessment) {
        setAnalysis(s.aiAnalysis);
      } else {
        try {
          const aRes = await getStartupAnalysis(startupId);
          if (aRes?.data?.overallAssessment) {
            setAnalysis(aRes.data);
          }
        } catch (aErr) {
          // Expected if not analyzed yet
        }
      }
    } catch (err) {
      console.error('Failed to load startup analyzer data:', err);
      setError(err.message || 'Failed to load startup data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startupId) loadData();
  }, [startupId]);

  const handleAnalyze = async () => {
    if (analyzing) return;
    setAnalyzing(true);
    setError('');
    try {
      const res = await generateStartupAnalysis(startupId);
      if (res?.data) {
        setAnalysis(res.data);
      }
    } catch (err) {
      console.error('Analyze idea error:', err);
      setError(err.message || 'Failed to analyze startup idea');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-[#0B0D12]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm text-slate-400 font-medium">Loading AI startup analyzer...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <StartupHeader
          startup={startup}
          toolName="AI Startup Analyzer"
          toolDescription="Comprehensive market validation, problem strength assessment, feasibility, and risk analysis powered by Gemini."
          routePrefix="/ai-analyzer"
          actionButton={
            <Link
              to={`/pitch/${startupId}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition"
            >
              <Presentation className="w-3.5 h-3.5" />
              <span>Generate Pitch Deck</span>
            </Link>
          }
        />

        <AIAnalysisCard
          analysis={analysis}
          loading={analyzing}
          error={error}
          onAnalyze={handleAnalyze}
          canAnalyze={true}
        />
      </div>
    </div>
  );
};

export default StartupAnalyzerPage;
