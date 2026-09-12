import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStartupById } from '../../api/startups';
import { getStartupTasks } from '../../api/tasks';
import StartupHeader from '../../components/common/StartupHeader';
import {
  ListChecks,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  SquareCheck,
} from 'lucide-react';

const SprintPlannerPage = () => {
  const { startupId } = useParams();
  const [startup, setStartup] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const loadSprintData = async () => {
      try {
        const [sRes, tRes] = await Promise.all([
          getStartupById(startupId),
          getStartupTasks(startupId).catch(() => ({ data: [] })),
        ]);
        if (mounted) {
          setStartup(sRes.startup);
          setTasks(tRes.data || tRes.tasks || []);
          try {
            localStorage.setItem('sprintfounders_active_startup', startupId);
          } catch (e) {}
        }
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load sprint planner');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (startupId) loadSprintData();
    return () => {
      mounted = false;
    };
  }, [startupId]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-[#0B0D12]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm text-slate-400 font-medium">Loading sprint planner...</p>
      </div>
    );
  }

  const completedCount = tasks.filter((t) => t.status === 'DONE').length;
  const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const blockedCount = tasks.filter((t) => t.status === 'BLOCKED').length;
  const todoCount = tasks.filter((t) => t.status === 'TODO').length;

  return (
    <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <StartupHeader
          startup={startup}
          toolName="Sprint Planner"
          toolDescription="14-day agile milestone roadmap, cadence management, and sprint backlog approval."
          routePrefix="/sprint-planner"
          actionButton={
            <Link
              to={`/tasks/${startupId}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition"
            >
              <SquareCheck className="w-3.5 h-3.5" />
              <span>Go to Tasks Kanban</span>
            </Link>
          }
        />

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Sprint Overview Card */}
        <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#232735] pb-5">
            <div>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 tracking-wider">
                Active Cycle
              </span>
              <h2 className="text-xl font-extrabold text-white mt-1">
                MVP Launch Sprint (14 Days)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Goal: Build, test, and deploy the functional core features for early user validation.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-[#171A24] border border-[#2A2F42] text-center min-w-[90px]">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Duration</span>
                <span className="text-sm font-black text-white">14 Days</span>
              </div>
              <div className="p-3 rounded-xl bg-[#171A24] border border-[#2A2F42] text-center min-w-[90px]">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                <span className="text-sm font-black text-emerald-400">ACTIVE</span>
              </div>
            </div>
          </div>

          {/* Sprint Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42]">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">To Do</span>
              <span className="text-2xl font-black text-slate-200 mt-1 block">{todoCount}</span>
            </div>
            <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42]">
              <span className="text-[10px] font-bold uppercase text-indigo-400 block">In Progress</span>
              <span className="text-2xl font-black text-indigo-300 mt-1 block">{inProgressCount}</span>
            </div>
            <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42]">
              <span className="text-[10px] font-bold uppercase text-amber-400 block">Blocked</span>
              <span className="text-2xl font-black text-amber-300 mt-1 block">{blockedCount}</span>
            </div>
            <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42]">
              <span className="text-[10px] font-bold uppercase text-emerald-400 block">Completed</span>
              <span className="text-2xl font-black text-emerald-300 mt-1 block">{completedCount}</span>
            </div>
          </div>
        </div>

        {/* 14-Day Timeline Breakdown */}
        <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">Sprint Execution Phases</h3>
            </div>
            <Link
              to={`/tasks/${startupId}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
            >
              <span>Manage on Kanban</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-950 text-indigo-300">
                  Days 1 – 4
                </span>
                <span className="text-xs text-slate-400 font-semibold">Phase 1</span>
              </div>
              <h4 className="text-sm font-bold text-white">Foundations & Architecture</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Repository setup, database schemas, authentication middleware, and baseline infrastructure.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-950 text-indigo-300">
                  Days 5 – 10
                </span>
                <span className="text-xs text-slate-400 font-semibold">Phase 2</span>
              </div>
              <h4 className="text-sm font-bold text-white">Core Feature Implementation</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Primary API endpoints, frontend dashboards, domain model integration, and core customer workflows.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-950 text-indigo-300">
                  Days 11 – 14
                </span>
                <span className="text-xs text-slate-400 font-semibold">Phase 3</span>
              </div>
              <h4 className="text-sm font-bold text-white">Testing & Staging Release</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Integration testing, performance benchmarking, end-to-end bug fixing, and staging deployment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SprintPlannerPage;
