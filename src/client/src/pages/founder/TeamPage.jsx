import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStartupById } from '../../api/startups';
import { getStartupTeam, updateMemberDepartment } from '../../api/team';
import {
  getStartupDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../../api/departments';
import { getDepartmentIconComponent } from './DepartmentWorkspacePage';
import {
  getStartupJoinRequests,
  acceptJoinRequest,
  rejectJoinRequest,
} from '../../api/joinRequests';
import StartupHeader from '../../components/common/StartupHeader';
import {
  Users,
  UserPlus,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Briefcase,
  Code2,
  Globe,
  User,
  SquareCheck,
  Plus,
  Edit2,
  Trash2,
  FileText,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  Layers,
  ArrowRight,
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

const TeamPage = () => {
  const { startupId } = useParams();
  const [startup, setStartup] = useState(null);
  const [team, setTeam] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [processingId, setProcessingId] = useState(null);

  // Modals state
  const [isAddDeptModalOpen, setIsAddDeptModalOpen] = useState(false);
  const [isEditDeptModalOpen, setIsEditDeptModalOpen] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: '', description: '' });
  const [editingDeptId, setEditingDeptId] = useState(null);
  const [deptModalLoading, setDeptModalLoading] = useState(false);
  const [deptModalError, setDeptModalError] = useState('');

  // Delete confirmation modal state
  const [deleteConfirmDept, setDeleteConfirmDept] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Application detail modal state
  const [selectedApplication, setSelectedApplication] = useState(null);

  // Resume viewing state
  const [viewingResumeUserId, setViewingResumeUserId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [sRes, tmRes, deptRes, jrRes] = await Promise.all([
        getStartupById(startupId),
        getStartupTeam(startupId).catch(() => ({ team: null, members: [] })),
        getStartupDepartments(startupId).catch(() => ({ departments: [] })),
        getStartupJoinRequests(startupId).catch(() => ({ requests: [] })),
      ]);

      setStartup(sRes.startup);
      setTeam(tmRes.team || tmRes);
      setDepartments(deptRes.departments || []);
      setJoinRequests(jrRes.requests || []);

      try {
        localStorage.setItem('sprintfounders_active_startup', startupId);
      } catch (e) {}
    } catch (err) {
      console.error('Failed to load team data:', err);
      setError(err.message || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startupId) loadData();
  }, [startupId]);

  // Open Add Department Modal
  const openAddDeptModal = () => {
    setDeptForm({ name: '', description: '' });
    setDeptModalError('');
    setIsAddDeptModalOpen(true);
  };

  // Open Edit Department Modal
  const openEditDeptModal = (dept) => {
    setEditingDeptId(dept._id || dept.id);
    setDeptForm({ name: dept.name, description: dept.description || '' });
    setDeptModalError('');
    setIsEditDeptModalOpen(true);
  };

  // Submit Add Department
  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    if (!deptForm.name.trim()) {
      setDeptModalError('Department name is required');
      return;
    }

    setDeptModalLoading(true);
    setDeptModalError('');
    try {
      const res = await createDepartment(startupId, {
        name: deptForm.name.trim(),
        description: deptForm.description.trim(),
      });
      if (res?.success) {
        setIsAddDeptModalOpen(false);
        setActionSuccess(`Department "${res.department.name}" created successfully!`);
        setTimeout(() => setActionSuccess(''), 4000);
        await loadData();
      }
    } catch (err) {
      setDeptModalError(err.message || 'Failed to create department');
    } finally {
      setDeptModalLoading(false);
    }
  };

  // Submit Edit Department
  const handleUpdateDepartment = async (e) => {
    e.preventDefault();
    if (!deptForm.name.trim()) {
      setDeptModalError('Department name is required');
      return;
    }

    setDeptModalLoading(true);
    setDeptModalError('');
    try {
      const res = await updateDepartment(startupId, editingDeptId, {
        name: deptForm.name.trim(),
        description: deptForm.description.trim(),
      });
      if (res?.success) {
        setIsEditDeptModalOpen(false);
        setActionSuccess(`Department "${res.department.name}" updated successfully!`);
        setTimeout(() => setActionSuccess(''), 4000);
        await loadData();
      }
    } catch (err) {
      setDeptModalError(err.message || 'Failed to update department');
    } finally {
      setDeptModalLoading(false);
    }
  };

  // Handle Delete Department
  const handleDeleteDeptClick = (dept) => {
    const deptId = dept._id || dept.id;
    if (dept.isDefault) {
      alert('Default departments cannot be deleted.');
      return;
    }
    const membersInDept = (team?.members || []).filter(
      (m) => (m.department?._id || m.department?.id || m.department) === deptId
    );

    if (membersInDept.length > 0) {
      alert('This department has active members. Move the members to another department before deleting it.');
      return;
    }

    setDeleteConfirmDept({
      id: deptId,
      name: dept.name,
      memberCount: membersInDept.length,
    });
  };

  const confirmDeleteDept = async (force = false) => {
    if (!deleteConfirmDept) return;
    setDeleteLoading(true);
    try {
      const res = await deleteDepartment(startupId, deleteConfirmDept.id, { force });
      if (res?.success) {
        setActionSuccess(`Department "${deleteConfirmDept.name}" deleted successfully.`);
        setTimeout(() => setActionSuccess(''), 4000);
        setDeleteConfirmDept(null);
        await loadData();
      }
    } catch (err) {
      alert(err.message || 'Failed to delete department');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Move member to another department
  const handleMoveMember = async (membershipId, newDeptId) => {
    try {
      const res = await updateMemberDepartment(startupId, membershipId, newDeptId || null);
      if (res?.success) {
        setActionSuccess('Member department updated successfully.');
        setTimeout(() => setActionSuccess(''), 3000);
        await loadData();
      }
    } catch (err) {
      alert(err.message || 'Failed to update member department');
    }
  };

  // Authenticated resume viewer
  const handleViewResume = async (userId, originalFileName) => {
    if (!userId) return;
    setViewingResumeUserId(userId);
    try {
      const token = localStorage.getItem('sprintfounders_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiUrl}/developers/resume/${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        alert(errJson.message || 'Failed to retrieve resume.');
        return;
      }

      const blob = await res.blob();
      const fileUrl = URL.createObjectURL(blob);
      window.open(fileUrl, '_blank');
    } catch (err) {
      console.error('Error viewing resume:', err);
      alert('Error opening resume file.');
    } finally {
      setViewingResumeUserId(null);
    }
  };

  // Accept join request
  const handleAccept = async (requestId) => {
    if (processingId) return;
    setProcessingId(requestId);
    setActionSuccess('');
    try {
      const res = await acceptJoinRequest(requestId);
      if (res?.success) {
        setActionSuccess('Developer joined the startup team successfully!');
        setTimeout(() => setActionSuccess(''), 4000);
        setSelectedApplication(null);
        await loadData();
      }
    } catch (err) {
      alert(err.message || 'Failed to accept join request');
    } finally {
      setProcessingId(null);
    }
  };

  // Reject join request
  const handleReject = async (requestId) => {
    if (processingId) return;
    setProcessingId(requestId);
    setActionSuccess('');
    try {
      const res = await rejectJoinRequest(requestId);
      if (res?.success) {
        setActionSuccess('Join request declined.');
        setTimeout(() => setActionSuccess(''), 4000);
        setSelectedApplication(null);
        await loadData();
      }
    } catch (err) {
      alert(err.message || 'Failed to reject join request');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-[#0B0D12]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm text-slate-400 font-medium">Loading startup team & departments...</p>
      </div>
    );
  }

  const pendingRequests = joinRequests.filter((r) => r.status === 'PENDING');
  const allMembers = team?.members || [];

  // Group active members by department
  const deptMembersMap = {};
  const unassignedMembers = [];

  departments.forEach((d) => {
    deptMembersMap[d._id || d.id] = [];
  });

  allMembers.forEach((m) => {
    const deptId = m.department?._id || m.department?.id;
    if (deptId && deptMembersMap[deptId]) {
      deptMembersMap[deptId].push(m);
    } else {
      unassignedMembers.push(m);
    }
  });

  return (
    <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <StartupHeader
          startup={startup}
          toolName="Team & Departments"
          toolDescription="Organize your startup members into dynamic departments, review developer applications, and assign positions."
          routePrefix="/team"
          actionButton={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openAddDeptModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Department</span>
              </button>
              <Link
                to={`/tasks/${startupId}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-[#171A24] hover:bg-[#1E2230] border border-[#2A2F42] transition"
              >
                <SquareCheck className="w-3.5 h-3.5" />
                <span>Tasks Kanban</span>
              </Link>
            </div>
          }
        />

        {actionSuccess && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center gap-2.5 text-xs text-emerald-300 shadow-md">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="font-medium">{actionSuccess}</span>
          </div>
        )}

        {/* ====================================================
            FEATURE 9 — FOUNDER APPLICATION REVIEW CARDS
            ==================================================== */}
        <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-[#232735] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-800/50 flex items-center justify-center">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight uppercase flex items-center gap-2">
                  <span>Incoming Developer Applications</span>
                  {pendingRequests.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                      {pendingRequests.length}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400">
                  Review applicant profiles, department requests, social links, and resumes before accepting.
                </p>
              </div>
            </div>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="p-8 rounded-xl bg-[#171A24]/60 border border-dashed border-[#232735] text-center space-y-2">
              <User className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-xs text-slate-400 font-medium">No pending developer applications at this time.</p>
              <p className="text-[11px] text-slate-500">
                Developers applying through Discovery will appear here with requested departments and resumes.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {pendingRequests.map((req) => {
                const dev = req.developer;
                const devProf = dev?.profile;
                const skillsList = devProf?.skills || dev?.skills || [];
                const isProcessing = processingId === (req.id || req._id);
                const reqDept = req.department;

                return (
                  <div
                    key={req.id || req._id}
                    className="p-5 rounded-xl bg-[#171A24] border border-[#2A2F42] hover:border-[#3E4560] transition shadow-md flex flex-col justify-between space-y-4 group"
                  >
                    <div className="space-y-3">
                      {/* Top row: Name & Department Requested */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition">
                            {dev?.name || 'Developer'}
                          </h4>
                          <div className="text-xs text-indigo-400 font-medium flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 shrink-0" />
                            <span>{req.requestedRole || 'Developer'}</span>
                          </div>
                          <span className="text-[11px] text-slate-400">{dev?.email}</span>
                        </div>

                        {/* Department Badge */}
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 uppercase tracking-wider shrink-0">
                          {reqDept?.name || 'Technical'}
                        </span>
                      </div>

                      {/* Skills */}
                      {skillsList.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {skillsList.slice(0, 5).map((skill, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#11141C] text-slate-300 border border-[#232735]"
                            >
                              {skill}
                            </span>
                          ))}
                          {skillsList.length > 5 && (
                            <span className="text-[10px] text-slate-500 font-medium self-center">
                              +{skillsList.length - 5} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Social Links */}
                      <div className="flex items-center gap-3 pt-1 text-xs">
                        {devProf?.github && (
                          <a
                            href={devProf.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition"
                          >
                            <GithubIcon className="w-3.5 h-3.5" />
                            <span>GitHub</span>
                          </a>
                        )}
                        {devProf?.linkedin && (
                          <a
                            href={devProf.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-slate-400 hover:text-sky-400 transition"
                          >
                            <LinkedinIcon className="w-3.5 h-3.5" />
                            <span>LinkedIn</span>
                          </a>
                        )}
                        {devProf?.portfolio && (
                          <a
                            href={devProf.portfolio}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-slate-400 hover:text-indigo-400 transition"
                          >
                            <Globe className="w-3.5 h-3.5" />
                            <span>Portfolio</span>
                          </a>
                        )}
                      </div>

                      {/* Resume Box */}
                      {devProf?.resumeFileName ? (
                        <div className="p-2.5 rounded-lg bg-[#11141C] border border-[#232735] flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                            <span className="text-xs text-slate-300 truncate font-medium">
                              {devProf.resumeOriginalName || 'Resume.pdf'}
                            </span>
                          </div>
                          <button
                            type="button"
                            disabled={viewingResumeUserId === dev._id}
                            onClick={() => handleViewResume(dev._id, devProf.resumeOriginalName)}
                            className="px-2.5 py-1 rounded text-[11px] font-semibold text-indigo-400 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800/40 transition cursor-pointer shrink-0"
                          >
                            {viewingResumeUserId === dev._id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              'View Resume'
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-lg bg-[#11141C]/40 border border-dashed border-[#232735] text-[11px] text-slate-500 italic">
                          No resume uploaded yet
                        </div>
                      )}

                      {/* Message from Developer */}
                      {req.message && (
                        <div className="p-3 rounded-lg bg-[#11141C] border border-[#232735] text-xs text-slate-300 leading-relaxed italic">
                          "{req.message}"
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 border-t border-[#232735] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedApplication(req)}
                        className="text-xs font-semibold text-slate-400 hover:text-indigo-300 transition cursor-pointer flex items-center gap-1"
                      >
                        <span>Full Application Profile</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleAccept(req.id || req._id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition cursor-pointer shadow-sm"
                        >
                          {isProcessing ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          <span>Accept</span>
                        </button>

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleReject(req.id || req._id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-400 bg-[#11141C] border border-rose-900/40 hover:bg-rose-950/30 transition cursor-pointer"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ====================================================
            FEATURE 1 & PART 1 — SELECT A DEPARTMENT (CARD GRID)
            ==================================================== */}
        <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#232735] pb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Select a Department
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Choose a department to enter its dedicated workspace.
              </p>
            </div>

            <button
              type="button"
              onClick={openAddDeptModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Department</span>
            </button>
          </div>

          {/* 3-column desktop / 2-column tablet / 1-column mobile grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {departments.map((dept) => {
              const deptId = dept._id || dept.id;
              const deptMembers = deptMembersMap[deptId] || [];
              const memberCount = dept.memberCount !== undefined ? dept.memberCount : deptMembers.length;
              const DeptCardIcon = getDepartmentIconComponent(dept.name);

              return (
                <Link
                  key={deptId}
                  to={`/startups/${startupId}/departments/${deptId}`}
                  className="group relative p-5 rounded-2xl bg-[#171A24] border border-[#2A2F42] hover:border-indigo-500/60 hover:bg-[#1C202C] transition-all duration-200 shadow-sm hover:shadow-indigo-500/10 hover:-translate-y-0.5 flex flex-col justify-between space-y-4 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-12 h-12 rounded-xl bg-indigo-950/60 border border-indigo-800/60 text-indigo-400 group-hover:text-indigo-300 group-hover:bg-indigo-900/60 transition flex items-center justify-center shrink-0">
                      <DeptCardIcon className="w-6 h-6" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      {dept.isDefault && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60 uppercase tracking-wide">
                          Default
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#11141C] text-emerald-400 border border-emerald-900/40">
                        {memberCount} {memberCount === 1 ? 'member' : 'members'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition">
                        {dept.name}
                      </h3>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                    </div>
                    {dept.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {dept.description}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ====================================================
            FEATURE 1, 2, 12, 13, 21 — DEPARTMENTS & TEAM ROSTER
            ==================================================== */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <span>Startup Departments & Members</span>
              </h2>
              <p className="text-xs text-slate-400">
                Organize developers into operational functional teams and track execution velocity.
              </p>
            </div>

            <button
              type="button"
              onClick={openAddDeptModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Department</span>
            </button>
          </div>

          {/* Department Sections */}
          <div className="space-y-6">
            {departments.map((dept) => {
              const deptId = dept._id || dept.id;
              const deptMembers = deptMembersMap[deptId] || [];

              return (
                <div
                  key={deptId}
                  className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 shadow-xl space-y-5"
                >
                  {/* Department Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#232735] pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-extrabold text-white tracking-tight">
                          {dept.name}
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#171A24] text-slate-300 border border-[#2A2F42]">
                          {deptMembers.length} {deptMembers.length === 1 ? 'member' : 'members'}
                        </span>
                      </div>
                      {dept.description && (
                        <p className="text-xs text-slate-400">{dept.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <Link
                        to={`/startups/${startupId}/departments/${deptId}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-300 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/40 transition cursor-pointer"
                        title="Enter dedicated department workspace"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Workspace</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => openEditDeptModal(dept)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-slate-300 bg-[#171A24] hover:bg-[#1E2230] border border-[#2A2F42] transition cursor-pointer"
                        title="Rename or update description"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteDeptClick(dept)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-rose-400 bg-[#171A24] hover:bg-rose-950/30 border border-rose-900/30 transition cursor-pointer"
                        title="Delete department"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Members Grid */}
                  {deptMembers.length === 0 ? (
                    <div className="p-6 rounded-xl bg-[#171A24]/40 border border-dashed border-[#232735] text-center text-xs text-slate-500">
                      No active members assigned to {dept.name} yet. Use the dropdown on a member card to move them here.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {deptMembers.map((m) => {
                        const devUser = m.user;
                        const devProf = m.profile;
                        const skills = devProf?.skills || [];
                        const taskStats = m.taskStats || { active: 0, completed: 0, total: 0 };
                        const membershipId = m._id || m.id;

                        return (
                          <div
                            key={membershipId}
                            className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] hover:border-[#373E54] shadow-sm space-y-3.5 flex flex-col justify-between transition"
                          >
                            <div className="space-y-2.5">
                              {/* Member Header */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-9 h-9 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-800/60 flex items-center justify-center font-bold text-xs shrink-0">
                                    {devUser?.name ? devUser.name.charAt(0).toUpperCase() : 'U'}
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-bold text-white truncate max-w-[140px]">
                                      {devUser?.name || 'Developer'}
                                    </h4>
                                    <span className="text-[11px] text-indigo-400 font-medium block">
                                      {m.departmentRole || 'Developer'}
                                    </span>
                                  </div>
                                </div>

                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 uppercase shrink-0">
                                  {m.role || 'DEVELOPER'}
                                </span>
                              </div>

                              {/* Skills */}
                              {skills.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {skills.slice(0, 3).map((s, idx) => (
                                    <span
                                      key={idx}
                                      className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[#11141C] text-slate-300 border border-[#232735]"
                                    >
                                      {s}
                                    </span>
                                  ))}
                                  {skills.length > 3 && (
                                    <span className="text-[9px] text-slate-500 font-medium self-center">
                                      +{skills.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Task Summary */}
                              <div className="p-2 rounded-lg bg-[#11141C] border border-[#232735] flex items-center justify-between text-[11px]">
                                <span className="text-slate-400 font-medium">Tasks:</span>
                                <span className="text-slate-200 font-semibold">
                                  <span className="text-amber-400">{taskStats.active} active</span> •{' '}
                                  <span className="text-emerald-400">{taskStats.completed} done</span>
                                </span>
                              </div>

                              {/* Social Links & Resume */}
                              <div className="flex items-center gap-2.5 pt-0.5 text-slate-400 text-xs">
                                {devProf?.github && (
                                  <a
                                    href={devProf.github}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-white transition"
                                    title="GitHub Profile"
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
                                    title="LinkedIn Profile"
                                  >
                                    <LinkedinIcon className="w-3.5 h-3.5" />
                                  </a>
                                )}
                                {devProf?.resumeFileName && (
                                  <button
                                    type="button"
                                    onClick={() => handleViewResume(devUser?._id || devUser?.id, devProf.resumeOriginalName)}
                                    className="hover:text-indigo-400 transition cursor-pointer"
                                    title="View Resume"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Move Department Select & View Profile */}
                            <div className="pt-2 border-t border-[#232735] space-y-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedApplication({
                                    developer: {
                                      _id: devUser?._id || devUser?.id,
                                      name: devUser?.name,
                                      email: devUser?.email,
                                      profile: devProf,
                                    },
                                    requestedRole: m.departmentRole || 'Developer',
                                    department: dept,
                                    isAcceptedMember: true,
                                  })
                                }
                                className="w-full py-1.5 rounded-lg text-xs font-semibold text-indigo-300 bg-[#11141C] hover:bg-indigo-950/40 border border-[#232735] hover:border-indigo-800/40 transition cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <span>View Profile</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>

                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                                  Change Department
                                </label>
                                <select
                                  value={deptId}
                                  onChange={(e) => handleMoveMember(membershipId, e.target.value)}
                                  className="w-full bg-[#11141C] text-xs text-slate-200 rounded-lg px-2.5 py-1.5 border border-[#2A2F42] hover:border-[#373E54] focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                                >
                                  {departments.map((d) => (
                                    <option key={d._id || d.id} value={d._id || d.id}>
                                      {d.name}
                                    </option>
                                  ))}
                                  <option value="">Unassigned</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Unassigned Members Section */}
            {unassignedMembers.length > 0 && (
              <div className="bg-[#11141C] rounded-2xl border border-amber-900/40 p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-[#232735] pb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                    <div>
                      <h3 className="text-base font-extrabold text-white tracking-tight">
                        Unassigned Members
                      </h3>
                      <p className="text-xs text-slate-400">
                        Members awaiting department assignment. Assign them to a department below.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-800/60">
                    {unassignedMembers.length} Members
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unassignedMembers.map((m) => {
                    const devUser = m.user;
                    const devProf = m.profile;
                    const membershipId = m._id || m.id;

                    return (
                      <div
                        key={membershipId}
                        className="p-4 rounded-xl bg-[#171A24] border border-amber-900/30 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{devUser?.name}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/60">
                            UNASSIGNED
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{devUser?.email}</p>

                        <div className="pt-2 border-t border-[#232735] space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                            Assign to Department
                          </label>
                          <select
                            value=""
                            onChange={(e) => handleMoveMember(membershipId, e.target.value)}
                            className="w-full bg-[#11141C] text-xs text-slate-200 rounded-lg px-2.5 py-1.5 border border-[#2A2F42] focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                          >
                            <option value="" disabled>
                              Select Department...
                            </option>
                            {departments.map((d) => (
                              <option key={d._id || d.id} value={d._id || d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ====================================================
            MODAL: ADD DEPARTMENT
            ==================================================== */}
        {isAddDeptModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-[#11141C] rounded-2xl border border-[#232735] w-full max-w-md p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#232735] pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-400" />
                  <span>Add New Department</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddDeptModalOpen(false)}
                  className="text-slate-400 hover:text-white transition"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {deptModalError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-300">
                  {deptModalError}
                </div>
              )}

              <form onSubmit={handleCreateDepartment} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Department Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Product, Mobile Engineering, Growth"
                    value={deptForm.name}
                    onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#171A24] border border-[#2A2F42] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Description <span className="text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Product planning, roadmap strategy, and user experience research..."
                    value={deptForm.description}
                    onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#171A24] border border-[#2A2F42] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsAddDeptModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-[#171A24] border border-[#2A2F42] transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={deptModalLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 shadow-md shadow-indigo-600/20 transition cursor-pointer"
                  >
                    {deptModalLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Create Department</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ====================================================
            MODAL: EDIT DEPARTMENT
            ==================================================== */}
        {isEditDeptModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-[#11141C] rounded-2xl border border-[#232735] w-full max-w-md p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#232735] pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-indigo-400" />
                  <span>Rename Department</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditDeptModalOpen(false)}
                  className="text-slate-400 hover:text-white transition"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {deptModalError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-300">
                  {deptModalError}
                </div>
              )}

              <form onSubmit={handleUpdateDepartment} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Department Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={deptForm.name}
                    onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#171A24] border border-[#2A2F42] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Description <span className="text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={deptForm.description}
                    onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#171A24] border border-[#2A2F42] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsEditDeptModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-[#171A24] border border-[#2A2F42] transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={deptModalLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 shadow-md shadow-indigo-600/20 transition cursor-pointer"
                  >
                    {deptModalLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ====================================================
            MODAL: DELETE DEPARTMENT CONFIRMATION
            ==================================================== */}
        {deleteConfirmDept && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-[#11141C] rounded-2xl border border-[#232735] w-full max-w-md p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-950/60 text-rose-400 border border-rose-800/60 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Delete "{deleteConfirmDept.name}"?
                  </h3>
                  <p className="text-xs text-slate-400">
                    Are you sure you want to remove this department?
                  </p>
                </div>
              </div>

              {deleteConfirmDept.memberCount > 0 ? (
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300 space-y-1">
                  <p className="font-semibold">Active Members Warning:</p>
                  <p>
                    This department currently has {deleteConfirmDept.memberCount} active member(s). Deleting it will reassign them to <strong>Unassigned</strong>.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  This department has 0 active members and can be deleted immediately.
                </p>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmDept(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-[#171A24] border border-[#2A2F42] transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={() => confirmDeleteDept(true)}
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
            MODAL: DETAILED APPLICATION PROFILE
            ==================================================== */}
        {selectedApplication && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-[#11141C] rounded-2xl border border-[#232735] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="flex items-start justify-between border-b border-[#232735] pb-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>{selectedApplication.developer?.name || 'Developer'}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60 uppercase">
                      {selectedApplication.requestedRole || 'Developer'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">{selectedApplication.developer?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedApplication(null)}
                  className="text-slate-400 hover:text-white transition"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Department requested */}
              <div className="p-3 rounded-xl bg-[#171A24] border border-[#2A2F42] flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Department Requested:</span>
                <span className="font-bold text-white bg-indigo-950/80 px-2.5 py-1 rounded border border-indigo-800/60">
                  {selectedApplication.department?.name || 'Technical'}
                </span>
              </div>

              {/* Bio */}
              {selectedApplication.developer?.profile?.bio && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Professional Summary
                  </h4>
                  <p className="text-xs text-slate-200 leading-relaxed bg-[#171A24] p-3.5 rounded-xl border border-[#2A2F42]">
                    {selectedApplication.developer.profile.bio}
                  </p>
                </div>
              )}

              {/* Experience & Education */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedApplication.developer?.profile?.experience && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Experience</span>
                    </h4>
                    <div className="text-xs text-slate-200 bg-[#171A24] p-3 rounded-xl border border-[#2A2F42]">
                      {selectedApplication.developer.profile.experience}
                    </div>
                  </div>
                )}

                {selectedApplication.developer?.profile?.education && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Education</span>
                    </h4>
                    <div className="text-xs text-slate-200 bg-[#171A24] p-3 rounded-xl border border-[#2A2F42]">
                      {selectedApplication.developer.profile.education}
                    </div>
                  </div>
                )}
              </div>

              {/* Skills */}
              {selectedApplication.developer?.profile?.skills?.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Technical Skills
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedApplication.developer.profile.skills.map((s, i) => (
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

              {/* Social Links & Resume */}
              <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-3">
                <h4 className="text-xs font-semibold text-slate-300">Profiles & Resume</h4>
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  {selectedApplication.developer?.profile?.github && (
                    <a
                      href={selectedApplication.developer.profile.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white transition"
                    >
                      <GithubIcon className="w-4 h-4" />
                      <span>GitHub</span>
                    </a>
                  )}
                  {selectedApplication.developer?.profile?.linkedin && (
                    <a
                      href={selectedApplication.developer.profile.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-slate-300 hover:text-sky-400 transition"
                    >
                      <LinkedinIcon className="w-4 h-4" />
                      <span>LinkedIn</span>
                    </a>
                  )}
                  {selectedApplication.developer?.profile?.portfolio && (
                    <a
                      href={selectedApplication.developer.profile.portfolio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-slate-300 hover:text-indigo-400 transition"
                    >
                      <Globe className="w-4 h-4" />
                      <span>Portfolio</span>
                    </a>
                  )}

                  {selectedApplication.developer?.profile?.resumeFileName && (
                    <button
                      type="button"
                      disabled={viewingResumeUserId === selectedApplication.developer._id}
                      onClick={() =>
                        handleViewResume(
                          selectedApplication.developer._id,
                          selectedApplication.developer.profile.resumeOriginalName
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 hover:bg-indigo-900/60 transition cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-rose-400" />
                      <span>
                        View Resume ({selectedApplication.developer.profile.resumeOriginalName || 'Resume.pdf'})
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Application Message */}
              {selectedApplication.message && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Message to Founder
                  </h4>
                  <p className="text-xs text-slate-300 italic bg-[#171A24] p-3.5 rounded-xl border border-[#2A2F42] leading-relaxed">
                    "{selectedApplication.message}"
                  </p>
                </div>
              )}

              {/* Bottom Actions */}
              <div className="pt-4 border-t border-[#232735] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedApplication(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-[#171A24] border border-[#2A2F42] transition"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={processingId === (selectedApplication.id || selectedApplication._id)}
                  onClick={() => handleReject(selectedApplication.id || selectedApplication._id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-rose-400 bg-[#171A24] border border-rose-900/40 hover:bg-rose-950/30 transition cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject Application</span>
                </button>
                <button
                  type="button"
                  disabled={processingId === (selectedApplication.id || selectedApplication._id)}
                  onClick={() => handleAccept(selectedApplication.id || selectedApplication._id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Accept into {selectedApplication.department?.name || 'Department'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamPage;
