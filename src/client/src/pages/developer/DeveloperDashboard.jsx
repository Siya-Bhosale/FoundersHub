import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyDeveloperProfile } from '../../api/developer';
import { getMyTasks } from '../../api/tasks';
import { getMyStartups } from '../../api/startups';
import { calculateProfileCompletion } from '../../utils/profileCompletion';
import {
  Code2,
  Briefcase,
  Globe,
  Edit3,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  ArrowRight,
  UserCheck,
  Compass,
  Activity,
  CheckCircle,
  ListTodo,
  Building2,
  Users,
  Layers,
} from 'lucide-react';

const GithubIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

const LinkedinIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
  </svg>
);

const AVAILABILITY_CONFIG = {
  AVAILABLE: {
    label: 'Available Full-Time',
    badge: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60',
    dot: 'bg-emerald-400',
  },
  PART_TIME: {
    label: 'Part-Time / Contract',
    badge: 'bg-amber-950/60 text-amber-400 border-amber-800/60',
    dot: 'bg-amber-400',
  },
  NOT_AVAILABLE: {
    label: 'Not Currently Available',
    badge: 'bg-slate-800/80 text-slate-400 border-slate-700/60',
    dot: 'bg-slate-500',
  },
};

const STAGE_CONFIG = {
  IDEA: { label: 'Idea', color: 'bg-sky-950/60 text-sky-400 border-sky-800/60' },
  MVP: { label: 'MVP', color: 'bg-indigo-950/60 text-indigo-400 border-indigo-800/60' },
  EARLY_TRACTION: { label: 'Early Traction', color: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60' },
  GROWTH: { label: 'Growth', color: 'bg-amber-950/60 text-amber-400 border-amber-800/60' },
};

const DeveloperDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Developer joined startups state
  const [startups, setStartups] = useState([]);
  const [loadingStartups, setLoadingStartups] = useState(true);

  // Developer personal execution & tasks state
  const [tasksData, setTasksData] = useState({
    tasks: [],
    summary: { total: 0, completed: 0, overdue: 0, totalHours: 0 },
  });
  const [loadingTasks, setLoadingTasks] = useState(true);

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getMyDeveloperProfile();
      if (res?.data) {
        setProfile(res.data);
      }
    } catch (err) {
      if (err.status === 404) {
        setProfile(null);
      } else {
        setError(err.message || 'Failed to load developer profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const res = await getMyTasks();
      if (res?.success) {
        setTasksData({
          tasks: res.data || [],
          summary: res.summary || { total: 0, completed: 0, overdue: 0, totalHours: 0 },
        });
      }
    } catch (err) {
      console.warn('Unable to load developer tasks:', err.message);
    } finally {
      setLoadingTasks(false);
    }
  };

  const fetchStartups = async () => {
    setLoadingStartups(true);
    try {
      const res = await getMyStartups();
      if (res?.startups) {
        setStartups(res.startups);
        if (res.startups.length > 0) {
          try {
            localStorage.setItem('sprintfounders_active_startup', res.startups[0].id || res.startups[0]._id);
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn('Unable to load developer startups:', err.message);
    } finally {
      setLoadingStartups(false);
    }
  };

  const handleOpenWorkspace = (startupId) => {
    try {
      localStorage.setItem('sprintfounders_active_startup', startupId);
    } catch (e) {}
    navigate(`/developer/startups/${startupId}`);
  };

  useEffect(() => {
    fetchProfile();
    fetchTasks();
    fetchStartups();
  }, []);

  const completion = calculateProfileCompletion(user, profile);
  const availabilityInfo =
    (profile?.availability && AVAILABILITY_CONFIG[profile.availability]) ||
    AVAILABILITY_CONFIG.AVAILABLE;

  return (
    <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#11141C] p-6 sm:p-8 rounded-2xl border border-[#232735] shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Welcome, {user?.name || 'Developer'}
              </h1>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border bg-emerald-950/60 text-emerald-400 border-emerald-800/60">
                Developer Workspace
              </span>
              <span className="text-xs text-slate-600">•</span>
              <span className="text-xs text-slate-400">{user?.email}</span>
            </div>
          </div>

          <Link
            to="/developer/profile"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition"
          >
            <Edit3 className="w-4 h-4" />
            <span>{profile ? 'Edit Profile' : 'Complete Profile'}</span>
          </Link>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 flex items-center justify-between text-sm text-red-400">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchProfile}
              className="text-xs font-semibold text-red-300 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Profile Completion Section */}
        <div className="bg-[#11141C] p-6 sm:p-7 rounded-2xl border border-[#232735] shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Profile Completion</h2>
                <p className="text-xs text-slate-400">
                  {completion.isComplete
                    ? 'Your developer profile is fully completed and ready for matchmaking.'
                    : 'Complete your profile details to stand out to founders and teams.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-2xl font-black text-indigo-400">
                {completion.percentage}%
              </span>
            </div>
          </div>

          {/* Completion Progress Bar */}
          <div className="w-full bg-[#0B0D12] rounded-full h-3.5 overflow-hidden border border-[#232735]">
            <div
              className={`h-full transition-all duration-700 rounded-full ${
                completion.percentage === 100
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : 'bg-gradient-to-r from-indigo-500 to-violet-500'
              }`}
              style={{ width: `${completion.percentage}%` }}
            />
          </div>

          {/* Missing fields or 100% completion celebration */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#232735]">
            {completion.missingFields.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                <span className="font-semibold text-slate-300">Missing details:</span>
                {completion.missingFields.map((field) => (
                  <span
                    key={field}
                    className="px-2 py-0.5 rounded-md bg-amber-950/50 text-amber-300 border border-amber-800/50 font-medium"
                  >
                    {field}
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>All profile sections are 100% complete!</span>
              </div>
            )}

            <Link
              to="/developer/profile"
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition"
            >
              <span>{completion.isComplete ? 'Review details' : 'Complete Profile now'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MY STARTUPS (JOINED STARTUP WORKSPACES) */}
        {/* ========================================================================= */}
        <div className="bg-[#11141C] p-6 sm:p-7 rounded-2xl border border-[#232735] shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#232735] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">My Startups</h2>
                <p className="text-xs text-slate-400">
                  Startups you are actively collaborating with as an accepted department member
                </p>
              </div>
            </div>

            <Link
              to="/startups/discover"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] hover:text-white transition shadow-sm self-start sm:self-auto"
            >
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              <span>Discover Startups</span>
            </Link>
          </div>

          {loadingStartups ? (
            <div className="py-8 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
              <span>Loading your joined startups...</span>
            </div>
          ) : startups.length === 0 ? (
            <div className="py-8 px-4 text-center rounded-xl bg-[#171A24]/60 border border-dashed border-[#2A2F42] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/50 text-indigo-400 border border-indigo-800/40 flex items-center justify-center mx-auto">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">You haven't joined any startups yet.</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Discover startups looking for developers, submit join requests, and start collaborating once accepted.
                </p>
              </div>
              <div className="pt-1">
                <Link
                  to="/startups/discover"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Discover Startups</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {startups.map((startup) => {
                const sid = startup.id || startup._id;
                const deptName = startup.department?.name || startup.membership?.department?.name || 'General';
                const roleName = startup.membership?.departmentRole || startup.role || 'Developer';
                const teamSize = startup.teamSize || 2;
                const stage = STAGE_CONFIG[startup.stage] || {
                  label: startup.stage || 'MVP',
                  color: 'bg-indigo-950/60 text-indigo-400 border-indigo-800/60',
                };

                return (
                  <div
                    key={sid}
                    className="p-5 rounded-xl bg-[#171A24] border border-[#2A2F42] hover:border-indigo-500/50 transition-all flex flex-col justify-between space-y-4 shadow-sm group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition line-clamp-1">
                            {startup.name}
                          </h3>
                          <div className="flex items-center gap-1.5 pt-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${stage.color}`}>
                              {stage.label}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {startup.industry || 'Technology'}
                            </span>
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-indigo-950/60 border border-indigo-800/50 flex items-center justify-center text-sm shrink-0">
                          🌱
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed min-h-[2rem]">
                        {startup.tagline || startup.description || 'Active venture workspace.'}
                      </p>

                      {/* Department & Role Pills */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#232735] text-[11px]">
                        <div className="p-2 rounded-lg bg-[#11141C] border border-[#232735]">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                            Department
                          </span>
                          <span className="font-semibold text-emerald-400 truncate block">
                            {deptName}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-[#11141C] border border-[#232735]">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                            Team
                          </span>
                          <span className="font-semibold text-slate-200 truncate block">
                            {teamSize} members
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenWorkspace(sid)}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition cursor-pointer"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* MY EXECUTION INTELLIGENCE METRICS */}
        {/* ========================================================================= */}
        <div className="bg-[#11141C] p-6 sm:p-7 rounded-2xl border border-[#232735] shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center text-indigo-400">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">My Execution</h2>
                <p className="text-xs text-slate-400">
                  Your active sprint task workload, milestone delivery, and velocity tracking
                </p>
              </div>
            </div>
            <button
              onClick={fetchTasks}
              disabled={loadingTasks}
              className="p-2 rounded-xl border border-[#2A2F42] bg-[#171A24] text-slate-300 hover:bg-[#1E2330] hover:text-white transition disabled:opacity-50 text-xs flex items-center gap-1.5"
            >
              <Loader2 className={`w-3.5 h-3.5 ${loadingTasks ? 'animate-spin' : 'hidden'}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {/* Assigned Tasks */}
            <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Assigned Tasks
              </span>
              <div className="text-2xl font-black text-white">
                {tasksData.summary.total}
              </div>
              <span className="text-[10px] text-slate-500 block">Total backlog items</span>
            </div>

            {/* Completed Tasks */}
            <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Completed
              </span>
              <div className="text-2xl font-black text-emerald-400">
                {tasksData.summary.completed}
              </div>
              <span className="text-[10px] text-emerald-400/80 block">
                {tasksData.summary.total > 0
                  ? `${Math.round((tasksData.summary.completed / tasksData.summary.total) * 100)}% done`
                  : 'No tasks yet'}
              </span>
            </div>

            {/* Overdue Tasks */}
            <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Overdue
              </span>
              <div
                className={`text-2xl font-black ${
                  tasksData.summary.overdue > 0 ? 'text-red-400' : 'text-slate-300'
                }`}
              >
                {tasksData.summary.overdue}
              </div>
              <span
                className={`text-[10px] block ${
                  tasksData.summary.overdue > 0 ? 'text-red-400' : 'text-slate-500'
                }`}
              >
                {tasksData.summary.overdue > 0 ? 'Requires attention' : 'All on track'}
              </span>
            </div>

            {/* Estimated Workload */}
            <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Assigned Workload
              </span>
              <div className="text-2xl font-black text-indigo-400">
                {tasksData.summary.totalHours} <span className="text-xs font-semibold text-slate-400">hrs</span>
              </div>
              <span className="text-[10px] text-slate-500 block">Estimated capacity</span>
            </div>
          </div>
        </div>

        {/* Content Section: "Your Developer Profile" */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center bg-[#11141C] rounded-2xl border border-[#232735] shadow-xl">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
            <p className="text-sm text-slate-400 font-medium">Loading your profile...</p>
          </div>
        ) : !profile ? (
          /* Empty State */
          <div className="py-14 px-6 bg-[#11141C] rounded-2xl border border-dashed border-[#2A2F42] shadow-xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-950/60 border border-indigo-800/40 text-indigo-400 flex items-center justify-center mx-auto mb-4">
              <Code2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              No developer profile created yet
            </h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
              Create your developer profile to showcase your tech stack, experience, and availability for team matchmaking and startup discovery.
            </p>
            <Link
              to="/developer/profile"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition"
            >
              <UserCheck className="w-4 h-4" />
              <span>Create Developer Profile</span>
            </Link>
          </div>
        ) : (
          /* Profile Details Card */
          <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#232735]">
              <div>
                <h2 className="text-lg font-bold text-white">Your Developer Profile</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visible to verified founders and collaborators
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${availabilityInfo.badge}`}
                >
                  <span className={`w-2 h-2 rounded-full ${availabilityInfo.dot}`} />
                  {availabilityInfo.label}
                </span>
                <Link
                  to="/developer/profile"
                  className="p-2 rounded-xl border border-[#2A2F42] bg-[#171A24] text-slate-300 hover:bg-[#1E2330] hover:text-white transition"
                  title="Edit profile"
                >
                  <Edit3 className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Bio */}
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                About / Bio
              </h3>
              {profile.bio ? (
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-[#171A24] p-4 rounded-xl border border-[#2A2F42]">
                  {profile.bio}
                </p>
              ) : (
                <p className="text-xs text-slate-500 italic">No bio provided yet.</p>
              )}
            </div>

            {/* Experience & Availability Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42]">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                  <span>Experience Level</span>
                </div>
                <div className="text-sm font-semibold text-white">
                  {profile.experience || 'Not specified'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42]">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Current Availability</span>
                </div>
                <div className="text-sm font-semibold text-white">
                  {availabilityInfo.label}
                </div>
              </div>
            </div>

            {/* Skills */}
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                Technical Skills ({profile.skills?.length || 0})
              </h3>
              {profile.skills && profile.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-950/60 text-indigo-300 border border-indigo-800/40"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No skills listed yet.</p>
              )}
            </div>

            {/* Social / Portfolio Links */}
            {(profile.github || profile.linkedin || profile.portfolio) && (
              <div className="pt-4 border-t border-[#232735]">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  External Profiles
                </h3>
                <div className="flex flex-wrap gap-3">
                  {profile.github && (
                    <a
                      href={profile.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-[#171A24] hover:bg-[#1E2330] hover:text-white border border-[#2A2F42] transition"
                    >
                      <GithubIcon className="w-4 h-4 text-slate-300" />
                      <span>GitHub</span>
                    </a>
                  )}
                  {profile.linkedin && (
                    <a
                      href={profile.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-blue-400 bg-[#171A24] hover:bg-[#1E2330] hover:text-blue-300 border border-[#2A2F42] transition"
                    >
                      <LinkedinIcon className="w-4 h-4 text-blue-400" />
                      <span>LinkedIn</span>
                    </a>
                  )}
                  {profile.portfolio && (
                    <a
                      href={profile.portfolio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-400 bg-[#171A24] hover:bg-[#1E2330] hover:text-emerald-300 border border-[#2A2F42] transition"
                    >
                      <Globe className="w-4 h-4 text-emerald-400" />
                      <span>Portfolio</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Phase 5 Step 2: Discover Startups & Team Matching */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-[#11141C] to-purple-950/30 border border-indigo-900/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 shadow-xl">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/20 border border-indigo-400/20">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-white">
                  Discover Startups & Join Teams
                </h4>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-lg leading-relaxed">
                Browse venture problem statements, explore technical stacks, and submit join requests with your developer profile.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center shrink-0">
            <Link
              to="/startups/discover"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Discover Startups</span>
            </Link>
            <Link
              to="/developer/requests"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] hover:text-white transition"
            >
              <span>My Requests</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperDashboard;
