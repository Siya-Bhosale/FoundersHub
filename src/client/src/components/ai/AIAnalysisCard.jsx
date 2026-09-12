import React from 'react';
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Target,
  CheckCircle2,
  RefreshCw,
  Loader2,
  AlertCircle,
  HelpCircle,
  Lightbulb,
  ShieldAlert,
  BrainCircuit,
} from 'lucide-react';

const getScoreBarColor = (score) => {
  if (score >= 8) return 'bg-emerald-500';
  if (score >= 6) return 'bg-indigo-500';
  return 'bg-amber-500';
};

export const AIAnalysisCard = ({
  analysis,
  loading,
  error,
  onAnalyze,
  canAnalyze,
}) => {
  // 1. Loading State (when analysis is in progress)
  if (loading) {
    return (
      <div className="bg-[#11141C] rounded-2xl border border-indigo-900/40 p-8 sm:p-12 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-pulse" />
        <div className="flex flex-col items-center justify-center text-center py-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-950/60 text-indigo-400 flex items-center justify-center mb-4 shadow-lg border border-indigo-800/40 animate-pulse">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">
            Analyzing Startup Idea...
          </h3>
          <p className="text-sm text-slate-400 max-w-md">
            Gemini AI is evaluating your problem statement, market potential, feasibility, risks, and strategic next steps.
          </p>
        </div>
      </div>
    );
  }

  // 2. Empty State (no analysis generated yet)
  if (!analysis || !analysis.overallAssessment) {
    if (!canAnalyze) {
      return null;
    }

    return (
      <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0 border border-indigo-400/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">
                Get AI Insights for Your Startup
              </h3>
              <p className="text-sm text-slate-400 max-w-xl leading-relaxed">
                Analyze your problem strength, market potential, technical feasibility, key risks, growth opportunities, and actionable recommendations.
              </p>
            </div>
          </div>

          <button
            onClick={onAnalyze}
            type="button"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" />
            <span>Analyze with AI</span>
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-950/40 border border-red-800/40 flex items-center gap-2.5 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }

  // 3. Render Analysis Display
  const {
    overallAssessment,
    problemStrength,
    marketPotential,
    feasibility,
    risks = [],
    opportunities = [],
    recommendations = [],
    source,
    generatedAt,
  } = analysis;

  const formattedDate = generatedAt
    ? new Date(generatedAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      })
    : null;

  return (
    <div className="bg-[#11141C] rounded-2xl border border-[#232735] shadow-xl overflow-hidden space-y-6 p-6 sm:p-8">
      {/* Header & Source Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#232735]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              AI Startup Analysis
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Objective venture evaluation of your startup's core viability and trajectory.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Source Badge */}
          {source === 'gemini' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-950/60 text-indigo-400 border border-indigo-800/60">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Powered by Gemini</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#171A24] text-slate-300 border border-[#2A2F42]">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Fallback analysis</span>
            </span>
          )}

          {/* Timestamp */}
          {formattedDate && (
            <span className="text-[11px] text-slate-500">
              Analyzed {formattedDate}
            </span>
          )}

          {/* Re-analyze button for owner */}
          {canAnalyze && (
            <button
              onClick={onAnalyze}
              disabled={loading}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] hover:text-white transition ml-auto sm:ml-0"
              title="Regenerate analysis"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Re-analyze</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Alert if re-analysis failed */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/40 flex items-center gap-2.5 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* A. Overall Assessment */}
      <div className="bg-gradient-to-br from-indigo-950/50 to-purple-950/30 rounded-xl border border-indigo-900/50 p-5 sm:p-6">
        <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-2">
          <Sparkles className="w-4 h-4" />
          <span>Executive Assessment</span>
        </div>
        <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-normal">
          {overallAssessment}
        </p>
      </div>

      {/* B. Scores Grid */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Core Pillar Scores
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Problem Strength */}
          <div className="bg-[#171A24] rounded-xl border border-[#2A2F42] p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                  Problem Strength
                </span>
                <span className="text-lg font-extrabold text-white">
                  {problemStrength?.score || 0}
                  <span className="text-xs text-slate-500 font-normal">/10</span>
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#0B0D12] overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getScoreBarColor(
                    problemStrength?.score || 0
                  )}`}
                  style={{ width: `${(problemStrength?.score || 0) * 10}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {problemStrength?.explanation}
              </p>
            </div>
          </div>

          {/* Market Potential */}
          <div className="bg-[#171A24] rounded-xl border border-[#2A2F42] p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                  Market Potential
                </span>
                <span className="text-lg font-extrabold text-white">
                  {marketPotential?.score || 0}
                  <span className="text-xs text-slate-500 font-normal">/10</span>
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#0B0D12] overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getScoreBarColor(
                    marketPotential?.score || 0
                  )}`}
                  style={{ width: `${(marketPotential?.score || 0) * 10}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {marketPotential?.explanation}
              </p>
            </div>
          </div>

          {/* Feasibility */}
          <div className="bg-[#171A24] rounded-xl border border-[#2A2F42] p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                  Feasibility
                </span>
                <span className="text-lg font-extrabold text-white">
                  {feasibility?.score || 0}
                  <span className="text-xs text-slate-500 font-normal">/10</span>
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#0B0D12] overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getScoreBarColor(
                    feasibility?.score || 0
                  )}`}
                  style={{ width: `${(feasibility?.score || 0) * 10}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {feasibility?.explanation}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* C & D. Risks & Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Risks */}
        <div className="bg-amber-950/20 rounded-xl border border-amber-800/40 p-5">
          <div className="flex items-center gap-2 mb-3 text-amber-400">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider">
              Identified Strategic Risks
            </h4>
          </div>
          <ul className="space-y-2.5">
            {risks.map((risk, index) => (
              <li key={index} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Opportunities */}
        <div className="bg-emerald-950/20 rounded-xl border border-emerald-800/40 p-5">
          <div className="flex items-center gap-2 mb-3 text-emerald-400">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider">
              Growth Opportunities
            </h4>
          </div>
          <ul className="space-y-2.5">
            {opportunities.map((opportunity, index) => (
              <li key={index} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span>{opportunity}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* E. Actionable Recommendations */}
      <div className="bg-[#171A24] rounded-xl border border-[#2A2F42] p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4 text-indigo-400">
          <Target className="w-4 h-4 text-indigo-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Actionable Recommendations
          </h4>
        </div>
        <div className="space-y-3">
          {recommendations.map((rec, index) => (
            <div
              key={index}
              className="bg-[#11141C] rounded-xl p-3.5 border border-[#232735] flex items-start gap-3"
            >
              <div className="w-5 h-5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                {index + 1}
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {rec}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIAnalysisCard;
