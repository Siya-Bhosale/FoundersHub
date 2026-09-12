import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStartupById } from '../../api/startups';
import { getStartupFundingInterests } from '../../api/fundingInterest';
import StartupHeader from '../../components/common/StartupHeader';
import {
  Handshake,
  DollarSign,
  Loader2,
  Presentation,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

const formatCurrency = (val) => {
  const num = Number(val) || 0;
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(0)}L`;
  return `₹${num.toLocaleString('en-IN')}`;
};

const InvestorInterestPage = () => {
  const { startupId } = useParams();
  const [startup, setStartup] = useState(null);
  const [fundingInterests, setFundingInterests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [sRes, fiRes] = await Promise.all([
        getStartupById(startupId),
        getStartupFundingInterests(startupId).catch(() => ({ data: [] })),
      ]);
      setStartup(sRes.startup);
      setFundingInterests(fiRes?.data || []);
      try {
        localStorage.setItem('sprintfounders_active_startup', startupId);
      } catch (e) {}
    } catch (err) {
      console.error('Failed to load investor interest:', err);
      setError(err.message || 'Failed to load investor interests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startupId) loadData();
  }, [startupId]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-[#0B0D12]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm text-slate-400 font-medium">Loading received investor interests...</p>
      </div>
    );
  }

  const totalCapitalExpressed = fundingInterests.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );

  return (
    <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <StartupHeader
          startup={startup}
          toolName="Investor Interest"
          toolDescription="Review syndicates and venture investors who expressed potential capital allocation for this venture."
          routePrefix="/funding-interest"
          actionButton={
            <Link
              to={`/pitch/${startupId}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition"
            >
              <Presentation className="w-3.5 h-3.5" />
              <span>Pitch Deck</span>
            </Link>
          }
        />

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Capital Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#11141C] p-5 rounded-2xl border border-[#232735] shadow-xl space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Interested Investors</span>
            <span className="text-2xl font-black text-white">{fundingInterests.length}</span>
            <span className="text-[11px] text-indigo-400 font-medium">Active Deal-flow Signals</span>
          </div>

          <div className="bg-[#11141C] p-5 rounded-2xl border border-[#232735] shadow-xl space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Expressed Capital</span>
            <span className="text-2xl font-black text-emerald-400">{formatCurrency(totalCapitalExpressed)}</span>
            <span className="text-[11px] text-slate-400">Sum of indicative check sizes</span>
          </div>

          <div className="bg-[#11141C] p-5 rounded-2xl border border-[#232735] shadow-xl space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Funding Target Gap</span>
            <span className="text-2xl font-black text-amber-400">
              {formatCurrency(Math.max(0, (startup?.fundingRequired || 0) - (startup?.fundingReceived || 0)))}
            </span>
            <span className="text-[11px] text-slate-400">Required vs Received capital</span>
          </div>
        </div>

        {/* Received Interests List */}
        <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 sm:p-8 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-[#232735] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-950/60 text-amber-400 border border-amber-800/50 flex items-center justify-center">
                <Handshake className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Deal Expressions</h3>
                <p className="text-xs text-slate-400">Verified investor commitments and introductions.</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/60">
              {fundingInterests.length} {fundingInterests.length === 1 ? 'Investor' : 'Investors'}
            </span>
          </div>

          {fundingInterests.length === 0 ? (
            <div className="p-8 rounded-xl bg-[#171A24] border border-[#232735] text-center space-y-2">
              <p className="text-xs text-slate-400">
                No investors have expressed funding interest yet. Continue updating sprint tasks and shipping features to increase your Execution Score!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fundingInterests.map((item) => (
                <div
                  key={item.id || item._id}
                  className="p-5 rounded-xl bg-[#171A24] border border-[#2A2F42] flex flex-col justify-between space-y-3 shadow-md"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-950/60 text-indigo-300 border border-indigo-800/60">
                        {item.investor?.firmName || 'Angel Investor'}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                        {item.status || 'INTERESTED'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Indicative Check Size
                      </span>
                      <span className="text-base font-black text-white">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>

                    {item.message && (
                      <p className="text-xs text-slate-300 italic p-2.5 rounded-lg bg-[#11141C] border border-[#232735]">
                        "{item.message}"
                      </p>
                    )}

                    <div className="text-[11px] text-slate-400 pt-1">
                      Investor Contact: <strong className="text-slate-200">{item.investor?.name}</strong> ({item.investor?.email})
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#232735] text-[10px] text-slate-500 flex items-center justify-between">
                    <span>Received {new Date(item.createdAt).toLocaleDateString()}</span>
                    <span className="text-indigo-400 font-semibold">Verified Expression</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvestorInterestPage;
