import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStartupById } from '../../api/startups';
import { getStartupExecutionScore } from '../../api/execution';
import DeveloperWorkspaceHeader from '../../components/developer/DeveloperWorkspaceHeader';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TrendingDown,
  ShieldCheck,
} from 'lucide-react';

const DeveloperRiskPage = () => {
  const { startupId } = useParams();
  const [startup, setStartup] = useState(null);
  const [scoreData, setScoreData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const loadRiskData = async () => {
      try {
        const [sRes, eRes] = await Promise.all([
          getStartupById(startupId),
          getStartupExecutionScore(startupId),
        ]);
        if (mounted) {
          setStartup(sRes.startup);
          setScoreData(eRes);
        }
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load risk analysis');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (startupId) loadRiskData();
    return () => {
      mounted = false;
    };
  }, [startupId]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-[#0B0D12]">
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin mb-3" />
        <p className="text-sm text-slate-400 font-medium">Loading execution risk assessment...</p>
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
          <h2 className="text-xl font-bold text-white">Risk Analysis Unavailable</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            {error || 'Unable to access risk analysis for this startup.'}
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

  const score = scoreData?.score ?? 50;
  const isHighRisk = score < 40;
  const isMediumRisk = score >= 40 && score < 75;

  return (
    <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Startup Context & Tool Navigation Header */}
        <DeveloperWorkspaceHeader
          startup={startup}
          activeToolId="risk-analysis"
          activeToolLabel="Risk Analysis"
        />

        {/* Risk Banner */}
        <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 sm:p-8 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-[#232735] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-950/60 text-rose-400 border border-rose-800/60 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Execution Risk Assessment</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#171A24] text-slate-400 border border-[#2A2F42]">
                    Team View (Read-only)
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Real-time operational friction analysis to keep sprint delivery on schedule.
                </p>
              </div>
            </div>

            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border uppercase tracking-wider ${
                isHighRisk
                  ? 'bg-rose-950/60 text-rose-400 border-rose-800/60'
                  : isMediumRisk
                  ? 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                  : 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
              }`}
            >
              {isHighRisk ? 'High Risk' : isMediumRisk ? 'Moderate Risk' : 'Low Risk'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                Blockers Impact
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                Active blocked tasks degrade sprint momentum. Clearing technical hurdles immediately elevates the execution score.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Deadline Adherence
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tasks delivered past due date trigger exponential delivery penalties. Maintain realistic task estimations.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Velocity Defense
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                Consistent task completion within each 14-day sprint cycle prevents sprint backlog debt.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperRiskPage;
