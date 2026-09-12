import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStartupById } from '../../api/startups';
import { getStartupTasks } from '../../api/tasks';
import DeveloperWorkspaceHeader from '../../components/developer/DeveloperWorkspaceHeader';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  SquareCheck,
  Loader2,
  AlertCircle,
  Flag,
  Target,
  ArrowRight,
} from 'lucide-react';

const DeveloperSprintPage = () => {
  const { startupId } = useParams();
  const [startup, setStartup] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const loadSprint = async () => {
      try {
        const [sRes, tRes] = await Promise.all([
          getStartupById(startupId),
          getStartupTasks(startupId),
        ]);
        if (mounted) {
          setStartup(sRes.startup);
          setTasks(tRes.data || tRes.tasks || []);
        }
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load sprint data');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (startupId) loadSprint();
    return () => {
      mounted = false;
    };
  }, [startupId]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-[#0B0D12]">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin mb-3" />
        <p className="text-sm text-slate-400 font-medium">Loading sprint plan...</p>
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
          <h2 className="text-xl font-bold text-white">Sprint Data Unavailable</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            {error || 'Unable to access sprint information for this startup.'}
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

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'DONE').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Startup Context & Tool Navigation Header */}
        <DeveloperWorkspaceHeader
          startup={startup}
          activeToolId="sprint"
          activeToolLabel="Sprint"
        />

        {/* Sprint Overview Card */}
        <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#232735] pb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-950/60 text-sky-400 border border-sky-800/60 flex items-center justify-center">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Active Sprint Cadence
                </span>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  MVP Launch Sprint (14 Days)
                </h2>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
              <Clock className="w-3.5 h-3.5" />
              <span>Sprint Active</span>
            </span>
          </div>

          {/* Goal & Milestone Target */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-400">
                <Target className="w-4 h-4" />
                <span>Sprint Goal</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Build, test, and release the core user flow for {startup.name} with verified data persistence and responsive execution tracking.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <Flag className="w-4 h-4" />
                <span>Sprint Milestone</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Deliver working MVP prototype ready for pilot users, investor demonstration, and initial traction validation.
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400">Sprint Delivery Progress</span>
              <span className="text-white font-bold">{progressPercent}% ({completedTasks}/{totalTasks} tasks completed)</span>
            </div>
            <div className="h-2.5 w-full bg-[#171A24] rounded-full overflow-hidden border border-[#232735]">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Milestone Deliverables / Tasks Preview */}
        <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#232735] pb-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Sprint Task Milestones ({tasks.length})
            </h3>
            <Link
              to={`/developer/startups/${startupId}/tasks`}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <span>Go to Kanban Board</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-[#232735]">
            {tasks.slice(0, 8).map((task) => (
              <div key={task._id || task.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${task.status === 'DONE' ? 'bg-emerald-400' : task.status === 'IN_PROGRESS' ? 'bg-sky-400' : 'bg-slate-500'}`} />
                  <span className="font-semibold text-slate-200">{task.title}</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-[#171A24] text-slate-400 border border-[#2A2F42]">
                  {task.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperSprintPage;
