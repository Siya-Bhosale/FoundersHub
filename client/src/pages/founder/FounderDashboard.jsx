import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyStartups } from '../../api/startups';
import {
  Rocket,
  Plus,
  ArrowRight,
  Tag,
  Loader2,
  AlertCircle,
  Building2,
  Sparkles,
} from 'lucide-react';

const STAGE_CONFIG = {
  IDEA: { label: 'Idea', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  MVP: { label: 'MVP', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  EARLY_TRACTION: { label: 'Early Traction', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  GROWTH: { label: 'Growth', color: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const FounderDashboard = () => {
  const { user } = useAuth();
  const [startups, setStartups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    if (user?.role === 'FOUNDER') {
      fetchStartups();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Non-founder view
  if (user?.role !== 'FOUNDER') {
    return (
      <div className="bg-slate-50 min-h-[calc(100vh-4rem)] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {user?.role === 'DEVELOPER' ? 'Developer Hub' : 'Investor Portal'}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Welcome back, <span className="font-semibold text-slate-800">{user?.name}</span>
              </p>
            </div>
            <span className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border bg-slate-100 text-slate-800 border-slate-200">
              {user?.role} Workspace
            </span>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Marketplace Coming Soon</h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              As an authenticated {user?.role?.toLowerCase()}, your dedicated discovery portal and collaboration features will be activated in upcoming phases. Startup creation and editing are managed by Founders.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-4rem)] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Welcome back, {user?.name}
              </h1>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border bg-indigo-50 text-indigo-700 border-indigo-200">
                Founder Workspace
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500">
                {startups.length} {startups.length === 1 ? 'startup' : 'startups'} registered
              </span>
            </div>
          </div>

          <Link
            to="/startups/create"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-100 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Startup</span>
          </Link>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between text-sm text-red-700">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchStartups}
              className="text-xs font-semibold text-red-800 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Content Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">My Startups</h2>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-sm">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
              <p className="text-sm text-slate-500 font-medium">Loading your ventures...</p>
            </div>
          ) : startups.length === 0 ? (
            /* Professional Empty State */
            <div className="py-16 px-4 bg-white rounded-2xl border border-dashed border-slate-300 shadow-sm text-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                <Rocket className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No startups yet</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
                Create your first startup and start building.
              </p>
              <Link
                to="/startups/create"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-100 transition"
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
                  color: 'bg-slate-100 text-slate-700 border-slate-200',
                };

                return (
                  <div
                    key={s.id}
                    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-indigo-200 transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Stage & Industry */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${stageInfo.color}`}
                        >
                          {stageInfo.label}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                          <Tag className="w-3 h-3 text-slate-400" />
                          {s.industry}
                        </span>
                      </div>

                      {/* Title & Tagline */}
                      <h3 className="text-lg font-bold text-slate-900 mb-1.5 leading-snug">
                        {s.name}
                      </h3>
                      <p className="text-xs font-medium text-indigo-600 mb-3 line-clamp-1">
                        {s.tagline}
                      </p>

                      {/* Description Preview */}
                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-4">
                        {s.description || s.problemStatement}
                      </p>
                    </div>

                    {/* Card Footer */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                      <Link
                        to={`/startups/${s.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition"
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
