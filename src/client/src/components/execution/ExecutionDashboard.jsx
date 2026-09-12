import React, { useState, useEffect } from 'react';
import {
  getStartupExecutionScore,
  getStartupExecutionRisk,
  analyzeStartupExecutionRisk,
} from '../../api/execution';
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock,
  Gauge,
  HelpCircle,
  Loader2,
  RefreshCw,
  Shield,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';

const GRADE_CONFIG = {
  EXCELLENT: {
    label: 'Excellent',
    color: 'text-emerald-400',
    badge: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60',
    barColor: 'from-emerald-500 to-teal-400',
    description: 'High velocity, clean task execution, minimal blockers',
  },
  GOOD: {
    label: 'Good',
    color: 'text-indigo-400',
    badge: 'bg-indigo-950/60 text-indigo-400 border-indigo-800/60',
    barColor: 'from-indigo-500 to-cyan-400',
    description: 'Steady sprint momentum with manageable task backlogs',
  },
  NEEDS_ATTENTION: {
    label: 'Needs Attention',
    color: 'text-amber-400',
    badge: 'bg-amber-950/60 text-amber-400 border-amber-800/60',
    barColor: 'from-amber-500 to-yellow-400',
    description: 'Approaching deadlines or minor blocker friction',
  },
  AT_RISK: {
    label: 'At Risk',
    color: 'text-orange-400',
    badge: 'bg-orange-950/60 text-orange-400 border-orange-800/60',
    barColor: 'from-orange-500 to-amber-500',
    description: 'Overdue critical deliverables or uneven team distribution',
  },
  CRITICAL: {
    label: 'Critical',
    color: 'text-red-400',
    badge: 'bg-red-950/60 text-red-400 border-red-800/60',
    barColor: 'from-red-600 to-rose-500',
    description: 'Multiple blocked dependencies or breached sprint deadlines',
  },
};

const RISK_BADGES = {
  LOW: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60',
  MEDIUM: 'bg-amber-950/60 text-amber-400 border-amber-800/60',
  HIGH: 'bg-orange-950/60 text-orange-400 border-orange-800/60',
  CRITICAL: 'bg-red-950/60 text-red-400 border-red-800/60',
};

