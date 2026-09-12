import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyFundingInterests } from '../../api/fundingInterest';
import {
  Send,
  Building2,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Compass,
} from 'lucide-react';

const formatCurrency = (val) => {
  const num = Number(val) || 0;
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(0)}L`;
  return `₹${num.toLocaleString('en-IN')}`;
};

const InvestorInterestsPage = () => {
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInterests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyFundingInterests();
      setInterests(res.data || []);
    } catch (err) {
      console.error('Error fetching funding interests:', err);
      setError('Unable to load your funding interests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterests();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 sm:p-8 rounded-2xl bg-[#11141C] border border-[#232735] shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-950/60 text-indigo-400 border border-indigo-800/60 mb-1">
            <Send className="w-3.5 h-3.5" />
            <span>Syndicate & Check Allocations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            My Funding Interests
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Track all check allocations and investment interest submissions sent directly to venture founders.
          </p>
        </div>

        <Link
          to="/investor/startups"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition self-start sm:self-auto"
        >
          <Compass className="w-4 h-4" />
          <span>Discover More Startups</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Loading Funding Interests...
          </p>
        </div>
      ) : interests.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#11141C] border border-[#232735] text-center space-y-3">
          <Send className="w-10 h-10 text-slate-500 mx-auto mb-2" />
          <h3 className="text-base font-bold text-white">No Funding Interests Expressed Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Browse through active startup ventures on the discovery portal and express funding interest to open direct conversations with founders.
          </p>
          <Link
            to="/investor/startups"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-sm"
          >
            <Compass className="w-4 h-4" />
            <span>Discover Startups</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {interests.map((item) => {
            const startup = item.startup;
            const formattedDate = item.createdAt
              ? new Date(item.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : 'Recently';

            return (
              <div
                key={item._id || item.id}
                className="p-5 sm:p-6 rounded-2xl bg-[#11141C] border border-[#232735] hover:border-indigo-900/60 transition shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-5"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                      {item.status || 'INTERESTED'}
                    </span>
                    <h3 className="text-base font-bold text-white">
                      {startup?.name || 'Startup Venture'}
                    </h3>
                    {startup?.stage && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#171A24] text-slate-400 border border-[#2A2F42]">
                        {startup.stage}
                      </span>
                    )}
                  </div>

                  {item.message && (
                    <p className="text-xs text-slate-300 italic max-w-2xl bg-[#171A24] p-3 rounded-xl border border-[#2A2F42]">
                      "{item.message}"
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Sent on {formattedDate}</span>
                    </span>
                    {startup?.industry && (
                      <span>Sector: <strong className="text-slate-200">{startup.industry}</strong></span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between md:flex-col md:items-end gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-[#232735]">
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Expressed Allocation
                    </span>
                    <span className="text-base font-black text-indigo-400">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>

                  {startup?._id && (
                    <Link
                      to={`/startups/${startup._id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] hover:text-white transition"
                    >
                      <span>View Venture</span>
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
  );
};

export default InvestorInterestsPage;
