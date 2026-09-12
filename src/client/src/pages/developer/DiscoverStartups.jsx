import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAllStartups } from '../../api/startups';
import { submitJoinRequest, getMyJoinRequests } from '../../api/joinRequests';
import { getStartupDepartments } from '../../api/departments';
import {
  Compass,
  Search,
  ArrowRight,
  Tag,
  Loader2,
  AlertCircle,
  Building2,
  Sparkles,
  UserPlus,
  Clock,
  CheckCircle2,
  XCircle,
  Briefcase,
  Layers,
} from 'lucide-react';

const STAGE_CONFIG = {
  IDEA: { label: 'Idea', color: 'bg-sky-950/60 text-sky-400 border-sky-800/60' },
  MVP: { label: 'MVP', color: 'bg-indigo-950/60 text-indigo-400 border-indigo-800/60' },
  EARLY_TRACTION: { label: 'Early Traction', color: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60' },
  GROWTH: { label: 'Growth', color: 'bg-amber-950/60 text-amber-400 border-amber-800/60' },
};

const DiscoverStartups = () => {
  const { user } = useAuth();
  const userRole = user?.role?.toUpperCase();

  const [startups, setStartups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState('ALL');
  const [selectedIndustry, setSelectedIndustry] = useState('ALL');

  // Developer Join Requests state
  const [myRequestsMap, setMyRequestsMap] = useState({});
  const [activeStartupForJoin, setActiveStartupForJoin] = useState(null);
  const [joinDepartments, setJoinDepartments] = useState([]);
  const [loadingJoinDepts, setLoadingJoinDepts] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [requestedRole, setRequestedRole] = useState('');
  const [joinMessage, setJoinMessage] = useState('');
  const [submittingJoin, setSubmittingJoin] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');

  const loadRequests = async () => {
    if (userRole !== 'DEVELOPER') return;
    try {
      const data = await getMyJoinRequests();
      if (data?.success && Array.isArray(data.requests)) {
        const map = {};
        data.requests.forEach((r) => {
          const sId = (r.startup?.id || r.startup?._id || r.startup)?.toString();
          if (sId) map[sId] = r.status;
        });
        setMyRequestsMap(map);
      }
    } catch (e) {}
  };

  useEffect(() => {
    const fetchStartups = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getAllStartups();
        setStartups(data.startups || []);
      } catch (err) {
        setError(err.message || 'Failed to load startups for discovery');
      } finally {
        setLoading(false);
      }
    };

    fetchStartups();
    loadRequests();
  }, [userRole]);

  // Compute unique industries for filter dropdown
  const industries = ['ALL', ...Array.from(new Set(startups.map((s) => s.industry).filter(Boolean)))];

  // Filtered startups
  const filteredStartups = startups.filter((startup) => {
    const matchesSearch =
      searchTerm.trim() === '' ||
      startup.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      startup.tagline?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      startup.problemStatement?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      startup.solution?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      startup.industry?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStage = selectedStage === 'ALL' || startup.stage === selectedStage;
    const matchesIndustry = selectedIndustry === 'ALL' || startup.industry === selectedIndustry;

    return matchesSearch && matchesStage && matchesIndustry;
  });

  const handleOpenJoinModal = async (startup) => {
    setActiveStartupForJoin(startup);
    setJoinMessage('I would like to contribute to the development of this startup.');
    setRequestedRole('');
    setSelectedDepartment('');
    setJoinError('');
    setJoinSuccess('');
    setLoadingJoinDepts(true);

    try {
      const res = await getStartupDepartments(startup.id || startup._id);
      const depts = res?.departments || [];
      setJoinDepartments(depts);
      if (depts.length > 0) {
        setSelectedDepartment(depts[0]._id || depts[0].id);
      }
    } catch (err) {
      console.error('Failed to load startup departments:', err);
      setJoinError('Could not load departments for this startup.');
    } finally {
      setLoadingJoinDepts(false);
    }
  };

  const handleSendJoinRequest = async (e) => {
    e.preventDefault();
    if (submittingJoin || !activeStartupForJoin) return;

    if (!selectedDepartment) {
      setJoinError('Please select a department to apply to.');
      return;
    }

    if (!requestedRole.trim()) {
      setJoinError('Please specify the position/role you are applying for (e.g. Backend Developer).');
      return;
    }

    setSubmittingJoin(true);
    setJoinError('');
    try {
      const res = await submitJoinRequest({
        startupId: activeStartupForJoin.id || activeStartupForJoin._id,
        department: selectedDepartment,
        requestedRole: requestedRole.trim(),
        message: joinMessage.trim(),
      });
      if (res?.success) {
        setMyRequestsMap((prev) => ({
          ...prev,
          [activeStartupForJoin.id || activeStartupForJoin._id]: 'PENDING',
        }));
        setJoinSuccess(`Application submitted to ${activeStartupForJoin.name} (${requestedRole.trim()})!`);
        setTimeout(() => setJoinSuccess(''), 5000);
        setActiveStartupForJoin(null);
      }
    } catch (err) {
      setJoinError(err.message || 'Failed to submit join request');
    } finally {
      setSubmittingJoin(false);
    }
  };

  return (
    <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-indigo-950/60 border border-indigo-800/50 flex items-center justify-center text-indigo-400">
                <Compass className="w-4 h-4" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Discover Startups
              </h1>
            </div>
            <p className="text-sm text-slate-400">
              Browse innovative venture concepts, explore build needs, and join founder teams.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-[#11141C] px-3.5 py-2 rounded-xl border border-[#232735] shadow-sm self-start md:self-auto">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>{filteredStartups.length} Active {filteredStartups.length === 1 ? 'Venture' : 'Ventures'}</span>
          </div>
        </div>

        {joinSuccess && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{joinSuccess}</span>
          </div>
        )}

        {/* Search & Filter Controls */}
        <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-4 sm:p-5 shadow-xl flex flex-col md:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, problem, or technology..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-[#171A24] border border-[#2A2F42] rounded-xl text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition placeholder:text-slate-500"
            />
          </div>

          {/* Stage Filter */}
          <div className="flex items-center gap-2">
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="px-3 py-2 text-sm bg-[#171A24] border border-[#2A2F42] rounded-xl text-slate-200 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition cursor-pointer"
            >
              <option value="ALL">All Stages</option>
              <option value="IDEA">Idea</option>
              <option value="MVP">MVP</option>
              <option value="EARLY_TRACTION">Early Traction</option>
              <option value="GROWTH">Growth</option>
            </select>

            {/* Industry Filter */}
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="px-3 py-2 text-sm bg-[#171A24] border border-[#2A2F42] rounded-xl text-slate-200 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition cursor-pointer"
            >
              {industries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind === 'ALL' ? 'All Industries' : ind}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
            <p className="text-sm font-medium">Scanning founder ventures...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-red-950/40 border border-red-800/50 text-red-400 text-center flex flex-col items-center gap-2">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : filteredStartups.length === 0 ? (
          <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-12 text-center shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-[#171A24] text-slate-500 flex items-center justify-center mx-auto mb-4 border border-[#2A2F42]">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">No Startups Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5">
              {searchTerm || selectedStage !== 'ALL' || selectedIndustry !== 'ALL'
                ? 'Try adjusting your search criteria or resetting filters to see more results.'
                : 'There are currently no active ventures listed in the directory.'}
            </p>
            {(searchTerm || selectedStage !== 'ALL' || selectedIndustry !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedStage('ALL');
                  setSelectedIndustry('ALL');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-indigo-400 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-800/50 transition"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStartups.map((startup) => {
              const stageBadge = STAGE_CONFIG[startup.stage] || {
                label: startup.stage,
                color: 'bg-slate-800 text-slate-300 border-slate-700',
              };

              const currentReqStatus = myRequestsMap[startup.id];

              return (
                <div
                  key={startup.id}
                  className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 flex flex-col justify-between hover:border-[#373E54] shadow-xl hover:shadow-2xl transition duration-200 group"
                >
                  <div className="space-y-3">
                    {/* Tags */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wide ${stageBadge.color}`}
                      >
                        {stageBadge.label}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-300 bg-[#171A24] px-2 py-0.5 rounded border border-[#2A2F42]">
                        <Tag className="w-3 h-3 text-slate-400" />
                        {startup.industry}
                      </span>
                    </div>

                    {/* Title & Tagline */}
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition tracking-tight">
                        {startup.name}
                      </h3>
                      <p className="text-xs font-medium text-indigo-400 mt-1 line-clamp-1">
                        {startup.tagline}
                      </p>
                    </div>

                    {/* Problem Preview */}
                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                      {startup.problemStatement}
                    </p>

                    {/* Founder name */}
                    {startup.founder && (
                      <div className="pt-3 border-t border-[#232735] text-[11px] text-slate-400 flex items-center justify-between">
                        <span>Founder</span>
                        <strong className="text-slate-200 font-semibold">
                          {typeof startup.founder === 'object' ? startup.founder.name : 'Verified Founder'}
                        </strong>
                      </div>
                    )}
                  </div>

                  {/* Action Link / Buttons */}
                  <div className="pt-4 mt-4 border-t border-[#232735]">
                    {userRole === 'DEVELOPER' ? (
                      <div className="flex items-center gap-2">
                        {currentReqStatus === 'PENDING' ? (
                          <span className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-950/50 text-amber-400 border border-amber-800/50">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Request Pending</span>
                          </span>
                        ) : currentReqStatus === 'ACCEPTED' ? (
                          <span className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-950/50 text-emerald-400 border border-emerald-800/50">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>On the Team</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenJoinModal(startup)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Request to Join</span>
                          </button>
                        )}
                        <Link
                          to={`/startups/${startup.id}`}
                          className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] hover:text-white transition"
                        >
                          Details
                        </Link>
                      </div>
                    ) : (
                      <Link
                        to={`/startups/${startup.id}`}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition"
                      >
                        <span>View Startup & Team</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Developer Join Request Modal */}
      {activeStartupForJoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#11141C] max-w-md w-full rounded-2xl border border-[#232735] p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#232735] pb-4">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Apply to join Startup</h3>
                  <p className="text-[11px] text-slate-400">{activeStartupForJoin.name}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveStartupForJoin(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {loadingJoinDepts ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                <span className="text-xs text-slate-400">Loading startup departments...</span>
              </div>
            ) : joinDepartments.length === 0 ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300 space-y-1">
                  <p className="font-semibold">No Departments Created</p>
                  <p>This startup has not created any departments yet.</p>
                </div>
                <p className="text-xs text-slate-400">
                  You can apply to this startup once the founder configures at least one team department.
                </p>
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveStartupForJoin(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendJoinRequest} className="space-y-4">
                {/* Choose Department */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Choose Department <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 text-xs text-white bg-[#171A24] border border-[#2A2F42] rounded-xl focus:outline-hidden focus:border-indigo-500 transition cursor-pointer"
                    >
                      {joinDepartments.map((dept) => (
                        <option key={dept._id || dept.id} value={dept._id || dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Choose Position / Role */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Choose Position / Role <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Backend Developer, UI Designer, Full Stack Developer"
                    value={requestedRole}
                    onChange={(e) => setRequestedRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs text-white bg-[#171A24] border border-[#2A2F42] rounded-xl focus:outline-hidden focus:border-indigo-500 placeholder:text-slate-500 transition"
                  />
                </div>

                {/* Message to Founder */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Message to Founder <span className="text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={joinMessage}
                    onChange={(e) => setJoinMessage(e.target.value)}
                    placeholder="I would like to contribute to backend development and API architecture..."
                    className="w-full px-3.5 py-2.5 text-xs text-white bg-[#171A24] border border-[#2A2F42] rounded-xl focus:outline-hidden focus:border-indigo-500 placeholder:text-slate-500 resize-none transition"
                  />
                </div>

                {joinError && (
                  <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{joinError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveStartupForJoin(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingJoin}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 transition shadow-lg shadow-indigo-600/20 cursor-pointer"
                  >
                    {submittingJoin ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                    <span>Apply</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscoverStartups;
