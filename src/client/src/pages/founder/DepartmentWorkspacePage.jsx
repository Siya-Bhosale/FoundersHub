import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getStartupById } from '../../api/startups';
import {
  getStartupDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
} from '../../api/departments';
import { updateMemberDepartment } from '../../api/team';
import StartupHeader from '../../components/common/StartupHeader';
import DeveloperWorkspaceHeader from '../../components/developer/DeveloperWorkspaceHeader';
import {
  Users,
  Code2,
  Palette,
  Megaphone,
  TrendingUp,
  BadgeDollarSign,
  Settings2,
  Boxes,
  Headphones,
  Cpu,
  Layers,
  ArrowLeft,
  Edit2,
  Trash2,
  FileText,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Briefcase,
  GraduationCap,
  Globe,
  XCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react';

const GithubIcon = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

const LinkedinIcon = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
  </svg>
);

export const getDepartmentIconComponent = (name) => {
  const n = (name || '').toLowerCase();
  if (n.includes('customer') || n.includes('support')) return Headphones;
  if (n.includes('design') || n.includes('ui') || n.includes('ux')) return Palette;
  if (n.includes('dev') || n.includes('engineer') || n.includes('code')) return Code2;
  if (n.includes('finance') || n.includes('account') || n.includes('capital')) return BadgeDollarSign;
  if (n.includes('market') || n.includes('growth')) return Megaphone;
  if (n.includes('operat') || n.includes('delivery')) return Settings2;
  if (n.includes('product')) return Boxes;
  if (n.includes('sale') || n.includes('revenue')) return TrendingUp;
  if (n.includes('tech')) return Cpu;
  return Layers;
};