const ExecutionDashboard = ({ startupId, isFounder = false }) => {
  const [scoreData, setScoreData] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [loadingScore, setLoadingScore] = useState(true);
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [riskError, setRiskError] = useState('');

  // Fetch execution score
  const fetchScore = async () => {
    setLoadingScore(true);
    setError('');
    try {
      const res = await getStartupExecutionScore(startupId);
      if (res?.success) {
        setScoreData(res);
      }
    } catch (err) {
      setError(err.message || 'Failed to load execution score');
    } finally {
      setLoadingScore(false);
    }
  };

  // Fetch existing execution risk analysis (if previously run)
  const fetchRisk = async () => {
    setLoadingRisk(true);
    setRiskError('');
    try {
      const res = await getStartupExecutionRisk(startupId);
      if (res?.data) {
        setRiskData(res.data);
      }
    } catch (err) {
      // 404 is expected if analysis not yet generated
      if (err.status !== 404) {
        setRiskError(err.message || 'Unable to retrieve risk analysis');
      }
    } finally {
      setLoadingRisk(false);
    }
  };

  useEffect(() => {
    if (startupId) {
      fetchScore();
      fetchRisk();
    }
  }, [startupId]);

  // Handle AI Risk Analysis Trigger
  const handleAnalyzeRisk = async () => {
    if (!isFounder || analyzing) return;
    setAnalyzing(true);
    setRiskError('');
    try {
      const res = await analyzeStartupExecutionRisk(startupId);
      if (res?.data) {
        setRiskData(res.data);
      }
    } catch (err) {
      setRiskError(err.message || 'Failed to analyze execution risks');
    } finally {
      setAnalyzing(false);
    }
  };

  const gradeInfo =
    (scoreData?.grade && GRADE_CONFIG[scoreData.grade]) || GRADE_CONFIG.GOOD;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-[#11141C] p-6 sm:p-7 rounded-2xl border border-[#232735] shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center text-indigo-400">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Execution Intelligence
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-indigo-950/70 text-indigo-400 border border-indigo-800/50">
                  Deterministic
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Real-time delivery score calculated deterministically from active tasks & sprint data
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={fetchScore}
              disabled={loadingScore}
              className="p-2.5 rounded-xl border border-[#2A2F42] bg-[#171A24] text-slate-300 hover:bg-[#1E2330] hover:text-white transition disabled:opacity-50"
              title="Refresh Execution Score"
            >
              <RefreshCw className={`w-4 h-4 ${loadingScore ? 'animate-spin' : ''}`} />
            </button>

            {isFounder && (
              <button
                onClick={handleAnalyzeRisk}
                disabled={analyzing || loadingScore}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition disabled:opacity-50"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing execution risks...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4" />
                    <span>{riskData ? 'Re-Analyze Risks' : 'Analyze Execution Risks'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-950/40 border border-red-800/50 flex items-center justify-between text-xs text-red-400">
            <span>{error}</span>
            <button onClick={fetchScore} className="underline font-semibold hover:no-underline">
              Retry
            </button>
          </div>
        )}

        {/* Main Score Display */}
        {loadingScore ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <Loader2 className="w-7 h-7 text-indigo-500 animate-spin mb-3" />
            <p className="text-xs text-slate-400">Computing execution score from task data...</p>
          </div>
        ) : scoreData ? (
          <div className="mt-6 space-y-6">
            {/* Overall Score Banner */}
            <div className="p-6 rounded-2xl bg-[#171A24] border border-[#2A2F42] flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                {/* Score Number Badge */}
                <div className="relative flex items-center justify-center">
                  <div className="w-20 h-20 rounded-2xl bg-[#0B0D12] border border-[#2A2F42] flex flex-col items-center justify-center">
                    <span className={`text-3xl font-black ${gradeInfo.color}`}>
                      {scoreData.score}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-500">
                      / 100
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${gradeInfo.badge}`}
                    >
                      {gradeInfo.label}
                    </span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-400 font-medium">
                      Overall Execution Health
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 font-medium max-w-xl leading-relaxed">
                    {scoreData.summary}
                  </p>
                </div>
              </div>

              {/* Task Quick Stats */}
              {scoreData.metadata && (
                <div className="flex items-center gap-4 text-xs text-slate-400 border-t md:border-t-0 md:border-l border-[#2A2F42] pt-4 md:pt-0 md:pl-6">
                  <div>
                    <div className="text-[11px] text-slate-500 uppercase font-semibold">Tasks</div>
                    <div className="text-sm font-bold text-white">
                      {scoreData.metadata.completedTasks} / {scoreData.metadata.totalTasks} Done
                    </div>
                  </div>
                  {scoreData.metadata.overdueTasks > 0 && (
                    <div>
                      <div className="text-[11px] text-red-400 uppercase font-semibold">Overdue</div>
                      <div className="text-sm font-bold text-red-400">
                        {scoreData.metadata.overdueTasks}
                      </div>
                    </div>
                  )}
                  {scoreData.metadata.blockedTasks > 0 && (
                    <div>
                      <div className="text-[11px] text-amber-400 uppercase font-semibold">Blocked</div>
                      <div className="text-sm font-bold text-amber-400">
                        {scoreData.metadata.blockedTasks}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 5 Component Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* 1. Task Completion (40%) */}
              <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Task Completion</span>
                  <span className="font-bold text-indigo-400">
                    {scoreData.components?.taskCompletion?.score} / 40
                  </span>
                </div>
                <div className="w-full bg-[#0B0D12] rounded-full h-2 overflow-hidden border border-[#232735]">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, scoreData.components?.taskCompletion?.percentage || 0)}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Weight: 40%</span>
                  <span>{scoreData.components?.taskCompletion?.percentage || 0}% rate</span>
                </div>
              </div>

              {/* 2. Deadline Adherence (25%) */}
              <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Deadline Adherence</span>
                  <span className="font-bold text-cyan-400">
                    {scoreData.components?.deadlineAdherence?.score} / 25
                  </span>
                </div>
                <div className="w-full bg-[#0B0D12] rounded-full h-2 overflow-hidden border border-[#232735]">
                  <div
                    className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, scoreData.components?.deadlineAdherence?.percentage || 0)}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Weight: 25%</span>
                  <span>{scoreData.components?.deadlineAdherence?.percentage || 0}% on-time</span>
                </div>
              </div>

              {/* 3. Workload Distribution (15%) */}
              <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Workload</span>
                  <span className="font-bold text-emerald-400">
                    {scoreData.components?.workload?.score} / 15
                  </span>
                </div>
                <div className="w-full bg-[#0B0D12] rounded-full h-2 overflow-hidden border border-[#232735]">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, scoreData.components?.workload?.percentage || 0)}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Weight: 15%</span>
                  <span>{scoreData.components?.workload?.percentage || 0}% balance</span>
                </div>
              </div>

              {/* 4. Risk Health (10%) */}
              <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Risk Factor</span>
                  <span className="font-bold text-amber-400">
                    {scoreData.components?.risk?.score} / 10
                  </span>
                </div>
                <div className="w-full bg-[#0B0D12] rounded-full h-2 overflow-hidden border border-[#232735]">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, scoreData.components?.risk?.percentage || 0)}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Weight: 10%</span>
                  <span>{scoreData.components?.risk?.percentage || 0}% clear</span>
                </div>
              </div>

              {/* 5. Velocity (10%) */}
              <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Sprint Velocity</span>
                  <span className="font-bold text-purple-400">
                    {scoreData.components?.velocity?.score} / 10
                  </span>
                </div>
                <div className="w-full bg-[#0B0D12] rounded-full h-2 overflow-hidden border border-[#232735]">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, scoreData.components?.velocity?.percentage || 0)}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Weight: 10%</span>
                  <span>{scoreData.components?.velocity?.percentage || 0}% pace</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* AI Execution Risk Analysis Section */}
      {riskError && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-400">
          {riskError}
        </div>
      )}

      {analyzing ? (
        <div className="bg-[#11141C] p-10 rounded-2xl border border-[#232735] text-center shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-indigo-950/60 border border-indigo-800/40 text-indigo-400 flex items-center justify-center mx-auto mb-3 animate-pulse">
            <Brain className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            Analyzing Sprint Execution Trajectory...
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Evaluating task dependencies, overdue risks, team capacity, and bottlenecks.
          </p>
        </div>
      ) : riskData ? (
        <div className="bg-[#11141C] p-6 sm:p-7 rounded-2xl border border-[#232735] shadow-xl space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#232735]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center text-indigo-400">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  AI Execution Risk Analysis
                </h3>
                <p className="text-xs text-slate-400">
                  Root-cause diagnosis, delivery bottlenecks, and mitigation recommendations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                  RISK_BADGES[riskData.overallRisk] || RISK_BADGES.MEDIUM
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                Overall Risk: {riskData.overallRisk}
              </span>
            </div>
          </div>

          {/* Primary Bottleneck Card */}
          {riskData.bottleneck && (
            <div className="p-5 rounded-xl bg-[#171A24] border border-amber-900/40 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                <span>Identified Bottleneck</span>
              </div>
              <h4 className="text-sm font-bold text-white">
                {riskData.bottleneck.title}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {riskData.bottleneck.description}
              </p>
            </div>
          )}

          {/* Risks & Recommendations 2-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Risks */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />
                <span>Delivery Risks ({riskData.risks?.length || 0})</span>
              </h4>
              <div className="space-y-2.5">
                {riskData.risks?.map((r, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white">
                        {r.title}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                          RISK_BADGES[r.impact] || RISK_BADGES.MEDIUM
                        }`}
                      >
                        {r.impact}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {r.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-indigo-400" />
                <span>Mitigation Actions ({riskData.recommendations?.length || 0})</span>
              </h4>
              <div className="space-y-2.5">
                {riskData.recommendations?.map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-indigo-400 text-[11px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-white">
                        {rec.action}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 pl-7 leading-relaxed">
                      {rec.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Positive Signals */}
          {riskData.positiveSignals && riskData.positiveSignals.length > 0 && (
            <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Positive Execution Signals</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {riskData.positiveSignals.map((sig, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="text-emerald-400 font-bold shrink-0 mt-0.5">✓</span>
                    <span>{sig}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Metadata */}
          <div className="pt-3 border-t border-[#232735] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-400">
                {riskData.source === 'gemini' ? 'Powered by Google Gemini' : 'Deterministic Fallback Analysis'}
              </span>
              <span>•</span>
              <span>
                Generated:{' '}
                {riskData.generatedAt
                  ? new Date(riskData.generatedAt).toLocaleString()
                  : 'Just now'}
              </span>
            </div>
            {isFounder && (
              <button
                onClick={handleAnalyzeRisk}
                disabled={analyzing}
                className="text-indigo-400 hover:text-indigo-300 font-semibold underline hover:no-underline self-start sm:self-auto"
              >
                Re-run AI Analysis
              </button>
            )}
          </div>
        </div>
      ) : isFounder ? (
        /* Empty State for Risk Analysis */
        <div className="bg-[#11141C] p-8 rounded-2xl border border-dashed border-[#2A2F42] text-center shadow-xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-950/60 border border-indigo-800/40 text-indigo-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              No Execution Risk Analysis Generated Yet
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
              Analyze your current tasks and team workload with AI to detect bottlenecks,
              uncover blockers, and receive structured mitigation recommendations.
            </p>
          </div>
          <button
            onClick={handleAnalyzeRisk}
            disabled={analyzing || loadingScore}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Analyze Execution Risks</span>
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default ExecutionDashboard;
