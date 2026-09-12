import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStartupById } from '../../api/startups';
import {
  getStartupExecutionRisk,
  analyzeStartupExecutionRisk,
} from '../../api/execution';
import StartupHeader from '../../components/common/StartupHeader';
import {
  ShieldAlert,
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Brain,
  TrendingUp,
  Activity,
} from 'lucide-react';

const RISK_BADGES = {
  LOW: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60',
  MEDIUM: 'bg-amber-950/60 text-amber-400 border-amber-800/60',
  HIGH: 'bg-orange-950/60 text-orange-400 border-orange-800/60',
  CRITICAL: 'bg-red-950/60 text-red-400 border-red-800/60',
};

const RiskAnalysisPage = () => {
  const { startupId } = useParams();
  const [startup, setStartup] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const loadRisk = async () => {
    setLoading(true);
    setError('');
    try {
      const [sRes, rRes] = await Promise.all([
        getStartupById(startupId),
        getStartupExecutionRisk(startupId).catch(() => ({ data: null })),
      ]);
      setStartup(sRes.startup);
      setRiskData(rRes?.data || null);
      try {
        localStorage.setItem('sprintfounders_active_startup', startupId);
      } catch (e) {}
    } catch (err) {
      console.error('Failed to load risk analysis:', err);
      setError(err.message || 'Failed to load risk analysis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startupId) loadRisk();
  }, [startupId]);

  const handleAnalyze = async () => {
    if (analyzing) return;
    setAnalyzing(true);
    setError('');
    try {
      const res = await analyzeStartupExecutionRisk(startupId);
      if (res?.data) {
        setRiskData(res.data);
      }
    } catch (err) {
      console.error('Analyze risk error:', err);
      setError(err.message || 'Failed to analyze execution risks');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-[#0B0D12]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm text-slate-400 font-medium">Loading risk analytics...</p>
      </div>
    );
  }

  const overallRisk = riskData?.overallRisk || 'MEDIUM';
  const riskBadge = RISK_BADGES[overallRisk] || RISK_BADGES.MEDIUM;

  return (
    <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <StartupHeader
          startup={startup}
          toolName="Risk & Bottleneck Analysis"
          toolDescription="AI diagnostic identifying operational blockers, sprint vulnerabilities, and mitigation strategies."
          routePrefix="/risk-analysis"
          actionButton={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={analyzing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 shadow-lg shadow-indigo-600/20 transition"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing Risks...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{riskData ? 'Re-analyze with AI' : 'Run Risk Analysis'}</span>
                  </>
                )}
              </button>

              <Link
                to={`/execution/${startupId}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] hover:text-white transition"
              >
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                <span>Execution Score</span>
              </Link>
            </div>
          }
        />

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-center gap-2 text-xs text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {!riskData ? (
          <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-10 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-950/50 text-amber-400 border border-amber-800/40 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">No Risk Analysis Generated Yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Run an AI analysis on your active tasks, overdue items, and sprint workload to diagnose bottlenecks and prevent delivery delays.
            </p>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={analyzing}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition"
            >
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
              <span>Analyze Risks with AI</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overall Risk Card */}
            <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#232735] pb-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 tracking-wider">
                    Diagnostic Status
                  </span>
                  <h3 className="text-lg font-extrabold text-white mt-1">
                    Overall Venture Execution Risk
                  </h3>
                </div>
                <span
                  className={`text-xs font-black px-3.5 py-1.5 rounded-xl border uppercase tracking-wider ${riskBadge}`}
                >
                  {overallRisk} RISK
                </span>
              </div>

              {/* Primary Bottleneck */}
              {riskData.bottleneck && (
                <div className="p-4 rounded-xl bg-[#171A24] border border-amber-900/40 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Primary Operational Bottleneck</span>
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {riskData.bottleneck}
                  </p>
                </div>
              )}
            </div>

            {/* Risks & Recommendations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Identified Risks */}
              <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-950/50 text-rose-400 border border-rose-800/40 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Identified Risk Factors
                  </h4>
                </div>

                <div className="space-y-2.5">
                  {riskData.risks?.length > 0 ? (
                    riskData.risks.map((r, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-[#171A24] border border-[#2A2F42] text-xs text-slate-300 leading-relaxed"
                      >
                        {r}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic">No significant risks identified.</p>
                  )}
                </div>
              </div>

              {/* Actionable Recommendations */}
              <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-950/50 text-indigo-400 border border-indigo-800/40 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    AI Mitigation Recommendations
                  </h4>
                </div>

                <div className="space-y-2.5">
                  {riskData.recommendations?.length > 0 ? (
                    riskData.recommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-[#171A24] border border-[#2A2F42] text-xs text-slate-200 leading-relaxed flex items-start gap-2"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic">No active recommendations.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Positive Signals */}
            {riskData.positiveSignals?.length > 0 && (
              <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 shadow-xl space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-950/50 text-emerald-400 border border-emerald-800/40 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Execution Strengths & Positive Signals
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {riskData.positiveSignals.map((sig, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#171A24] border border-emerald-900/30 text-xs text-slate-200"
                    >
                      {sig}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RiskAnalysisPage;