const DepartmentWorkspacePage = () => {
  const { startupId, departmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [startup, setStartup] = useState(null);
  const [department, setDepartment] = useState(null);
  const [members, setMembers] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [selectedMemberProfile, setSelectedMemberProfile] = useState(null);
  const [viewingResumeUserId, setViewingResumeUserId] = useState(null);

  const isFounder = user?.role?.toUpperCase() === 'FOUNDER';
  const currentUserId = (user?.userId || user?.id || user?._id)?.toString();
  const isMemberOfThisDept = members.some(
    (m) => (m.user?._id || m.user?.id || m.user)?.toString() === currentUserId
  );
  const backRoute = isFounder ? `/team/${startupId}` : `/developer/startups/${startupId}/team`;

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [sRes, dRes, allDeptRes] = await Promise.all([
        getStartupById(startupId),
        getDepartmentById(startupId, departmentId),
        getStartupDepartments(startupId).catch(() => ({ departments: [] })),
      ]);

      setStartup(sRes.startup);
      setDepartment(dRes.department);
      setMembers(dRes.members || []);
      setAllDepartments(allDeptRes.departments || []);
      setEditForm({
        name: dRes.department.name,
        description: dRes.department.description || '',
      });
    } catch (err) {
      setError(err.message || 'Failed to load department workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startupId && departmentId) {
      loadData();
    }
  }, [startupId, departmentId]);

  const handleUpdateDepartment = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      setEditError('Department name is required');
      return;
    }
    try {
      setEditLoading(true);
      setEditError('');
      await updateDepartment(startupId, departmentId, {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
      });
      setIsEditModalOpen(false);
      setActionSuccess('Department updated successfully');
      loadData();
    } catch (err) {
      setEditError(err.message || 'Failed to update department');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteDepartment = async () => {
    try {
      setDeleteLoading(true);
      setDeleteError('');
      await deleteDepartment(startupId, departmentId);
      setIsDeleteModalOpen(false);
      navigate(backRoute);
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete department');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleMoveMember = async (membershipId, newDeptId) => {
    try {
      await updateMemberDepartment(startupId, membershipId, newDeptId || null);
      setActionSuccess('Member reassigned successfully');
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to move member');
    }
  };

  const handleViewResume = async (devUserId, originalName = 'Resume.pdf') => {
    if (!devUserId) return;
    try {
      setViewingResumeUserId(devUserId);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/developers/resume/${devUserId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Unauthorized: Cannot view resume');
      }

      const blob = await response.blob();
      const fileUrl = window.URL.createObjectURL(blob);
      window.open(fileUrl, '_blank');
    } catch (err) {
      alert(err.message || 'Could not access resume');
    } finally {
      setViewingResumeUserId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0D12] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  const DeptIcon = getDepartmentIconComponent(department?.name);

  return (
    <div className="min-h-screen bg-[#0B0D12] pb-16">
      {/* Top Header */}
      {isFounder ? (
        <StartupHeader startup={startup} />
      ) : (
        <DeveloperWorkspaceHeader startup={startup} />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to={backRoute}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to All Departments</span>
          </Link>
        </div>

        {/* Feedback Banners */}
        {actionSuccess && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess('')}
              className="text-emerald-400 hover:text-white"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-rose-400 hover:text-white">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ====================================================
            DEPARTMENT HERO CARD
            ==================================================== */}
        <div className="p-6 sm:p-8 rounded-2xl bg-[#11141C] border border-[#232735] shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-950/70 border border-indigo-800/60 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-950/40 shrink-0">
              <DeptIcon className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  {department?.name}
                </h1>

                {department?.isDefault ? (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 uppercase tracking-wide">
                    Default
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#1E2230] text-slate-300 border border-[#2A2F42] uppercase tracking-wide">
                    Custom
                  </span>
                )}

                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                  {members.length} {members.length === 1 ? 'Member' : 'Members'}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
                {department?.description ||
                  'No description provided. Dedicated workspace for this startup department.'}
              </p>
            </div>
          </div>

          {/* Actions: Team Chat & Founder Management */}
          <div className="flex flex-wrap items-center gap-2.5 self-stretch sm:self-auto justify-end shrink-0">
            {/* Open Team Chat Button */}
            {(isFounder || isMemberOfThisDept) && (
              <Link
                to={
                  isFounder
                    ? `/startups/${startupId}/chat/${departmentId}`
                    : `/developer/startups/${startupId}/chat`
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Open Team Chat</span>
              </Link>
            )}

            {/* Founder Management Actions */}
            {isFounder && (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-[#171A24] hover:bg-[#1E2230] border border-[#2A2F42] transition cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Edit</span>
                </button>

                {!department?.isDefault && (
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/40 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ====================================================
            MEMBERS LIST SECTION
            ==================================================== */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Department Members</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Showing active personnel in {department?.name}
            </span>
          </div>

          {members.length === 0 ? (
            <div className="p-12 rounded-2xl bg-[#11141C] border border-dashed border-[#232735] text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#171A24] border border-[#2A2F42] flex items-center justify-center text-slate-500 mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-300">
                No active members assigned to {department?.name} yet.
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Developers who apply to this department and get accepted by the founder will appear
                here automatically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {members.map((m) => {
                const devUser = m.user;
                const devProf = m.profile;
                const skills = devProf?.skills || [];
                const taskStats = m.taskStats || { active: 0, completed: 0, total: 0 };
                const membershipId = m._id || m.id;

                return (
                  <div
                    key={membershipId}
                    className="p-5 rounded-2xl bg-[#11141C] border border-[#232735] hover:border-[#373E54] shadow-md flex flex-col justify-between space-y-4 transition"
                  >
                    <div className="space-y-3.5">
                      {/* Member Info */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-indigo-950/70 border border-indigo-800/60 text-indigo-300 font-bold text-sm flex items-center justify-center shrink-0">
                            {devUser?.name ? devUser.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white truncate max-w-[150px]">
                              {devUser?.name || 'Developer'}
                            </h3>
                            <span className="text-xs text-indigo-400 font-semibold block">
                              {m.departmentRole || 'Developer'}
                            </span>
                          </div>
                        </div>

                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 uppercase shrink-0">
                          {m.role || 'DEVELOPER'}
                        </span>
                      </div>

                      {/* Technical Skills */}
                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {skills.slice(0, 4).map((s, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-[#171A24] text-slate-300 border border-[#2A2F42]"
                            >
                              {s}
                            </span>
                          ))}
                          {skills.length > 4 && (
                            <span className="text-[10px] text-slate-500 font-medium self-center">
                              +{skills.length - 4}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Task Summary */}
                      <div className="p-2.5 rounded-xl bg-[#171A24] border border-[#232735] flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">Tasks:</span>
                        <span className="text-slate-200 font-semibold flex items-center gap-2">
                          <span className="text-amber-400">{taskStats.active} active</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-emerald-400">{taskStats.completed} done</span>
                        </span>
                      </div>

                      {/* Social Links & Resume */}
                      <div className="flex items-center gap-3 pt-1 text-slate-400 text-xs">
                        {devProf?.github && (
                          <a
                            href={devProf.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-white transition"
                            title="GitHub"
                          >
                            <GithubIcon className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {devProf?.linkedin && (
                          <a
                            href={devProf.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-sky-400 transition"
                            title="LinkedIn"
                          >
                            <LinkedinIcon className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {devProf?.portfolio && (
                          <a
                            href={devProf.portfolio}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-indigo-400 transition"
                            title="Portfolio"
                          >
                            <Globe className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {devProf?.resumeFileName && (
                          <button
                            type="button"
                            disabled={viewingResumeUserId === devUser?._id}
                            onClick={() => handleViewResume(devUser?._id, devProf.resumeOriginalName)}
                            className="hover:text-indigo-400 transition cursor-pointer flex items-center gap-1"
                            title="View Resume"
                          >
                            <FileText className="w-3.5 h-3.5 text-rose-400" />
                            <span className="text-[11px] underline">Resume</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-3 border-t border-[#232735] space-y-2">
                      <button
                        type="button"
                        onClick={() => setSelectedMemberProfile(m)}
                        className="w-full py-1.5 rounded-lg text-xs font-semibold text-indigo-300 bg-[#171A24] hover:bg-indigo-950/40 border border-[#2A2F42] hover:border-indigo-800/40 transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>View Profile</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>

                      {/* Founder: Change Department Dropdown */}
                      {isFounder && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                            Move Department
                          </label>
                          <select
                            value={departmentId}
                            onChange={(e) => handleMoveMember(membershipId, e.target.value)}
                            className="w-full bg-[#171A24] text-xs text-slate-200 rounded-lg px-2.5 py-1.5 border border-[#2A2F42] hover:border-[#373E54] focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                          >
                            {allDepartments.map((d) => (
                              <option key={d._id || d.id} value={d._id || d.id}>
                                {d.name}
                              </option>
                            ))}
                            <option value="">Unassigned</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ====================================================
            MODAL: EDIT DEPARTMENT
            ==================================================== */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-[#11141C] rounded-2xl border border-[#232735] w-full max-w-md p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#232735] pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-indigo-400" />
                  <span>Edit Department</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {editError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-300">
                  {editError}
                </div>
              )}

              <form onSubmit={handleUpdateDepartment} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Department Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#171A24] border border-[#2A2F42] text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Description</label>
                  <textarea
                    rows={3}
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#171A24] border border-[#2A2F42] text-xs text-white focus:outline-none focus:border-indigo-500 transition resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-[#171A24] border border-[#2A2F42] transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition cursor-pointer shadow-md shadow-indigo-600/20"
                  >
                    {editLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ====================================================
            MODAL: DELETE DEPARTMENT
            ==================================================== */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-[#11141C] rounded-2xl border border-[#232735] w-full max-w-md p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-950/60 text-rose-400 border border-rose-800/60 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Delete "{department?.name}"?
                  </h3>
                  <p className="text-xs text-slate-400">
                    Are you sure you want to remove this department?
                  </p>
                </div>
              </div>

              {deleteError && (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
                  {deleteError}
                </div>
              )}

              {members.length > 0 ? (
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300 space-y-1">
                  <p className="font-semibold">Active Members Warning:</p>
                  <p>
                    This department has active members. Move the members to another department before deleting it.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  This custom department has 0 active members and can be deleted.
                </p>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-[#171A24] border border-[#2A2F42] transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteLoading || members.length > 0}
                  onClick={handleDeleteDepartment}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 transition cursor-pointer"
                >
                  {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            MODAL: DETAILED DEVELOPER PROFILE
            ==================================================== */}
        {selectedMemberProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-[#11141C] rounded-2xl border border-[#232735] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="flex items-start justify-between border-b border-[#232735] pb-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>{selectedMemberProfile.user?.name || 'Developer'}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60 uppercase">
                      {selectedMemberProfile.departmentRole || 'Developer'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">{selectedMemberProfile.user?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMemberProfile(null)}
                  className="text-slate-400 hover:text-white transition"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Bio */}
              {selectedMemberProfile.profile?.bio && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Professional Summary
                  </h4>
                  <p className="text-xs text-slate-200 leading-relaxed bg-[#171A24] p-3.5 rounded-xl border border-[#2A2F42]">
                    {selectedMemberProfile.profile.bio}
                  </p>
                </div>
              )}

              {/* Experience & Education */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedMemberProfile.profile?.experience && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Experience</span>
                    </h4>
                    <div className="text-xs text-slate-200 bg-[#171A24] p-3 rounded-xl border border-[#2A2F42]">
                      {selectedMemberProfile.profile.experience}
                    </div>
                  </div>
                )}

                {selectedMemberProfile.profile?.education && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Education</span>
                    </h4>
                    <div className="text-xs text-slate-200 bg-[#171A24] p-3 rounded-xl border border-[#2A2F42]">
                      {selectedMemberProfile.profile.education}
                    </div>
                  </div>
                )}
              </div>

              {/* Skills */}
              {selectedMemberProfile.profile?.skills?.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Technical Skills
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedMemberProfile.profile.skills.map((s, i) => (
                      <span
                        key={i}
                        className="text-xs font-medium px-2.5 py-1 rounded bg-[#171A24] text-slate-200 border border-[#2A2F42]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Profiles & Resume */}
              <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-3">
                <h4 className="text-xs font-semibold text-slate-300">Profiles & Resume</h4>
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  {selectedMemberProfile.profile?.github && (
                    <a
                      href={selectedMemberProfile.profile.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white transition"
                    >
                      <GithubIcon className="w-4 h-4" />
                      <span>GitHub</span>
                    </a>
                  )}
                  {selectedMemberProfile.profile?.linkedin && (
                    <a
                      href={selectedMemberProfile.profile.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-slate-300 hover:text-sky-400 transition"
                    >
                      <LinkedinIcon className="w-4 h-4" />
                      <span>LinkedIn</span>
                    </a>
                  )}
                  {selectedMemberProfile.profile?.portfolio && (
                    <a
                      href={selectedMemberProfile.profile.portfolio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-slate-300 hover:text-indigo-400 transition"
                    >
                      <Globe className="w-4 h-4" />
                      <span>Portfolio</span>
                    </a>
                  )}
                  {selectedMemberProfile.profile?.resumeFileName && (
                    <button
                      type="button"
                      disabled={viewingResumeUserId === selectedMemberProfile.user?._id}
                      onClick={() =>
                        handleViewResume(
                          selectedMemberProfile.user?._id,
                          selectedMemberProfile.profile.resumeOriginalName
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 hover:bg-indigo-900/60 transition cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-rose-400" />
                      <span>
                        View Resume ({selectedMemberProfile.profile.resumeOriginalName || 'Resume.pdf'})
                      </span>
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedMemberProfile(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-[#171A24] border border-[#2A2F42] transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentWorkspacePage;
