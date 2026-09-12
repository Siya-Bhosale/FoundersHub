import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getStartupById, deleteStartup } from '../../api/startups';
import { getStartupTeam } from '../../api/team';
import { getStartupFundingInterests } from '../../api/fundingInterest';
import { getStartupExecutionScore } from '../../api/execution';
import { getFinanceSummary } from '../../api/finance';
import { getStartupTasks } from '../../api/tasks';
import {
  submitJoinRequest,
  getMyJoinRequests,
  getStartupJoinRequests,
  acceptJoinRequest,
  rejectJoinRequest,
} from '../../api/joinRequests';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Calendar,
  User,
  Tag,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldAlert,
  HelpCircle,
  Lightbulb,
  FileText,
  Sparkles,
  UserPlus,
  Users,
  Clock,
  Briefcase,
  DollarSign,
  Presentation,
  Bot,
  SquareCheck,
  ListChecks,
  Activity,
  Handshake,
  TrendingUp,
} from 'lucide-react';

const formatCurrency = (val) => {
  const num = Number(val) || 0;
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(0)}L`;
  return `₹${num.toLocaleString('en-IN')}`;
};

const STAGE_CONFIG = {
  IDEA: { label: 'Idea', color: 'bg-sky-950/60 text-sky-400 border-sky-800/60' },
  MVP: { label: 'MVP', color: 'bg-indigo-950/60 text-indigo-400 border-indigo-800/60' },
  EARLY_TRACTION: { label: 'Early Traction', color: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60' },
  GROWTH: { label: 'Growth', color: 'bg-amber-950/60 text-amber-400 border-amber-800/60' },
};

const StartupDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [startup, setStartup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(location.state?.message || '');

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Overview health metrics state
  const [teamCount, setTeamCount] = useState(1);
  const [teamMembers, setTeamMembers] = useState([]);
  const [fundingInterestsCount, setFundingInterestsCount] = useState(0);
  const [execScore, setExecScore] = useState(0);
  const [financeSummary, setFinanceSummary] = useState(null);
  const [tasksTotal, setTasksTotal] = useState(0);
  const [tasksDone, setTasksDone] = useState(0);

  // Founder Team Requests State
  const [joinRequests, setJoinRequests] = useState([]);
  const [processingRequestId, setProcessingRequestId] = useState(null);
  const [actionFeedback, setActionFeedback] = useState('');

  // Developer Join Request State
  const [developerJoinStatus, setDeveloperJoinStatus] = useState('NONE');
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [submittingJoin, setSubmittingJoin] = useState(false);
  const [joinModalError, setJoinModalError] = useState('');

  const currentUserId = (user?.id || user?.userId || user?._id)?.toString();
  const userRole = user?.role?.toUpperCase();

  const fetchStartupDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getStartupById(id);
      const s = data.startup;
      setStartup(s);
      try {
        localStorage.setItem('sprintfounders_active_startup', id);
      } catch (e) {}

      // Fetch overview summary signals in parallel
      const [teamRes, fiRes, scoreRes, finRes, tasksRes, jrRes] = await Promise.allSettled([
        getStartupTeam(id),
        getStartupFundingInterests(id),
        getStartupExecutionScore(id),
        getFinanceSummary(id),
        getStartupTasks(id),
        getStartupJoinRequests(id),
      ]);

      if (teamRes.status === 'fulfilled' && teamRes.value?.members) {
        const mems = teamRes.value.members || [];
        setTeamMembers(mems);
        setTeamCount(1 + mems.length);

        // If developer is in active team memberships, update their join status to ACCEPTED
        if (currentUserId && mems.some((m) => (m.user?.id || m.user?._id)?.toString() === currentUserId)) {
          setDeveloperJoinStatus('ACCEPTED');
        }
      }
      if (fiRes.status === 'fulfilled' && fiRes.value?.data) {
        setFundingInterestsCount(fiRes.value.data.length);
      }
      if (scoreRes.status === 'fulfilled') {
        const sc = scoreRes.value?.score ?? scoreRes.value?.data?.score ?? 0;
        setExecScore(sc);
      }
      if (finRes.status === 'fulfilled') {
        setFinanceSummary(finRes.value?.data ?? finRes.value ?? null);
      }
      if (tasksRes.status === 'fulfilled') {
        const tList = tasksRes.value?.data || tasksRes.value?.tasks || [];
        setTasksTotal(tList.length);
        setTasksDone(tList.filter((t) => t.status === 'DONE').length);
      }
      if (jrRes.status === 'fulfilled') {
        setJoinRequests(jrRes.value?.requests || jrRes.value?.data || []);
      }
    } catch (err) {
      setError(err.message || 'Startup not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStartupDetails();
  }, [id]);

  // Check Developer join request status if viewing as developer
  useEffect(() => {
    const checkDevStatus = async () => {
      if (userRole !== 'DEVELOPER') return;
      try {
        const res = await getMyJoinRequests();
        if (res?.success && Array.isArray(res.requests)) {
          const found = res.requests.find((r) => {
            const sId = (r.startup?.id || r.startup?._id || r.startup)?.toString();
            return sId === id;
          });
          if (found) {
            setDeveloperJoinStatus(found.status);
          } else if (developerJoinStatus !== 'ACCEPTED') {
            setDeveloperJoinStatus('NONE');
          }
        }
      } catch (e) {}
    };
    checkDevStatus();
  }, [id, userRole]);

  const rawFounderId = startup?.founder?._id || startup?.founder?.id || startup?.founder || startup?.founderId;
  const isOwner = Boolean(user && rawFounderId && currentUserId && currentUserId === rawFounderId?.toString());

  const handleAcceptRequest = async (requestId) => {
    if (processingRequestId) return;
    setProcessingRequestId(requestId);
    setActionFeedback('');
    try {
      const res = await acceptJoinRequest(requestId);
      if (res?.success) {
        setActionFeedback('Developer join request accepted! Developer is now on the team.');
        // Refresh details & requests directly from database
        await fetchStartupDetails();
      }
    } catch (err) {
      alert(err.message || 'Failed to accept request');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectRequest = async (requestId) => {
    if (processingRequestId) return;
    setProcessingRequestId(requestId);
    setActionFeedback('');
    try {
      const res = await rejectJoinRequest(requestId);
      if (res?.success) {
        setActionFeedback('Join request rejected.');
        // Refresh details & requests directly from database
        await fetchStartupDetails();
      }
    } catch (err) {
      alert(err.message || 'Failed to reject request');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteStartup(id);
      navigate('/dashboard', {
        state: { message: `"${startup.name}" was successfully deleted.` },
      });
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete startup');
      setDeleting(false);
    }
  };

  const handleSendJoinRequest = async (e) => {
    e.preventDefault();
    if (submittingJoin) return;
    setSubmittingJoin(true);
    setJoinModalError('');
    try {
      const res = await submitJoinRequest({
        startupId: id,
        message: joinMessage.trim(),
      });
      if (res?.success) {
        setIsJoinModalOpen(false);
        setDeveloperJoinStatus('PENDING');
        setSuccess('Join request submitted to founder.');
      }
    } catch (err) {
      setJoinModalError(err.message || 'Failed to submit join request');
    } finally {
      setSubmittingJoin(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-[#0B0D12]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm text-slate-400 font-medium">Loading startup command center...</p>
      </div>
    );
  }

  if (error || !startup) {
    return (
      <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-[#11141C] p-8 rounded-2xl border border-[#232735] shadow-xl text-center">
          <div className="w-12 h-12 rounded-xl bg-red-950/40 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-800/40">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Startup Not Found</h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            {error || 'The requested startup could not be located.'}
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  const stageInfo = STAGE_CONFIG[startup.stage] || {
    label: startup.stage,
    color: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  const progressPercent = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;
  const fundingGap = Math.max(0, (Number(startup.fundingRequired) || 0) - (Number(startup.fundingReceived) || 0));

  return (
    <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation & Header Actions */}
        <div className="flex items-center justify-between gap-4">
          <Link
            to={userRole === 'DEVELOPER' ? '/startups/discover' : '/dashboard'}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{userRole === 'DEVELOPER' ? 'Back to Discover' : 'Back to Dashboard'}</span>
          </Link>

          {isOwner && (
            <div className="flex items-center gap-2.5">
              <Link
                to={`/startups/${startup.id}/edit`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] hover:text-white transition shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                <span>Edit Startup</span>
              </Link>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                type="button"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400 bg-[#171A24] border border-rose-900/40 hover:bg-rose-950/30 transition shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Delete</span>
              </button>
            </div>
          )}

          {/* Developer Request to Join Button */}
          {userRole === 'DEVELOPER' && !isOwner && (
            <div>
              {developerJoinStatus === 'NONE' && (
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Request to Join</span>
                </button>
              )}
              {developerJoinStatus === 'PENDING' && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-950/50 text-amber-400 border border-amber-800/50">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Request Pending</span>
                </span>
              )}
              {developerJoinStatus === 'ACCEPTED' && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-950/50 text-emerald-400 border border-emerald-800/50">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>You are on the team.</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Feedback message */}
        {success && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-start gap-3 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        {/* Hero Card */}
        <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 sm:p-8 shadow-xl">
          <div className="flex flex-wrap items-center gap-2.5 mb-3">
            <span
              className={`text-xs font-bold px-3 py-0.5 rounded-full border uppercase tracking-wider ${stageInfo.color}`}
            >
              {stageInfo.label}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-300 bg-[#171A24] px-2.5 py-0.5 rounded-md border border-[#2A2F42]">
              <Tag className="w-3 h-3 text-slate-400" />
              {startup.industry}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
            {startup.name}
          </h1>
          <p className="text-base sm:text-lg font-medium text-indigo-400 mb-6">
            {startup.tagline}
          </p>

          <div className="pt-4 border-t border-[#232735] flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-400">
            {startup.founder && typeof startup.founder === 'object' && (
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Founder: <strong className="text-slate-200 font-semibold">{startup.founder.name}</strong> ({startup.founder.email})
                </span>
              </div>
            )}
            {startup.createdAt && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Founded {new Date(startup.createdAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* STARTUP HEALTH COMMAND CENTER */}
        {/* ========================================================================= */}
        <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#232735] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 tracking-wider">
                  Command Center
                </span>
                <span className="text-xs text-slate-400 font-medium">Real-Time Venture Signals</span>
              </div>
              <h2 className="text-xl font-extrabold text-white tracking-tight mt-1">
                Startup Health
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to={`/pitch/${startup.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition"
              >
                <Presentation className="w-3.5 h-3.5" />
                <span>Pitch Deck</span>
              </Link>
              <Link
                to={`/ai-mentor/${startup.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-200 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] hover:text-white transition"
              >
                <Bot className="w-3.5 h-3.5 text-indigo-400" />
                <span>AI Mentor</span>
              </Link>
            </div>
          </div>

          {/* 6 High-Level Health Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. Execution Score */}
            <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Execution</span>
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="text-xl font-extrabold text-white">
                {execScore}/100
              </div>
              <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                {execScore >= 75 ? 'EXCELLENT' : execScore >= 60 ? 'GOOD' : 'ATTENTION'}
              </div>
            </div>

            {/* 2. Finance Runway */}
            <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Runway</span>
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl font-extrabold text-white">
                {financeSummary?.runwayMonths ? `${financeSummary.runwayMonths.toFixed(1)} mo` : 'Pre-burn'}
              </div>
              <div className="text-[10px] font-semibold text-slate-400">
                {formatCurrency(financeSummary?.currentCash || 0)}
              </div>
            </div>

            {/* 3. Team Size */}
            <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Team</span>
                <Users className="w-3.5 h-3.5 text-sky-400" />
              </div>
              <div className="text-xl font-extrabold text-white">
                {teamCount}
              </div>
              <div className="text-[10px] font-semibold text-slate-400">
                {teamCount === 1 ? 'Solo Founder' : 'Active Members'}
              </div>
            </div>

            {/* 4. Funding Gap */}
            <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Funding Gap</span>
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-xl font-extrabold text-white">
                {formatCurrency(fundingGap)}
              </div>
              <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                Target Gap
              </div>
            </div>

            {/* 5. Investor Interest */}
            <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Investors</span>
                <Handshake className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="text-xl font-extrabold text-white">
                {fundingInterestsCount}
              </div>
              <div className="text-[10px] font-semibold text-indigo-400">
                {fundingInterestsCount === 1 ? 'Interest' : 'Interests'}
              </div>
            </div>

            {/* 6. Sprint Progress */}
            <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Sprint</span>
                <ListChecks className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl font-extrabold text-white">
                {progressPercent}%
              </div>
              <div className="text-[10px] font-semibold text-emerald-400">
                {tasksDone}/{tasksTotal} Done
              </div>
            </div>
          </div>

          {/* Quick Action Buttons Row (Navigates to Dedicated Tool Pages) */}
          <div className="space-y-2 pt-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Quick Actions (Open Dedicated Tool)
            </span>
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                to={`/tasks/${startup.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition"
              >
                <SquareCheck className="w-3.5 h-3.5" />
                <span>Tasks (Kanban)</span>
              </Link>

              <Link
                to={`/sprint-planner/${startup.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] hover:text-white transition shadow-sm"
              >
                <ListChecks className="w-3.5 h-3.5 text-indigo-400" />
                <span>Sprint Planner</span>
              </Link>

              <Link
                to={`/execution/${startup.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] hover:text-white transition shadow-sm"
              >
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                <span>Execution Intelligence</span>
              </Link>

              <Link
                to={`/risk-analysis/${startup.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] hover:text-white transition shadow-sm"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Risk Analysis</span>
              </Link>

              <Link
                to={`/finance/${startup.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] hover:text-white transition shadow-sm"
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>Finance</span>
              </Link>

              <Link
                to={`/ai-analyzer/${startup.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] hover:text-white transition shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                <span>Startup Analyzer</span>
              </Link>

              <Link
                to={`/pitch/${startup.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] hover:text-white transition shadow-sm"
              >
                <Presentation className="w-3.5 h-3.5 text-indigo-400" />
                <span>Pitch Deck</span>
              </Link>

              <Link
                to={`/ai-mentor/${startup.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] hover:text-white transition shadow-sm"
              >
                <Bot className="w-3.5 h-3.5 text-violet-400" />
                <span>AI Mentor</span>
              </Link>

              <Link
                to={`/team/${startup.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] hover:text-white transition shadow-sm"
              >
                <Users className="w-3.5 h-3.5 text-sky-400" />
                <span>Team</span>
              </Link>

              <Link
                to={`/funding-interest/${startup.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] hover:text-white transition shadow-sm"
              >
                <Handshake className="w-3.5 h-3.5 text-amber-400" />
                <span>Investor Interest</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Problem & Solution Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 shadow-xl space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-950/50 text-red-400 border border-red-800/40 flex items-center justify-center">
                <HelpCircle className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Problem Statement
              </h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
              {startup.problemStatement}
            </p>
          </div>

          <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 shadow-xl space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-950/50 text-emerald-400 border border-emerald-800/40 flex items-center justify-center">
                <Lightbulb className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Solution
              </h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
              {startup.solution}
            </p>
          </div>
        </div>

        {/* Detailed Overview */}
        {startup.description && (
          <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 sm:p-7 shadow-xl space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-950/50 text-indigo-400 border border-indigo-800/40 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Executive Overview
              </h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
              {startup.description}
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TEAM REQUESTS SECTION (FOUNDER VIEW) */}
        {/* ========================================================================= */}
        {isOwner && (
          <div id="team-requests" className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 sm:p-8 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#232735] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-800/50 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-white tracking-tight uppercase">
                    TEAM REQUESTS
                  </h2>
                  <p className="text-xs text-slate-400">Review pending developer requests to join {startup.name}.</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#171A24] text-slate-300 border border-[#2A2F42]">
                {joinRequests.filter((r) => r.status === 'PENDING').length} Pending
              </span>
            </div>

            {actionFeedback && (
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center gap-2 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{actionFeedback}</span>
              </div>
            )}

            {joinRequests.filter((r) => r.status === 'PENDING').length === 0 ? (
              <div className="p-8 rounded-xl bg-[#171A24] border border-[#232735] text-center text-xs text-slate-500">
                No pending developer join requests at this time.
              </div>
            ) : (
              <div className="space-y-4">
                {joinRequests
                  .filter((r) => r.status === 'PENDING')
                  .map((req) => {
                    const dev = req.developer;
                    const devProfile = dev?.profile;
                    const skillsList = dev?.skills || devProfile?.skills || [];
                    const isProcessing = processingRequestId === (req.id || req._id);

                    return (
                      <div
                        key={req.id || req._id}
                        className="p-5 rounded-xl bg-[#171A24] border border-[#2A2F42] hover:border-[#373E54] transition flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                      >
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-bold text-white">
                              {dev?.name || 'Developer'}
                            </span>
                            <span className="text-xs text-slate-400">({dev?.email})</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-800/60 uppercase">
                              PENDING
                            </span>
                          </div>

                          {skillsList.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <span className="text-xs font-semibold text-slate-400 mr-1">Skills:</span>
                              {skillsList.map((skill, idx) => (
                                <span
                                  key={idx}
                                  className="text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/50"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}

                          {req.message && (
                            <div className="p-3 rounded-lg bg-[#11141C] border border-[#232735] text-xs text-slate-300 italic mt-2">
                              <span className="text-slate-400 not-italic font-semibold block mb-0.5">Message:</span>
                              "{req.message}"
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleAcceptRequest(req.id || req._id)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 shadow-md shadow-indigo-600/20 transition cursor-pointer"
                          >
                            {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            <span>Accept</span>
                          </button>

                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleRejectRequest(req.id || req._id)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-rose-400 bg-[#11141C] border border-rose-900/40 hover:bg-rose-950/30 transition cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STARTUP TEAM ROSTER */}
        {/* ========================================================================= */}
        <div id="startup-team" className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 sm:p-8 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-[#232735] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-white tracking-tight uppercase">
                  STARTUP TEAM
                </h2>
                <p className="text-xs text-slate-400">Founders and active developers building the startup product.</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
              {1 + teamMembers.length} {1 + teamMembers.length === 1 ? 'Member' : 'Members'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Founder Card */}
            <div className="p-5 rounded-xl bg-[#171A24] border border-indigo-900/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">
                  {typeof startup.founder === 'object' ? startup.founder.name : 'Startup Founder'}
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800/60">
                  Founder
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {typeof startup.founder === 'object' ? startup.founder.email : ''}
              </p>
            </div>

            {/* Developer Members */}
            {teamMembers.map((m) => {
              const u = m.user;
              const prof = m.profile;
              const skills = prof?.skills || [];

              return (
                <div key={m.id || m._id} className="p-5 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{u?.name}</span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                      {m.role || 'Developer'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{u?.email}</p>

                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {skills.map((s, idx) => (
                        <span key={idx} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#11141C] text-slate-300 border border-[#232735]">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Developer Join Request Modal */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#11141C] max-w-md w-full rounded-2xl border border-[#232735] p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#232735] pb-4">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Join Startup Team</h3>
                  <p className="text-[11px] text-slate-400">{startup.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsJoinModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendJoinRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Why do you want to join this startup?
                </label>
                <textarea
                  rows={4}
                  maxLength={1000}
                  value={joinMessage}
                  onChange={(e) => setJoinMessage(e.target.value)}
                  placeholder="e.g. I would like to contribute my React and Node.js skills to build the core product features..."
                  className="w-full px-3.5 py-2.5 text-xs text-white bg-[#171A24] border border-[#2A2F42] rounded-xl focus:outline-hidden focus:border-indigo-500 placeholder:text-slate-500"
                />
              </div>

              {joinModalError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{joinModalError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingJoin}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 transition shadow-lg shadow-indigo-600/20"
                >
                  {submittingJoin ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  <span>Send Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#11141C] max-w-md w-full rounded-2xl border border-[#232735] p-6 sm:p-8 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-xl bg-red-950/40 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-800/40">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Delete Startup?</h3>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Are you sure you want to delete <strong className="text-white">{startup.name}</strong>? This action cannot be undone.
            </p>

            {deleteError && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-400 text-left">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-70 transition shadow-lg shadow-red-600/20"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StartupDetails;
