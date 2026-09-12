import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStartupById } from '../../api/startups';
import DeveloperWorkspaceHeader from '../../components/developer/DeveloperWorkspaceHeader';
import {
  Sparkles,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  Loader2,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  Target,
} from 'lucide-react';

const DeveloperAnalyzerPage = () => {
  const { startupId } = useParams();
  const [startup, setStartup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const loadStartup = async () => {
      try {
        const res = await getStartupById(startupId);
        if (mounted && res?.startup) {
          setStartup(res.startup);
        }
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load startup analysis');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (startupId) loadStartup();
    return () => {
      mounted = false;
    };
  }, [startupId]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-[#0B0D12]">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin mb-3" />
        <p className="text-sm text-slate-400 font-medium">Loading startup analysis...</p>
      </div>
    );
  }

  if (error || !startup) {
    return (
      <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-[#11141C] p-8 rounded-2xl border border-[#232735] shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-red-950/40 text-red-400 flex items-center justify-center mx-auto border border-red-800/40">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Startup Analysis Unavailable</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            {error || 'Unable to access analysis for this startup.'}
          </p>
          <div className="pt-2">
            <Link
              to="/developer/my-startups"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20"
            >
              <span>Back to My Startups</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const analysis = startup.aiAnalysis;

  return (
    <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Startup Context & Tool Navigation Header */}
        <DeveloperWorkspaceHeader
          startup={startup}
          activeToolId="analyzer"
          activeToolLabel="Startup Analyzer"
        />

        {/* Overview Banner */}
        <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 sm:p-8 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-[#232735] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-950/60 text-violet-400 border border-violet-800/60 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>AI Startup Architecture & Viability</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#171A24] text-slate-400 border border-[#2A2F42]">
                    Read-only Team View
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Validated product thesis, market positioning, and strategic priorities.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-400">
                <HelpCircle className="w-4 h-4" />
                <span>Problem Statement</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                {startup.problemStatement}
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <Lightbulb className="w-4 h-4" />
                <span>Engineered Solution</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                {startup.solution}
              </p>
            </div>
          </div>
        </div>

        {/* Existing AI Analysis if generated */}
        {analysis ? (
          <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 sm:p-8 shadow-xl space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              AI Market & Execution Insights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {analysis.marketOpportunity && (
                <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">Market Opportunity</span>
                  <p className="text-xs text-slate-300 leading-relaxed">{analysis.marketOpportunity}</p>
                </div>
              )}
              {analysis.targetAudience && (
                <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Target Audience</span>
                  <p className="text-xs text-slate-300 leading-relaxed">{analysis.targetAudience}</p>
                </div>
              )}
              {analysis.technicalFeasibility && (
                <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Technical Feasibility</span>
                  <p className="text-xs text-slate-300 leading-relaxed">{analysis.technicalFeasibility}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-[#11141C] border border-[#232735] text-center text-xs text-slate-400">
            Startup architecture definition is active. Full AI thesis is maintained by the founder.
          </div>
        )}
      </div>
    </div>
  );
};

export default DeveloperAnalyzerPage;
