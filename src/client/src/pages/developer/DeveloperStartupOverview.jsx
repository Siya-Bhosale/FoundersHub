import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDeveloperStartupWorkspace } from '../../api/developer';
import DeveloperWorkspaceHeader from '../../components/developer/DeveloperWorkspaceHeader';
import {
  SquareCheck,
  Activity,
  CalendarDays,
  Users,
  Bot,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
} from 'lucide-react';

const DeveloperStartupOverview = () => {
  const { startupId } = useParams();
  const [workspaceData, setWorkspaceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetchWorkspace = async () => {
      try {
        const res = await getDeveloperStartupWorkspace(startupId);
        if (mounted && res?.success) {
          setWorkspaceData(res);
          try {
            localStorage.setItem('sprintfounders_active_startup', startupId);
          } catch (e) {}
        }
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load developer workspace');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (startupId) fetchWorkspace();
    return () => {
      mounted = false;
    };
  }, [startupId]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-[#0B0D12]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm text-slate-400 font-medium">Loading developer workspace...</p>
      </div>
    );
  }

  if (error || !workspaceData) {
    return (
      <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-[#11141C] p-8 rounded-2xl border border-[#232735] shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-red-950/40 text-red-400 flex items-center justify-center mx-auto border border-red-800/40">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Access Denied or Not Found</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            {error || 'You do not have access to this startup workspace.'}
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

  const { startup, tasksSummary, execution, sprint, team } = workspaceData;

  return (
    <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Startup Context & Tool Navigation Header */}
        <DeveloperWorkspaceHeader
          startup={{ ...startup, teamSize: `${team?.size || 2} members` }}
          activeToolId="overview"
          activeToolLabel="Overview"
        />

        {/* 4 Summary Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* 1. MY TASKS SUMMARY */}
          <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-[#373E54] transition">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  MY TASKS
                </span>
                <div className="w-7 h-7 rounded-lg bg-indigo-950/60 text-indigo-400 border border-indigo-800/50 flex items-center justify-center">
                  <SquareCheck className="w-3.5 h-3.5" />
                </div>
              </div>

              <div>
                <div className="text-3xl font-black text-white tracking-tight">
                  {tasksSummary?.total || 0}
                </div>
                <span className="text-xs text-slate-400 font-medium">Assigned to you</span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#232735] text-[11px]">
                <div>
                  <span className="text-emerald-400 font-bold block">{tasksSummary?.completed || 0}</span>
                  <span className="text-slate-500 text-[10px]">Done</span>
                </div>
                <div>
                  <span className="text-sky-400 font-bold block">{tasksSummary?.inProgress || 0}</span>
                  <span className="text-slate-500 text-[10px]">Active</span>
                </div>
                <div>
                  <span className="text-rose-400 font-bold block">{tasksSummary?.blocked || 0}</span>
                  <span className="text-slate-500 text-[10px]">Blocked</span>
                </div>
              </div>
            </div>

            <Link
              to={`/developer/startups/${startupId}/tasks`}
              className="inline-flex items-center justify-between text-xs font-semibold text-indigo-400 hover:text-indigo-300 pt-2 border-t border-[#232735]"
            >
              <span>View Kanban Board</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 2. STARTUP EXECUTION SUMMARY */}
          <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-[#373E54] transition">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  STARTUP EXECUTION
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5" />
                </div>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white tracking-tight">
                    {execution?.score || 50}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/ 100</span>
                </div>
                <div className="pt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 uppercase">
                    {execution?.grade || 'GOOD'}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed pt-2 border-t border-[#232735]">
                Deterministic rating based on team velocity, task delivery, and blockers.
              </p>
            </div>

            <Link
              to={`/developer/startups/${startupId}/execution`}
              className="inline-flex items-center justify-between text-xs font-semibold text-emerald-400 hover:text-emerald-300 pt-2 border-t border-[#232735]"
            >
              <span>Execution Intelligence</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 3. CURRENT SPRINT SUMMARY */}
          <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-[#373E54] transition">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  CURRENT SPRINT
                </span>
                <div className="w-7 h-7 rounded-lg bg-sky-950/60 text-sky-400 border border-sky-800/50 flex items-center justify-center">
                  <CalendarDays className="w-3.5 h-3.5" />
                </div>
              </div>

              <div>
                <div className="text-base font-bold text-white line-clamp-1">
                  {sprint?.name || 'MVP Launch Sprint'}
                </div>
                <span className="text-xs text-slate-400 block pt-0.5">
                  Duration: {sprint?.durationDays || 14} days
                </span>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-[#232735]">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Progress</span>
                  <span className="text-slate-200 font-semibold">{sprint?.progress || 0}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#171A24] rounded-full overflow-hidden border border-[#232735]">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, sprint?.progress || 0))}%` }}
                  />
                </div>
              </div>
            </div>

            <Link
              to={`/developer/startups/${startupId}/sprint`}
              className="inline-flex items-center justify-between text-xs font-semibold text-sky-400 hover:text-sky-300 pt-2 border-t border-[#232735]"
            >
              <span>View Sprint Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 4. TEAM SUMMARY */}
          <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-[#373E54] transition">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  TEAM
                </span>
                <div className="w-7 h-7 rounded-lg bg-violet-950/60 text-violet-400 border border-violet-800/50 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5" />
                </div>
              </div>

              <div>
                <div className="text-3xl font-black text-white tracking-tight">
                  {team?.size || 2}
                </div>
                <span className="text-xs text-slate-400 font-medium">Active team members</span>
              </div>

              <div className="text-[11px] text-slate-400 leading-relaxed pt-2 border-t border-[#232735]">
                {startup?.founder?.name ? `Founded by ${startup.founder.name}` : 'Multi-disciplinary startup roster'}
              </div>
            </div>

            <Link
              to={`/developer/startups/${startupId}/team`}
              className="inline-flex items-center justify-between text-xs font-semibold text-violet-400 hover:text-violet-300 pt-2 border-t border-[#232735]"
            >
              <span>View Team Roster</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* QUICK ACTIONS SECTION */}
        <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 sm:p-7 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#232735] pb-3.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              QUICK ACTIONS
            </h2>
            <span className="text-xs text-slate-500">Fast access to startup execution tools</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <Link
              to={`/developer/startups/${startupId}/tasks`}
              className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] hover:border-indigo-500/40 hover:bg-[#1E2330] transition flex flex-col items-center justify-center text-center gap-2 group shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-800/60 flex items-center justify-center group-hover:scale-105 transition-transform">
                <SquareCheck className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-white group-hover:text-indigo-300 transition">
                My Tasks
              </span>
              <span className="text-[10px] text-slate-400">Kanban Board</span>
            </Link>

            <Link
              to={`/developer/startups/${startupId}/execution`}
              className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] hover:border-emerald-500/40 hover:bg-[#1E2330] transition flex flex-col items-center justify-center text-center gap-2 group shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition">
                Execution
              </span>
              <span className="text-[10px] text-slate-400">Velocity & Score</span>
            </Link>

            <Link
              to={`/developer/startups/${startupId}/ai-mentor`}
              className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] hover:border-violet-500/40 hover:bg-[#1E2330] transition flex flex-col items-center justify-center text-center gap-2 group shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-950/60 text-violet-400 border border-violet-800/60 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Bot className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-white group-hover:text-violet-300 transition">
                AI Mentor
              </span>
              <span className="text-[10px] text-slate-400">Contextual Advice</span>
            </Link>

            <Link
              to={`/developer/startups/${startupId}/sprint`}
              className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] hover:border-sky-500/40 hover:bg-[#1E2330] transition flex flex-col items-center justify-center text-center gap-2 group shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-950/60 text-sky-400 border border-sky-800/60 flex items-center justify-center group-hover:scale-105 transition-transform">
                <CalendarDays className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-white group-hover:text-sky-300 transition">
                Sprint
              </span>
              <span className="text-[10px] text-slate-400">Goals & Timeline</span>
            </Link>
          </div>
        </div>

        {/* Mission Briefing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-5 shadow-xl space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Problem Statement
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">
              {startup?.problemStatement || 'Target industry problem being addressed.'}
            </p>
          </div>

          <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-5 shadow-xl space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Solution Approach
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">
              {startup?.solution || 'Product approach and technical architecture.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperStartupOverview;
