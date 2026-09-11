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

/**
 * Helper to get progress bar color based on score (1-10)
 */
const getScoreColor = (score) => {
  if (score >= 8) return 'bg-emerald-500 text-emerald-700 bg-emerald-50 border-emerald-200';
  if (score >= 6) return 'bg-indigo-500 text-indigo-700 bg-indigo-50 border-indigo-200';
  return 'bg-amber-500 text-amber-700 bg-amber-50 border-amber-200';
};

const getScoreBarColor = (score) => {
  if (score >= 8) return 'bg-emerald-500';
  if (score >= 6) return 'bg-indigo-600';
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
      <div className="bg-white rounded-2xl border border-indigo-100 p-8 sm:p-12 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-pulse" />
        <div className="flex flex-col items-center justify-center text-center py-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 shadow-sm border border-indigo-100 animate-pulse">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            Analyzing Startup Idea...
          </h3>
          <p className="text-sm text-slate-500 max-w-md">
            Gemini AI is evaluating your problem statement, market potential, feasibility, risks, and strategic next steps.
          </p>
        </div>
      </div>
    );
  }

  // 2. Empty State (no analysis generated yet)
  if (!analysis || !analysis.overallAssessment) {
    if (!canAnalyze) {
      return null; // Don't show empty prompt to non-owners or non-founders
    }

    return (
      <div className="bg-gradient-to-br from-white to-indigo-50/40 rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100 flex-shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Get AI Insights for Your Startup
              </h3>
              <p className="text-sm text-slate-600 max-w-xl leading-relaxed">
                Analyze your problem strength, market potential, technical feasibility, key risks, growth opportunities, and actionable recommendations.
              </p>
            </div>
          </div>

          <button
            onClick={onAnalyze}
            type="button"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-sm shadow-indigo-200 transition whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" />
            <span>Analyze with AI</span>
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-6 p-6 sm:p-8">
      {/* Header & Source Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-100">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              AI Startup Analysis
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Objective venture evaluation of your startup's core viability and trajectory.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Source Badge */}
          {source === 'gemini' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Powered by Gemini</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Fallback analysis</span>
            </span>
          )}

          {/* Timestamp */}
          {formattedDate && (
            <span className="text-[11px] text-slate-400">
              Analyzed {formattedDate}
            </span>
          )}

          {/* Re-analyze button for owner */}
          {canAnalyze && (
            <button
              onClick={onAnalyze}
              disabled={loading}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition shadow-2xs ml-auto sm:ml-0"
              title="Regenerate analysis"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              <span>Re-analyze</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Alert if re-analysis failed */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* A. Overall Assessment */}
      <div className="bg-gradient-to-br from-indigo-50/70 to-purple-50/40 rounded-xl border border-indigo-100 p-5 sm:p-6">
        <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider mb-2">
          <Sparkles className="w-4 h-4" />
          <span>Executive Assessment</span>
        </div>
        <p className="text-sm sm:text-base text-slate-800 leading-relaxed font-normal">
          {overallAssessment}
        </p>
      </div>

      {/* B. Scores Grid */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Core Pillar Scores
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Problem Strength */}
          <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Problem Strength
                </span>
                <span className="text-lg font-extrabold text-slate-900">
                  {problemStrength?.score || 0}
                  <span className="text-xs text-slate-400 font-normal">/10</span>
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getScoreBarColor(
                    problemStrength?.score || 0
                  )}`}
                  style={{ width: `${(problemStrength?.score || 0) * 10}%` }}
                />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {problemStrength?.explanation}
              </p>
            </div>
          </div>

          {/* Market Potential */}
          <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Market Potential
                </span>
                <span className="text-lg font-extrabold text-slate-900">
                  {marketPotential?.score || 0}
                  <span className="text-xs text-slate-400 font-normal">/10</span>
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getScoreBarColor(
                    marketPotential?.score || 0
                  )}`}
                  style={{ width: `${(marketPotential?.score || 0) * 10}%` }}
                />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {marketPotential?.explanation}
              </p>
            </div>
          </div>

          {/* Feasibility */}
          <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Feasibility
                </span>
                <span className="text-lg font-extrabold text-slate-900">
                  {feasibility?.score || 0}
                  <span className="text-xs text-slate-400 font-normal">/10</span>
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getScoreBarColor(
                    feasibility?.score || 0
                  )}`}
                  style={{ width: `${(feasibility?.score || 0) * 10}%` }}
                />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {feasibility?.explanation}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* C & D. Risks & Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Risks */}
        <div className="bg-amber-50/40 rounded-xl border border-amber-200/70 p-5">
          <div className="flex items-center gap-2 mb-3 text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider">
              Identified Strategic Risks
            </h4>
          </div>
          <ul className="space-y-2.5">
            {risks.map((risk, index) => (
              <li key={index} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Opportunities */}
        <div className="bg-emerald-50/40 rounded-xl border border-emerald-200/70 p-5">
          <div className="flex items-center gap-2 mb-3 text-emerald-800">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider">
              Growth Opportunities
            </h4>
          </div>
          <ul className="space-y-2.5">
            {opportunities.map((opportunity, index) => (
              <li key={index} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                <span>{opportunity}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* E. Actionable Recommendations */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4 text-indigo-800">
          <Target className="w-4 h-4 text-indigo-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Actionable Recommendations
          </h4>
        </div>
        <div className="space-y-3">
          {recommendations.map((rec, index) => (
            <div
              key={index}
              className="bg-white rounded-lg p-3.5 border border-slate-200/80 flex items-start gap-3 shadow-2xs"
            >
              <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                {index + 1}
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
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
