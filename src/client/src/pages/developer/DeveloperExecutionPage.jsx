import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStartupById } from '../../api/startups';
import { getStartupExecutionScore } from '../../api/execution';
import DeveloperWorkspaceHeader from '../../components/developer/DeveloperWorkspaceHeader';
import {
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Zap,
  TrendingUp,
  Loader2,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';

const GRADE_CONFIG = {
  EXCELLENT: { label: 'Excellent', color: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60' },
  GOOD: { label: 'Good', color: 'bg-indigo-950/60 text-indigo-400 border-indigo-800/60' },
  NEEDS_ATTENTION: { label: 'Needs Attention', color: 'bg-amber-950/60 text-amber-400 border-amber-800/60' },
  AT_RISK: { label: 'At Risk', color: 'bg-rose-950/60 text-rose-400 border-rose-800/60' },
};

const DeveloperExecutionPage = () => {
  const { startupId } = useParams();
  const [startup, setStartup] = useState(null);
  const [scoreData, setScoreData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const loadExecution = async () => {
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
        if (mounted) setError(err.message || 'Failed to load execution data');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (startupId) loadExecution();
    return () => {
      mounted = false;
    };
  }, [startupId]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-[#0B0D12]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
        <p className="text-sm text-slate-400 font-medium">Loading execution metrics...</p>
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
          <h2 className="text-xl font-bold text-white">Execution Metrics Unavailable</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            {error || 'Unable to access execution intelligence for this startup.'}
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
  const grade = scoreData?.grade ?? 'NEEDS_ATTENTION';
  const gradeInfo = GRADE_CONFIG[grade] || GRADE_CONFIG.NEEDS_ATTENTION;
  const components = scoreData?.components || {};

  return (
    <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Startup Context & Tool Navigation Header */}
        <DeveloperWorkspaceHeader
          startup={startup}
          activeToolId="execution"
          activeToolLabel="Execution"
        />

        {/* Hero Score Card */}
        <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Deterministic Execution Intelligence
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#171A24] text-slate-400 border border-[#2A2F42]">
                Team View (Read-only)
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Operational Delivery Velocity
            </h2>
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              Real-time calculation computed from sprint task completion, deadline adherence, and active blockers.
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <span className="text-xs text-slate-400 block mb-1">Execution Rating</span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border uppercase tracking-wider ${gradeInfo.color}`}>
                {gradeInfo.label}
              </span>
            </div>

            <div className="w-24 h-24 rounded-2xl bg-[#171A24] border border-[#2A2F42] flex flex-col items-center justify-center shadow-inner">
              <span className="text-3xl font-black text-white">{score}</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">/ 100</span>
            </div>
          </div>
        </div>

        {/* 5 Deterministic Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-4 shadow-xl space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Task Completion (35%)
            </span>
            <div className="text-xl font-extrabold text-white">
              {components.taskCompletion?.score ?? score}%
            </div>
            <span className="text-[10px] text-slate-500 block">Delivered vs committed</span>
          </div>

          <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-4 shadow-xl space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Deadline Adherence (25%)
            </span>
            <div className="text-xl font-extrabold text-white">
              {components.deadlineAdherence?.score ?? 80}%
            </div>
            <span className="text-[10px] text-slate-500 block">On-time milestone delivery</span>
          </div>

          <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-4 shadow-xl space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Workload Balance (15%)
            </span>
            <div className="text-xl font-extrabold text-white">
              {components.workloadDistribution?.score ?? 75}%
            </div>
            <span className="text-[10px] text-slate-500 block">Task distribution across devs</span>
          </div>

          <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-4 shadow-xl space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Risk & Blockers (15%)
            </span>
            <div className="text-xl font-extrabold text-white">
              {components.riskPenalty?.score ?? 85}%
            </div>
            <span className="text-[10px] text-slate-500 block">Penalty for active blockers</span>
          </div>

          <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-4 shadow-xl space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Velocity (10%)
            </span>
            <div className="text-xl font-extrabold text-white">
              {components.velocity?.score ?? 70}%
            </div>
            <span className="text-[10px] text-slate-500 block">Recent completion rate</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperExecutionPage;
