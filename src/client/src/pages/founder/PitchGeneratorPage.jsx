import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { generatePitch } from '../../api/pitch';
import { getStartupById } from '../../api/startups';
import {
  Presentation,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Target,
  Lightbulb,
  Building2,
  Briefcase,
  TrendingUp,
  Shield,
  Users,
  DollarSign,
  PieChart,
  HelpCircle,
  Clock,
  Send,
} from 'lucide-react';

const PitchGeneratorPage = () => {
  const { startupId } = useParams();

  const [startup, setStartup] = useState(null);
  const [pitch, setPitch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Load startup details initially
  useEffect(() => {
    const fetchStartup = async () => {
      setInitialLoading(true);
      setError(null);
      try {
        const res = await getStartupById(startupId);
        setStartup(res.startup || res.data || null);
      } catch (err) {
        console.error('Error fetching startup for pitch:', err);
        setError(err.message || 'Unable to load startup details');
      } finally {
        setInitialLoading(false);
      }
    };

    if (startupId) {
      fetchStartup();
    }
  }, [startupId]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generatePitch(startupId);
      setPitch(res.data || res.pitch || null);
    } catch (err) {
      console.error('Pitch generation error:', err);
      setError(err.message || 'Failed to generate pitch. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!pitch) return;

    const fullPitchText = `
${pitch.headline}
"${pitch.oneLiner}"

[ELEVATOR PITCH (30-60s)]
${pitch.elevatorPitch}

[PROBLEM]
${pitch.problem}

[SOLUTION]
${pitch.solution}

[TARGET MARKET]
${pitch.targetMarket}

[BUSINESS MODEL]
${pitch.businessModel}

[TRACTION & METRICS]
${pitch.traction}

[COMPETITIVE ADVANTAGE]
${pitch.competitiveAdvantage}

[TEAM & EXECUTION]
${pitch.team}

[FINANCIAL SNAPSHOT]
${pitch.financialSnapshot}

[FUNDING ASK]
${pitch.fundingAsk}

[USE OF FUNDS]
${pitch.useOfFunds}

[CLOSING]
${pitch.closingStatement}
    `.trim();

    navigator.clipboard.writeText(fullPitchText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  if (initialLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Loading Venture Details...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Link
            to={`/startups/${startupId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to {startup?.name || 'Startup Overview'}</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <Presentation className="w-4 h-4" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              AI Pitch Generator
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Turn your startup data into an investor-ready pitch.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {pitch && (
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-200 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] hover:text-white transition shadow-sm"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>Copy Pitch</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 transition shadow-lg shadow-indigo-600/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Preparing Pitch...</span>
              </>
            ) : pitch ? (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Regenerate</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Pitch</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Hero Welcome / Prompt Callout when no pitch is generated yet */}
      {!pitch && !loading && (
        <div className="p-8 rounded-2xl bg-[#11141C] border border-[#232735] text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-indigo-950/60 border border-indigo-800/50 text-indigo-400 flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/10">
            <Presentation className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="text-lg font-bold text-white">
              Ready to Pitch {startup?.name || 'Your Venture'}?
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              We compile your problem statement, solution, active team capabilities, sprint execution score, and verified financial runway into a cohesive investor memo.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Pitch Deck</span>
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="p-12 rounded-2xl bg-[#11141C] border border-[#232735] text-center space-y-4 shadow-xl">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              AI is preparing your pitch...
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Analyzing team skills, execution intelligence, sprint velocity, and financial runway metrics.
            </p>
          </div>
        </div>
      )}

      {/* Generated Pitch Deck Content */}
      {pitch && !loading && (
        <div className="space-y-6">
          {/* Deck Header & Headline Card */}
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#131724] to-[#11141C] border border-indigo-900/40 shadow-2xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 tracking-wider">
                Venture Pitch Deck
              </span>
              <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  {pitch.source === 'gemini' ? 'Powered by Gemini' : 'Fallback Pitch'}
                </span>
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {pitch.headline}
            </h2>
            <p className="text-sm sm:text-base font-medium text-indigo-300/90 leading-relaxed italic">
              "{pitch.oneLiner}"
            </p>
          </div>

          {/* Featured Elevator Pitch Box */}
          <div className="p-6 rounded-2xl bg-[#11141C] border-2 border-indigo-500/40 shadow-xl space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-950/70 text-indigo-400 border border-indigo-800/50 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Elevator Pitch (30–60 Seconds)
              </h3>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-sans bg-[#171A24] p-4 rounded-xl border border-[#2A2F42]">
              {pitch.elevatorPitch}
            </p>
          </div>

          {/* Section Grid: Problem & Solution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 rounded-2xl bg-[#11141C] border border-[#232735] shadow-md space-y-2.5">
              <div className="flex items-center gap-2 text-rose-400">
                <HelpCircle className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">The Problem</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{pitch.problem}</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#11141C] border border-[#232735] shadow-md space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-400">
                <Lightbulb className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">The Solution</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{pitch.solution}</p>
            </div>
          </div>

          {/* Section Grid: Target Market & Business Model */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 rounded-2xl bg-[#11141C] border border-[#232735] shadow-md space-y-2.5">
              <div className="flex items-center gap-2 text-indigo-400">
                <Target className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Target Market</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{pitch.targetMarket}</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#11141C] border border-[#232735] shadow-md space-y-2.5">
              <div className="flex items-center gap-2 text-amber-400">
                <Briefcase className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Business Model</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{pitch.businessModel}</p>
            </div>
          </div>

          {/* Section Grid: Traction & Competitive Advantage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 rounded-2xl bg-[#11141C] border border-[#232735] shadow-md space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-400">
                <TrendingUp className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Traction & Validation</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{pitch.traction}</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#11141C] border border-[#232735] shadow-md space-y-2.5">
              <div className="flex items-center gap-2 text-indigo-400">
                <Shield className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Competitive Advantage</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{pitch.competitiveAdvantage}</p>
            </div>
          </div>

          {/* Team Composition */}
          <div className="p-5 rounded-2xl bg-[#11141C] border border-[#232735] shadow-md space-y-2.5">
            <div className="flex items-center gap-2 text-indigo-400">
              <Users className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">The Team & Execution Squad</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{pitch.team}</p>
          </div>

          {/* Financial Snapshot, Funding Ask, and Use of Funds */}
          <div className="p-6 rounded-2xl bg-[#11141C] border border-[#232735] shadow-xl space-y-5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-950/70 text-emerald-400 border border-emerald-800/50 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Capital Allocation & Financial Snapshot
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Financial Snapshot
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {pitch.financialSnapshot}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                  Funding Ask
                </span>
                <p className="text-xs text-white font-medium leading-relaxed">
                  {pitch.fundingAsk}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
                  Use of Funds
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {pitch.useOfFunds}
                </p>
              </div>
            </div>
          </div>

          {/* Closing Statement */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-[#11141C] to-violet-950/40 border border-indigo-900/40 text-center space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Closing Statement
            </h4>
            <p className="text-sm text-slate-200 max-w-2xl mx-auto leading-relaxed font-medium">
              "{pitch.closingStatement}"
            </p>
          </div>

          {/* Bottom Action Bar */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] hover:text-white transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              <span>{copied ? 'Copied' : 'Copy Pitch'}</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={handleGenerate}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-md shadow-indigo-600/20"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Regenerate Pitch</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PitchGeneratorPage;
