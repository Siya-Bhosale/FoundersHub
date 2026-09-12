import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getStartupById } from '../../api/startups';
import { getStartupTeam } from '../../api/team';
import { getStartupDepartments } from '../../api/departments';
import {
  getStartupTasks,
  createStartupTask,
  updateTask,
  generateAiTasks,
  createBatchTasks,
} from '../../api/tasks';
import StartupHeader from '../../components/common/StartupHeader';
import {
  Sparkles,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Check,
  ChevronRight,
  Filter,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Layers,
  X,
} from 'lucide-react';

const PRIORITY_BADGES = {
  CRITICAL: 'bg-rose-950/60 text-rose-400 border-rose-800/60',
  HIGH: 'bg-amber-950/60 text-amber-400 border-amber-800/60',
  MEDIUM: 'bg-indigo-950/60 text-indigo-400 border-indigo-800/60',
  LOW: 'bg-slate-800/80 text-slate-400 border-slate-700/60',
};

const COLUMNS = [
  { id: 'TODO', label: 'To Do', color: 'border-slate-700/80 text-slate-300', headerBg: 'bg-slate-900/50' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'border-indigo-700/80 text-indigo-300', headerBg: 'bg-indigo-950/30' },
  { id: 'BLOCKED', label: 'Blocked', color: 'border-amber-700/80 text-amber-300', headerBg: 'bg-amber-950/30' },
  { id: 'DONE', label: 'Done', color: 'border-emerald-700/80 text-emerald-300', headerBg: 'bg-emerald-950/30' },
];

