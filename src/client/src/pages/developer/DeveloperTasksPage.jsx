import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStartupById } from '../../api/startups';
import { getStartupTasks, updateTask } from '../../api/tasks';
import { getStartupDepartments } from '../../api/departments';
import { useAuth } from '../../context/AuthContext';
import DeveloperWorkspaceHeader from '../../components/developer/DeveloperWorkspaceHeader';
import {
  SquareCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Filter,
  User,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Layers,
} from 'lucide-react';

const COLUMNS = [
  { id: 'TODO', label: 'To Do', color: 'border-slate-700 bg-slate-900/30' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'border-sky-800/40 bg-sky-950/20' },
  { id: 'BLOCKED', label: 'Blocked', color: 'border-rose-800/40 bg-rose-950/20' },
  { id: 'DONE', label: 'Done', color: 'border-emerald-800/40 bg-emerald-950/20' },
];

const PRIORITY_BADGES = {
  CRITICAL: 'bg-rose-950/80 text-rose-300 border-rose-800/80',
  HIGH: 'bg-rose-950/60 text-rose-400 border-rose-800/60',
  MEDIUM: 'bg-amber-950/60 text-amber-400 border-amber-800/60',
  LOW: 'bg-slate-800 text-slate-300 border-slate-700',
};

const DeveloperTasksPage = () => {
  const { startupId } = useParams();
  const { user } = useAuth();
  const currentUserId = (user?.userId || user?.id || user?._id)?.toString();

  const [startup, setStartup] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [taskFilter, setTaskFilter] = useState('MY_TASKS'); // 'MY_TASKS' | 'ALL'
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [actionFeedback, setActionFeedback] = useState('');

  const getAssigneeId = (assignedTo) => {
    if (!assignedTo) return '';
    if (typeof assignedTo === 'string') return assignedTo;
    if (assignedTo._id) return assignedTo._id.toString();
    if (assignedTo.id) return assignedTo.id.toString();
    return '';
  };

  const loadTasks = async (filterMode) => {
    setLoading(true);
    try {
      const viewParam = filterMode === 'MY_TASKS' ? 'my' : 'all';
      const [sRes, tRes, dRes] = await Promise.all([
        getStartupById(startupId),
        getStartupTasks(startupId, { view: viewParam }),
        getStartupDepartments(startupId).catch(() => ({ departments: [] })),
      ]);

      setStartup(sRes.startup);
      setTasks(tRes.data || tRes.tasks || []);
      setDepartments(dRes.departments || []);
      try {
        localStorage.setItem('sprintfounders_active_startup', startupId);
      } catch (e) {}
    } catch (err) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startupId) {
      loadTasks(taskFilter);
    }
  }, [startupId, taskFilter]);

  const handleStatusChange = async (taskId, newStatus) => {
    setUpdatingTaskId(taskId);
    setActionFeedback('');
    try {
      const res = await updateTask(taskId, { status: newStatus });
      if (res?.success) {
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId || t.id === taskId ? { ...t, status: newStatus } : t))
        );
        setActionFeedback(`Task moved to ${newStatus.replace('_', ' ')}.`);
        setTimeout(() => setActionFeedback(''), 3500);
      }
    } catch (err) {
      alert(err.message || 'Failed to update task status');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-[#0B0D12]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm text-slate-400 font-medium">Loading task Kanban board...</p>
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
          <h2 className="text-xl font-bold text-white">Startup Tasks Unavailable</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            {error || 'Unable to access tasks for this startup.'}
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

  // Filter tasks: in ALL view, apply optional department filter
  const displayedTasks = tasks.filter((t) => {
    if (taskFilter === 'MY_TASKS') return true; // Already filtered by backend view=my
    if (departmentFilter === 'ALL') return true;

    const deptId = t.derivedDepartment?._id || t.derivedDepartment?.id;
    const deptName = t.derivedDepartment?.name;
    return deptId === departmentFilter || deptName === departmentFilter;
  });

  return (
    <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Startup Context & Tool Navigation Header */}
        <DeveloperWorkspaceHeader
          startup={startup}
          activeToolId="tasks"
          activeToolLabel="My Tasks"
        />

        {/* Action Controls & Filter Toggle */}
        <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-5 shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-800/60 flex items-center justify-center">
              <SquareCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Kanban Task Board
              </h2>
              <p className="text-xs text-slate-400">
                {taskFilter === 'MY_TASKS'
                  ? 'Showing tasks assigned directly to you.'
                  : 'Showing startup-wide deliverables across all team members.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Department Filter (Only active in ALL TASKS view) */}
            {taskFilter === 'ALL' && departments.length > 0 && (
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="bg-[#171A24] text-xs text-slate-200 rounded-xl px-3 py-1.5 border border-[#2A2F42] hover:border-[#373E54] focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                >
                  <option value="ALL">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept._id || dept.id} value={dept._id || dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter Toggle: MY TASKS vs ALL TASKS */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#171A24] border border-[#2A2F42]">
              <button
                type="button"
                onClick={() => setTaskFilter('MY_TASKS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  taskFilter === 'MY_TASKS'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                MY TASKS
              </button>
              <button
                type="button"
                onClick={() => setTaskFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  taskFilter === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ALL TASKS
              </button>
            </div>
          </div>
        </div>

        {/* Feedback message */}
        {actionFeedback && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* 4 Kanban Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {COLUMNS.map((col) => {
            const colTasks = displayedTasks.filter((t) => t.status === col.id);

            return (
              <div
                key={col.id}
                className="bg-[#11141C] rounded-2xl border border-[#232735] flex flex-col min-h-[500px] shadow-xl overflow-hidden"
              >
                {/* Column Header */}
                <div className="p-4 border-b border-[#232735] flex items-center justify-between bg-[#171A24]/40">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      {col.label}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#11141C] text-slate-300 border border-[#2A2F42]">
                      {colTasks.length}
                    </span>
                  </div>
                </div>

                {/* Column Body */}
                <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[650px] scrollbar-thin">
                  {colTasks.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-[#232735] rounded-xl my-4">
                      No tasks in {col.label}
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const taskId = task._id || task.id;
                      const priority = task.priority || 'MEDIUM';
                      const priorityClass = PRIORITY_BADGES[priority] || PRIORITY_BADGES.MEDIUM;
                      const isMine = getAssigneeId(task.assignedTo) === currentUserId;
                      const isUpdating = updatingTaskId === taskId;

                      return (
                        <div
                          key={taskId}
                          className="bg-[#171A24] rounded-xl border border-[#2A2F42] hover:border-[#373E54] p-4 shadow-sm space-y-3 transition group"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${priorityClass}`}
                              >
                                {priority}
                              </span>

                              {task.derivedDepartment?.name && (
                                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-indigo-950/70 text-indigo-300 border border-indigo-800/50 uppercase tracking-wider">
                                  {task.derivedDepartment.name}
                                </span>
                              )}

                              {task.day && (
                                <span className="text-[10px] text-slate-400 font-medium">
                                  Day {task.day}
                                </span>
                              )}
                            </div>

                            <h4 className="text-xs font-bold text-white leading-snug group-hover:text-indigo-300 transition">
                              {task.title}
                            </h4>

                            {task.description && (
                              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                                {task.description}
                              </p>
                            )}
                          </div>

                          {/* Assignee & Status */}
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-[#232735]">
                            <div className="flex items-center gap-1.5 truncate">
                              <User className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="truncate max-w-[110px]">
                                {task.assignedTo?.name || (isMine ? 'You' : 'Unassigned')}
                              </span>
                            </div>

                            {isMine && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-950/80 text-indigo-300 font-bold border border-indigo-800/40 shrink-0">
                                Mine
                              </span>
                            )}
                          </div>

                          {/* Quick Status Shift Buttons */}
                          <div className="pt-2 border-t border-[#232735]/80 flex items-center justify-between gap-1.5">
                            <span className="text-[10px] text-slate-500 font-medium">Move:</span>
                            <div className="flex items-center gap-1">
                              {COLUMNS.filter((c) => c.id !== task.status).map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleStatusChange(taskId, c.id)}
                                  className="text-[10px] px-2 py-0.5 rounded bg-[#11141C] border border-[#232735] hover:border-indigo-500/50 hover:text-white text-slate-400 transition cursor-pointer disabled:opacity-50"
                                >
                                  {c.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DeveloperTasksPage;
