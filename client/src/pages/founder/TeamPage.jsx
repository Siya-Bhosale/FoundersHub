import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStartupById } from '../../api/startups';
import { getStartupTeam } from '../../api/team';
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
} from 'lucide-react';

const AVAILABILITY_CONFIG = {
  AVAILABLE: { label: 'Available Full-Time', color: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60' },
  PART_TIME: { label: 'Part-Time', color: 'bg-amber-950/60 text-amber-400 border-amber-800/60' },
  NOT_AVAILABLE: { label: 'Not Available', color: 'bg-slate-800/80 text-slate-400 border-slate-700/60' },
};

const TeamPage = () => {
  const { startupId } = useParams();
  const [startup, setStartup] = useState(null);
  const [team, setTeam] = useState(null);
  const [joinRequests, setJoinRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [actionSuccess, setActionSuccess] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [sRes, tmRes, jrRes] = await Promise.all([
        getStartupById(startupId),
        getStartupTeam(startupId).catch(() => ({ team: null, members: [] })),
        getStartupJoinRequests(startupId).catch(() => ({ requests: [] })),
      ]);
      setStartup(sRes.startup);
      setTeam(tmRes.team || tmRes);
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

  const handleAccept = async (requestId) => {
    if (processingId) return;
    setProcessingId(requestId);
    setActionSuccess('');
    try {
      const res = await acceptJoinRequest(requestId);
      if (res?.success) {
        setActionSuccess('Developer joined the startup team successfully!');
        await loadData();
      }
    } catch (err) {
      alert(err.message || 'Failed to accept join request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId) => {
    if (processingId) return;
    setProcessingId(requestId);
    setActionSuccess('');
    try {
      const res = await rejectJoinRequest(requestId);
      if (res?.success) {
        setActionSuccess('Join request declined.');
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
        <p className="text-sm text-slate-400 font-medium">Loading startup team...</p>
      </div>
    );
  }

  const pendingRequests = joinRequests.filter((r) => r.status === 'PENDING');
  const activeMembers = team?.members || [];

  return (
    <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <StartupHeader
          startup={startup}
          toolName="Team & Collaborators"
          toolDescription="Active builders, technical skills verification, and incoming developer join requests."
          routePrefix="/team"
          actionButton={
            <Link
              to={`/tasks/${startupId}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition"
            >
              <SquareCheck className="w-3.5 h-3.5" />
              <span>Assign Tasks</span>
            </Link>
          }
        />

        {actionSuccess && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Pending Join Requests Section */}
        <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 sm:p-8 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-[#232735] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-800/50 flex items-center justify-center">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white tracking-tight uppercase">
                  TEAM REQUESTS
                </h3>
                <p className="text-xs text-slate-400">Developers seeking to join your sprint team.</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#171A24] text-slate-300 border border-[#2A2F42]">
              {pendingRequests.length} Pending
            </span>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="p-6 rounded-xl bg-[#171A24] border border-[#232735] text-center text-xs text-slate-500">
              No pending developer join requests at this time.
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((req) => {
                const dev = req.developer;
                const devProf = dev?.profile;
                const skillsList = dev?.skills || devProf?.skills || [];
                const isProcessing = processingId === (req.id || req._id);
                const avail = devProf?.availability && AVAILABILITY_CONFIG[devProf.availability];

                return (
                  <div
                    key={req.id || req._id}
                    className="p-5 rounded-xl bg-[#171A24] border border-[#2A2F42] flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition hover:border-[#373E54]"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-white">{dev?.name || 'Developer'}</span>
                        <span className="text-xs text-slate-400">({dev?.email})</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-800/60 uppercase">
                          PENDING
                        </span>
                        {avail && (
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${avail.color}`}
                          >
                            {avail.label}
                          </span>
                        )}
                      </div>

                      {devProf?.bio && <p className="text-xs text-slate-300 leading-relaxed">{devProf.bio}</p>}

                      {skillsList.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-xs font-semibold text-slate-400 mr-1">Skills:</span>
                          {skillsList.map((skill, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/50"
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
                        onClick={() => handleAccept(req.id || req._id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 shadow-md shadow-indigo-600/20 transition cursor-pointer"
                      >
                        {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span>Accept</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleReject(req.id || req._id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400 bg-[#11141C] border border-rose-900/40 hover:bg-rose-950/30 transition cursor-pointer"
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

        {/* Active Team Roster */}
        <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 sm:p-8 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-[#232735] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Active Team Members</h3>
                <p className="text-xs text-slate-400">Builders collaborating on sprint deliverables.</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
              {1 + activeMembers.length} Members
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Founder Card */}
            <div className="p-5 rounded-xl bg-[#171A24] border border-indigo-900/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">
                  {startup?.founder?.name || 'Startup Founder'}
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800/60">
                  Founder
                </span>
              </div>
              <p className="text-xs text-slate-400">{startup?.founder?.email || ''}</p>
            </div>

            {/* Developer Members */}
            {activeMembers.map((m) => {
              const u = m.user;
              const prof = m.profile;
              const avail = prof?.availability && AVAILABILITY_CONFIG[prof.availability];

              return (
                <div key={m.id || m._id} className="p-5 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{u?.name}</span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                      {m.role || 'Developer'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{u?.email}</p>

                  {prof?.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {prof.skills.map((s, idx) => (
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
    </div>
  );
};

export default TeamPage;
