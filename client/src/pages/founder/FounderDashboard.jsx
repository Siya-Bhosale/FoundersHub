import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyStartups } from '../../api/startups';
import DeveloperDashboard from '../developer/DeveloperDashboard';
import {
  Rocket,
  Plus,
  ArrowRight,
  Tag,
  Loader2,
  AlertCircle,
  Building2,
  Sparkles,
  Users,
} from 'lucide-react';

const STAGE_CONFIG = {
  IDEA: { label: 'Idea', color: 'bg-sky-950/60 text-sky-400 border-sky-800/60' },
  MVP: { label: 'MVP', color: 'bg-indigo-950/60 text-indigo-400 border-indigo-800/60' },
  EARLY_TRACTION: { label: 'Early Traction', color: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60' },
  GROWTH: { label: 'Growth', color: 'bg-amber-950/60 text-amber-400 border-amber-800/60' },
};

const FounderDashboard = () => {
  const { user } = useAuth();
  const [startups, setStartups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const userRole = user?.role?.toUpperCase();

  const fetchStartups = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMyStartups();
      setStartups(data.startups || []);
    } catch (err) {
      setError(err.message || 'Failed to load your startups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole === 'FOUNDER') {
      fetchStartups();
    } else {
      setLoading(false);
    }
  }, [userRole]);

  // Non-founder view
  if (userRole !== 'FOUNDER') {
    if (userRole === 'DEVELOPER') {
      return <DeveloperDashboard />;
    }

    // Investor view
    return (
      <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-[#11141C] p-6 sm:p-8 rounded-2xl border border-[#232735] shadow-xl flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Investor Portal
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Welcome back, <span className="font-semibold text-slate-200">{user?.name}</span>
              </p>
            </div>
            <span className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border bg-[#171A24] text-slate-300 border-[#2A2F42]">
              {userRole} Workspace
            </span>
          </div>

          <div className="bg-[#11141C] p-8 rounded-2xl border border-[#232735] shadow-xl text-center">
            <div className="w-12 h-12 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-800/40 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Marketplace Coming Soon</h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              As an authenticated investor, your dedicated discovery portal and deal-flow features will be activated in upcoming sprints. Startup creation and team management are reserved for Founders.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#11141C] p-6 sm:p-8 rounded-2xl border border-[#232735] shadow-xl">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Welcome back, {user?.name}
              </h1>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border bg-indigo-950/60 text-indigo-400 border-indigo-800/60">
                Founder Workspace
              </span>
              <span className="text-xs text-slate-600">•</span>
              <span className="text-xs text-slate-400">
                {startups.length} {startups.length === 1 ? 'startup' : 'startups'} registered
              </span>
            </div>
          </div>

          <Link
            to="/startups/create"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Startup</span>
          </Link>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 flex items-center justify-between text-sm text-red-400">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchStartups}
              className="text-xs font-semibold text-red-300 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Content Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white tracking-tight">My Startups</h2>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center bg-[#11141C] rounded-2xl border border-[#232735] shadow-xl">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
              <p className="text-sm text-slate-400 font-medium">Loading your ventures...</p>
            </div>
          ) : startups.length === 0 ? (
            /* Empty State */
            <div className="py-16 px-4 bg-[#11141C] rounded-2xl border border-dashed border-[#2A2F42] shadow-xl text-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-950/60 border border-indigo-800/40 text-indigo-400 flex items-center justify-center mx-auto mb-4">
                <Rocket className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">No startups yet</h3>
              <p className="text-sm text-slate-400 max-w-sm mx-auto mb-6">
                Create your first startup and start building with developers.
              </p>
              <Link
                to="/startups/create"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create Startup</span>
              </Link>
            </div>
          ) : (
            /* Startup Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {startups.map((s) => {
                const stageInfo = STAGE_CONFIG[s.stage] || {
                  label: s.stage,
                  color: 'bg-slate-800 text-slate-300 border-slate-700',
                };

                return (
                  <div
                    key={s.id}
                    className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 shadow-xl hover:border-[#373E54] transition flex flex-col justify-between group"
                  >
                    <div>
                      {/* Stage & Industry */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${stageInfo.color}`}
                        >
                          {stageInfo.label}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-300 bg-[#171A24] px-2.5 py-0.5 rounded-md border border-[#2A2F42]">
                          <Tag className="w-3 h-3 text-slate-400" />
                          {s.industry}
                        </span>
                      </div>

                      {/* Title & Tagline */}
                      <h3 className="text-lg font-bold text-white mb-1.5 leading-snug group-hover:text-indigo-300 transition">
                        {s.name}
                      </h3>
                      <p className="text-xs font-medium text-indigo-400 mb-3 line-clamp-1">
                        {s.tagline}
                      </p>

                      {/* Description Preview */}
                      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-4">
                        {s.description || s.problemStatement}
                      </p>
                    </div>

                    {/* Card Footer */}
                    <div className="pt-4 border-t border-[#232735] flex items-center justify-between gap-2">
                      {s.pendingRequestsCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 animate-pulse">
                          <Users className="w-3.5 h-3.5 text-indigo-400" />
                          <span>
                            {s.pendingRequestsCount} New Request{s.pendingRequestsCount > 1 ? 's' : ''}
                          </span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500">Active venture</span>
                      )}

                      <Link
                        to={`/startups/${s.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
                      >
                        <span>View Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FounderDashboard;