const TasksPage = () => {
  const { startupId } = useParams();
  const { user } = useAuth();

  const [startup, setStartup] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // AI Task Generation state
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiGeneratedTasks, setAiGeneratedTasks] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [addingBatch, setAddingBatch] = useState(false);
  const [addedTaskIndices, setAddedTaskIndices] = useState(new Set());

  // Manual Task Creation state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    day: 1,
    estimatedHours: 3,
    department: '',
    assignedTo: '',
  });

  // Filter state
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  const userRole = user?.role?.toUpperCase();
  const currentUserId = (user?.id || user?.userId || user?._id)?.toString();

  const getAssigneeId = (assignedTo) => {
    if (!assignedTo) return '';
    if (typeof assignedTo === 'string') return assignedTo;
    if (assignedTo._id) return assignedTo._id.toString();
    if (assignedTo.id) return assignedTo.id.toString();
    return '';
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [sRes, tRes, tmRes, dRes] = await Promise.all([
        getStartupById(startupId),
        getStartupTasks(startupId),
        getStartupTeam(startupId).catch(() => ({ members: [] })),
        getStartupDepartments(startupId).catch(() => ({ departments: [] })),
      ]);

      setStartup(sRes.startup);
      setTasks(tRes.data || tRes.tasks || []);
      setTeamMembers(tmRes.members || []);
      setDepartments(dRes.departments || []);
      try {
        localStorage.setItem('sprintfounders_active_startup', startupId);
      } catch (e) {}
    } catch (err) {
      console.error('Failed to load tasks data:', err);
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startupId) {
      loadData();
    }
  }, [startupId]);

  // Handle AI Task Generation
  const handleGenerateAiTasks = async () => {
    if (generatingAi) return;
    setGeneratingAi(true);
    setError('');
    setSuccess('');
    try {
      const res = await generateAiTasks(startupId);
      if (res?.data?.tasks && res.data.tasks.length > 0) {
        setAiGeneratedTasks(res.data.tasks);
        setAddedTaskIndices(new Set());
        setIsPreviewModalOpen(true);
      } else {
        setError('Unable to generate tasks right now. Please try again.');
      }
    } catch (err) {
      console.error('AI Task Generation Error:', err);
      setError(err.message || 'Failed to generate AI tasks');
    } finally {
      setGeneratingAi(false);
    }
  };

  // Add all reviewed AI tasks to Kanban
  const handleAddAllAiTasks = async () => {
    if (!aiGeneratedTasks || addingBatch) return;
    setAddingBatch(true);
    setError('');
    try {
      // Prepare payload
      const payload = aiGeneratedTasks
        .filter((_, idx) => !addedTaskIndices.has(idx))
        .map((t) => ({
          title: t.title,
          description: t.description,
          priority: t.priority,
          day: t.day || 1,
          estimatedHours: t.estimatedHours || 3,
          assignedTo: t.suggestedDeveloperId || null,
        }));

      if (payload.length === 0) {
        setIsPreviewModalOpen(false);
        return;
      }

      const res = await createBatchTasks(startupId, payload);
      if (res?.success) {
        setSuccess(`Added ${res.count} AI-generated tasks to your Kanban board!`);
        setIsPreviewModalOpen(false);
        setAiGeneratedTasks(null);
        await loadData();
      }
    } catch (err) {
      console.error('Batch creation error:', err);
      setError(err.message || 'Failed to add AI tasks');
    } finally {
      setAddingBatch(false);
    }
  };

  // Add a single AI task individually
  const handleAddSingleAiTask = async (task, index) => {
    try {
      const res = await createStartupTask(startupId, {
        title: task.title,
        description: task.description,
        priority: task.priority,
        day: task.day || 1,
        estimatedHours: task.estimatedHours || 3,
        assignedTo: task.suggestedDeveloperId || null,
      });

      if (res?.data) {
        setAddedTaskIndices((prev) => new Set([...prev, index]));
        await loadData();
      }
    } catch (err) {
      alert(err.message || 'Failed to add task');
    }
  };

  // Handle Manual Task Creation
  const handleCreateManualTask = async (e) => {
    e.preventDefault();
    if (creatingTask) return;
    setCreatingTask(true);
    try {
      const res = await createStartupTask(startupId, {
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        priority: newTask.priority,
        day: Number(newTask.day) || 1,
        estimatedHours: Number(newTask.estimatedHours) || 2,
        department: newTask.department || null,
        assignedTo: newTask.assignedTo || null,
      });

      if (res?.data) {
        setIsCreateModalOpen(false);
        setNewTask({
          title: '',
          description: '',
          priority: 'MEDIUM',
          day: 1,
          estimatedHours: 3,
          department: '',
          assignedTo: '',
        });
        setSuccess('Task created successfully!');
        await loadData();
      }
    } catch (err) {
      alert(err.message || 'Failed to create task');
    } finally {
      setCreatingTask(false);
    }
  };

  // Update Task Status
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => ((t.id || t._id) === taskId ? { ...t, status: newStatus } : t))
      );

      await updateTask(taskId, { status: newStatus });
    } catch (err) {
      console.error('Failed to update task status:', err);
      // Revert
      await loadData();
    }
  };

  // Handle Task Reassignment from Kanban Card
  const handleAssigneeChange = async (taskId, newAssigneeId) => {
    try {
      const targetMember = teamMembers.find(
        (m) => (m.user?._id || m.user?.id)?.toString() === newAssigneeId
      );
      const assignedObj = targetMember?.user
        ? {
            _id: targetMember.user._id || targetMember.user.id,
            id: targetMember.user._id || targetMember.user.id,
            name: targetMember.user.name,
            email: targetMember.user.email,
            role: targetMember.user.role,
          }
        : null;

      // Optimistic update
      setTasks((prev) =>
        prev.map((t) =>
          ((t.id || t._id) === taskId ? { ...t, assignedTo: assignedObj } : t)
        )
      );

      const res = await updateTask(taskId, {
        assignedTo: newAssigneeId || null,
      });

      if (res?.success) {
        setSuccess(
          targetMember?.user?.name
            ? `Task assigned to ${targetMember.user.name}`
            : 'Task unassigned'
        );
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Failed to update task assignment:', err);
      setError(err.message || 'Failed to update task assignment');
      await loadData();
    }
  };

  // Metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'DONE').length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    if (departmentFilter !== 'ALL') {
      const tDeptId = (t.department?._id || t.department?.id || t.department || t.derivedDepartment?._id || t.derivedDepartment?.id)?.toString();
      if (tDeptId !== departmentFilter) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-[#0B0D12]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm text-slate-400 font-medium">Loading execution tasks...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Startup Context Header */}
        <StartupHeader
          startup={startup}
          toolName="Tasks & Kanban"
          toolDescription="Agile sprint board with AI task decomposition and team workload allocation."
          routePrefix="/tasks"
          actionButton={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGenerateAiTasks}
                disabled={generatingAi}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-60 shadow-lg shadow-indigo-600/20 transition"
              >
                {generatingAi ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AI Generating Tasks...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Tasks with AI</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] hover:text-white transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Task</span>
              </button>
            </div>
          }
        />

        {/* Action Feedback Messages */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-center justify-between text-xs text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{success}</span>
            </div>
            <button onClick={() => setSuccess('')} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Sprint Header & Progress Bar */}
        <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 tracking-wider">
                Active Sprint
              </span>
              <h2 className="text-lg font-extrabold text-white mt-1">
                MVP Launch Sprint
              </h2>
            </div>

            {/* Velocity & Completion Stats */}
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <div>
                <span>Completed: </span>
                <strong className="text-emerald-400 font-bold">{completedTasks}</strong>/{totalTasks} tasks
              </div>
              <div>
                <span>Progress: </span>
                <strong className="text-white font-bold">{progressPercent}%</strong>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[#171A24] h-2.5 rounded-full overflow-hidden border border-[#232735]">
            <div
              className="bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#232735] text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400 font-medium">Priority:</span>
                <div className="flex items-center gap-1.5">
                  {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriorityFilter(p)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                        priorityFilter === p
                          ? 'bg-indigo-600 text-white'
                          : 'bg-[#171A24] text-slate-400 hover:text-slate-200 border border-[#2A2F42]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {departments.length > 0 && (
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-400 font-medium">Department:</span>
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
            </div>

            <span className="text-slate-500 text-[11px]">
              Showing {filteredTasks.length} of {totalTasks} tasks
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4-COLUMN KANBAN BOARD */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);

            return (
              <div
                key={col.id}
                className="bg-[#11141C] rounded-2xl border border-[#232735] flex flex-col min-h-[500px] shadow-xl overflow-hidden"
              >
                {/* Column Header */}
                <div
                  className={`p-4 border-b border-[#232735] flex items-center justify-between ${col.headerBg}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      {col.label}
                    </h3>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#171A24] text-slate-300 border border-[#2A2F42]">
                    {colTasks.length}
                  </span>
                </div>

                {/* Task Cards Container */}
                <div className="p-3 flex-1 space-y-3 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="py-10 text-center text-slate-500 text-xs">
                      No tasks in this column
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const taskId = task.id || task._id;
                      const priorityBadge =
                        PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.MEDIUM;
                      const assignedUser = task.assignedTo;

                      return (
                        <div
                          key={taskId}
                          className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] hover:border-[#3B425A] transition shadow-sm space-y-3"
                        >
                          {/* Top: Priority & Hours */}
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${priorityBadge}`}
                            >
                              {task.priority}
                            </span>
                            <div className="flex items-center gap-1 text-[11px] text-slate-400">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{task.estimatedHours || 2}h</span>
                            </div>
                          </div>

                          {/* Title & Description */}
                          <div>
                            <h4 className="text-xs font-bold text-white leading-snug">
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                {task.description}
                              </p>
                            )}
                          </div>

                          {/* Footer: Assignee & Status Changer */}
                          <div className="pt-2 border-t border-[#232735] flex items-center justify-between gap-2 text-xs">
                            {/* Assigned Developer Selector */}
                            <div className="flex items-center gap-1.5 min-w-0 max-w-[55%]">
                              <div className="w-5 h-5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800 flex items-center justify-center shrink-0">
                                <User className="w-3 h-3" />
                              </div>
                              <select
                                value={getAssigneeId(task.assignedTo)}
                                onChange={(e) => handleAssigneeChange(taskId, e.target.value)}
                                className="w-full text-[10px] font-medium text-slate-300 bg-[#11141C] border border-[#2A2F42] rounded-md px-1.5 py-1 focus:outline-hidden focus:border-indigo-500 cursor-pointer truncate"
                                title="Assign to developer"
                              >
                                <option value="">Unassigned</option>
                                {teamMembers.map((m) => {
                                  const devUser = m.user;
                                  const devId = devUser?._id || devUser?.id;
                                  if (!devId) return null;
                                  return (
                                    <option key={devId} value={devId}>
                                      {devUser.name || 'Developer'}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>

                            {/* Status Changer Select */}
                            <select
                              value={task.status}
                              onChange={(e) => handleStatusChange(taskId, e.target.value)}
                              className="px-2 py-1 text-[10px] font-semibold text-slate-300 bg-[#11141C] border border-[#2A2F42] rounded-lg focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                            >
                              <option value="TODO">To Do</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="BLOCKED">Blocked</option>
                              <option value="DONE">Done</option>
                            </select>
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

        {/* ========================================================================= */}
        {/* AI GENERATED TASKS PREVIEW MODAL */}
        {/* ========================================================================= */}
        {isPreviewModalOpen && aiGeneratedTasks && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
            <div className="bg-[#11141C] max-w-2xl w-full rounded-2xl border border-[#232735] p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#232735] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-800/50 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">AI-Generated Execution Tasks</h3>
                    <p className="text-[11px] text-slate-400">
                      Grounded in your problem statement, solution, and team skill profile.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#171A24] transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tasks List */}
              <div className="overflow-y-auto space-y-3 flex-1 pr-1">
                {aiGeneratedTasks.map((t, idx) => {
                  const isAdded = addedTaskIndices.has(idx);
                  const pBadge = PRIORITY_BADGES[t.priority] || PRIORITY_BADGES.MEDIUM;

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border transition flex items-start justify-between gap-4 ${
                        isAdded
                          ? 'bg-emerald-950/20 border-emerald-800/40 opacity-75'
                          : 'bg-[#171A24] border-[#2A2F42] hover:border-[#373E54]'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${pBadge}`}
                          >
                            {t.priority}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {t.estimatedHours || 3} hours • Day {t.day || 1}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white">{t.title}</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {t.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px]">
                          <span className="text-slate-400">
                            Suggested Dev:{' '}
                            <strong className="text-indigo-400">
                              {t.suggestedDeveloperName || 'Unassigned'}
                            </strong>
                          </span>
                          {t.suggestedSkills?.length > 0 && (
                            <span className="text-slate-400">
                              Skills: [{t.suggestedSkills.join(', ')}]
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Add Button */}
                      <button
                        type="button"
                        disabled={isAdded}
                        onClick={() => handleAddSingleAiTask(t, idx)}
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                          isAdded
                            ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/50'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-[#232735]">
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] transition"
                >
                  Close
                </button>

                <button
                  type="button"
                  disabled={addingBatch || addedTaskIndices.size === aiGeneratedTasks.length}
                  onClick={handleAddAllAiTasks}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 shadow-lg shadow-indigo-600/20 transition"
                >
                  {addingBatch ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Adding to Kanban...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Add All Tasks to Kanban</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MANUAL CREATE TASK MODAL */}
        {/* ========================================================================= */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
            <div className="bg-[#11141C] max-w-md w-full rounded-2xl border border-[#232735] p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#232735] pb-3">
                <h3 className="text-base font-bold text-white">Create New Task</h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateManualTask} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="e.g. Build API endpoint for leaf scans"
                    className="w-full px-3.5 py-2 text-xs text-white bg-[#171A24] border border-[#2A2F42] rounded-xl focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Provide acceptance criteria or implementation details"
                    className="w-full px-3.5 py-2 text-xs text-white bg-[#171A24] border border-[#2A2F42] rounded-xl focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                      className="w-full px-2.5 py-2 text-xs text-white bg-[#171A24] border border-[#2A2F42] rounded-xl focus:outline-hidden focus:border-indigo-500"
                    >
                      <option value="CRITICAL">Critical</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Hours</label>
                    <input
                      type="number"
                      min={1}
                      max={40}
                      value={newTask.estimatedHours}
                      onChange={(e) => setNewTask({ ...newTask, estimatedHours: e.target.value })}
                      className="w-full px-2.5 py-2 text-xs text-white bg-[#171A24] border border-[#2A2F42] rounded-xl focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Day</label>
                    <input
                      type="number"
                      min={1}
                      max={14}
                      value={newTask.day}
                      onChange={(e) => setNewTask({ ...newTask, day: e.target.value })}
                      className="w-full px-2.5 py-2 text-xs text-white bg-[#171A24] border border-[#2A2F42] rounded-xl focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Department</label>
                  <select
                    value={newTask.department}
                    onChange={(e) => {
                      const dId = e.target.value;
                      setNewTask((prev) => {
                        let newAssignedTo = prev.assignedTo;
                        if (newAssignedTo && dId) {
                          const member = teamMembers.find(
                            (m) => (m.user?._id || m.user?.id)?.toString() === newAssignedTo
                          );
                          const memDept = (member?.department?._id || member?.department?.id || member?.department)?.toString();
                          if (memDept && memDept !== dId) {
                            newAssignedTo = '';
                          }
                        }
                        return { ...prev, department: dId, assignedTo: newAssignedTo };
                      });
                    }}
                    className="w-full px-3.5 py-2 text-xs text-white bg-[#171A24] border border-[#2A2F42] rounded-xl focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="">General / Unassigned Department</option>
                    {departments.map((dept) => (
                      <option key={dept._id || dept.id} value={dept._id || dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Assign Developer</label>
                  <select
                    value={newTask.assignedTo}
                    onChange={(e) => {
                      const devId = e.target.value;
                      const member = teamMembers.find((m) => (m.user?._id || m.user?.id)?.toString() === devId);
                      const memDeptId = (member?.department?._id || member?.department?.id || member?.department)?.toString();
                      setNewTask((prev) => ({
                        ...prev,
                        assignedTo: devId,
                        department: memDeptId || prev.department,
                      }));
                    }}
                    className="w-full px-3.5 py-2 text-xs text-white bg-[#171A24] border border-[#2A2F42] rounded-xl focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers
                      .filter((m) => {
                        if (!newTask.department) return true;
                        const memDeptId = (m.department?._id || m.department?.id || m.department)?.toString();
                        return !memDeptId || memDeptId === newTask.department;
                      })
                      .map((m) => {
                        const devUser = m.user;
                        const devId = devUser?._id || devUser?.id;
                        if (!devId) return null;
                        const deptName = m.department?.name || (departments.find((d) => (d._id || d.id)?.toString() === (m.department?._id || m.department)?.toString())?.name) || '';
                        return (
                          <option key={devId} value={devId}>
                            {devUser.name} {deptName ? `(${deptName})` : `(${m.role || 'Developer'})`}
                          </option>
                        );
                      })}
                  </select>
                  {newTask.department && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      Showing developers in selected department.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#232735]">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingTask}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 transition shadow-md shadow-indigo-600/20"
                  >
                    {creatingTask ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Task</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TasksPage;
