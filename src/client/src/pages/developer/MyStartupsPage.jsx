import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyDeveloperStartups } from '../../api/developer';
import {
  Building2,
  Users,
  Compass,
  ArrowRight,
  Loader2,
  AlertCircle,
  Tag,
  ShieldCheck,
  CheckCircle2,
  Briefcase,
} from 'lucide-react';

const STAGE_CONFIG = {
  IDEA: { label: 'Idea', color: 'bg-sky-950/60 text-sky-400 border-sky-800/60' },
  MVP: { label: 'MVP', color: 'bg-indigo-950/60 text-indigo-400 border-indigo-800/60' },
  EARLY_TRACTION: { label: 'Early Traction', color: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60' },
  GROWTH: { label: 'Growth', color: 'bg-amber-950/60 text-amber-400 border-amber-800/60' },
};

const MyStartupsPage = () => {
  const navigate = useNavigate();
  const [startups, setStartups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetchStartups = async () => {
      try {
        const res = await getMyDeveloperStartups();
        if (mounted && res?.startups) {
          setStartups(res.startups);
          if (res.startups.length > 0) {
            try {
              localStorage.setItem('sprintfounders_active_startup', res.startups[0].id || res.startups[0]._id);
            } catch (e) {}
          }
        }
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load your startups');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchStartups();
    return () => {
      mounted = false;
    };
  }, []);

  const handleOpenWorkspace = (startupId) => {
    try {
      localStorage.setItem('sprintfounders_active_startup', startupId);
    } catch (e) {}
    navigate(`/developer/startups/${startupId}`);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-[#0B0D12]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm text-slate-400 font-medium">Loading your joined startups...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#232735] pb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 flex items-center justify-center">
                <Briefcase className="w-4 h-4" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                MY STARTUPS
              </h1>
            </div>
            <p className="text-sm text-slate-400">
              Startups you're currently working with.
            </p>
          </div>

          <Link
            to="/startups/discover"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] hover:border-indigo-500/50 transition shadow-sm self-start sm:self-auto"
          >
            <Compass className="w-4 h-4 text-indigo-400" />
            <span>Discover More Startups</span>
          </Link>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-center gap-3 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Startups Grid or Empty State */}
        {startups.length === 0 ? (
          <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-12 text-center max-w-xl mx-auto shadow-xl space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-indigo-950/50 text-indigo-400 border border-indigo-800/40 flex items-center justify-center mx-auto">
              <Building2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                You haven't joined any startups yet.
              </h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                Discover startups looking for developers, submit join requests, and start collaborating once accepted.
              </p>
            </div>

            <div className="pt-2">
              <Link
                to="/startups/discover"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition"
              >
                <Compass className="w-4 h-4" />
                <span>Discover Startups</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {startups.map((startup) => {
              const sid = startup.id || startup._id;
              const stageInfo = STAGE_CONFIG[startup.stage] || {
                label: startup.stage || 'MVP',
                color: 'bg-indigo-950/60 text-indigo-400 border-indigo-800/60',
              };

              return (
                <div
                  key={sid}
                  className="bg-[#11141C] rounded-2xl border border-[#232735] hover:border-[#373E54] p-6 shadow-xl transition-all duration-200 flex flex-col justify-between group space-y-5"
                >
                  <div className="space-y-3.5">
                    {/* Startup Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-800/60 flex items-center justify-center text-lg shrink-0">
                          🌱
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition line-clamp-1">
                            {startup.name}
                          </h3>
                          <div className="flex items-center gap-2 pt-0.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${stageInfo.color}`}
                            >
                              {stageInfo.label}
                            </span>
                            {startup.industry && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                {startup.industry}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tagline / Description */}
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed min-h-[2rem]">
                      {startup.tagline || startup.description || 'Active startup venture on SprintFounders.'}
                    </p>

                    {/* Metadata Badges */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#232735]">
                      <div className="p-2.5 rounded-xl bg-[#171A24] border border-[#2A2F42]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                          Your Role
                        </span>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{startup.role || 'DEVELOPER'}</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#171A24] border border-[#2A2F42]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                          Team
                        </span>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                          <Users className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{startup.teamSize || 2} members</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Open Workspace Action */}
                  <button
                    type="button"
                    onClick={() => handleOpenWorkspace(sid)}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition cursor-pointer group-hover:shadow-indigo-600/30"
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
    </div>
  );
};

export default MyStartupsPage;
