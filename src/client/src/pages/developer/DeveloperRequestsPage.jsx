import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyJoinRequests } from '../../api/joinRequests';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Loader2,
  AlertCircle,
  Compass,
  Calendar,
} from 'lucide-react';

const STATUS_CONFIG = {
  PENDING: {
    label: 'Pending Review',
    color: 'bg-amber-950/60 text-amber-400 border-amber-800/60',
    icon: Clock,
  },
  ACCEPTED: {
    label: 'Accepted • Active Member',
    color: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60',
    icon: CheckCircle2,
  },
  REJECTED: {
    label: 'Declined',
    color: 'bg-rose-950/60 text-rose-400 border-rose-800/60',
    icon: XCircle,
  },
};

const DeveloperRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMyJoinRequests();
      setRequests(data.requests || []);
    } catch (err) {
      setError(err.message || 'Failed to load your join requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return (
    <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-indigo-950/60 border border-indigo-800/50 flex items-center justify-center text-indigo-400">
                <FileText className="w-4 h-4" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                My Join Requests
              </h1>
            </div>
            <p className="text-sm text-slate-400">
              Track real-time status of your venture applications and team formations.
            </p>
          </div>

          <Link
            to="/startups/discover"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition self-start sm:self-auto"
          >
            <Compass className="w-4 h-4" />
            <span>Discover More Startups</span>
          </Link>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
            <p className="text-sm font-medium">Loading your applications...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-red-950/40 border border-red-800/50 text-red-400 text-center flex flex-col items-center gap-2">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-12 text-center shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-indigo-950/60 text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-800/50">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">No Join Requests Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
              You haven't requested to join any startup builder teams yet. Explore active founder projects and submit a request with your developer skills.
            </p>
            <Link
              to="/startups/discover"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition"
            >
              <span>Explore Discover Directory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => {
              const statusInfo = STATUS_CONFIG[request.status] || {
                label: request.status,
                color: 'bg-slate-800 text-slate-300 border-slate-700',
                icon: Clock,
              };
              const StatusIcon = statusInfo.icon;

              const formattedCreated = request.createdAt
                ? new Date(request.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : null;

              const formattedReviewed = request.reviewedAt
                ? new Date(request.reviewedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : null;

              return (
                <div
                  key={request.id || request._id}
                  className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 shadow-xl hover:border-[#373E54] transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      {/* Startup Title & Meta */}
                      <div className="flex flex-wrap items-center gap-2">
                        {request.startup ? (
                          <Link
                            to={`/startups/${request.startup.id || request.startup._id}`}
                            className="text-lg font-bold text-white hover:text-indigo-400 transition"
                          >
                            {request.startup.name}
                          </Link>
                        ) : (
                          <span className="text-lg font-bold text-slate-400">Archived Startup</span>
                        )}

                        {request.startup?.industry && (
                          <span className="text-[11px] font-medium text-slate-300 bg-[#171A24] px-2 py-0.5 rounded border border-[#2A2F42]">
                            {request.startup.industry}
                          </span>
                        )}

                        {request.startup?.stage && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950/60 text-indigo-300 border border-indigo-800/50 uppercase">
                            {request.startup.stage}
                          </span>
                        )}
                      </div>

                      {request.startup?.tagline && (
                        <p className="text-xs font-medium text-indigo-400">
                          {request.startup.tagline}
                        </p>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${statusInfo.color}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        <span>{statusInfo.label}</span>
                      </span>
                    </div>
                  </div>

                  {/* Pitch / Message */}
                  {request.message && (
                    <div className="mt-4 p-3.5 rounded-xl bg-[#171A24] border border-[#2A2F42] text-xs text-slate-300">
                      <span className="font-semibold text-slate-400 block mb-1 uppercase tracking-wider text-[10px]">
                        Your Application Note:
                      </span>
                      <p className="whitespace-pre-line leading-relaxed italic">"{request.message}"</p>
                    </div>
                  )}

                  {/* Footer Timestamps & CTA */}
                  <div className="mt-5 pt-4 border-t border-[#232735] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-400">
                    <div className="flex flex-wrap items-center gap-4 text-[11px]">
                      {formattedCreated && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>Submitted {formattedCreated}</span>
                        </span>
                      )}
                      {formattedReviewed && (
                        <span className="flex items-center gap-1 font-medium text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>Reviewed {formattedReviewed}</span>
                        </span>
                      )}
                    </div>

                    {(request.startup?.id || request.startup?._id) && (
                      <Link
                        to={`/startups/${request.startup.id || request.startup?._id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
                      >
                        <span>View Startup Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeveloperRequestsPage;
