import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getInvestorMatches,
  getInvestorMatchExplanation,
} from '../../api/investor';
import { expressFundingInterest, getMyFundingInterests } from '../../api/fundingInterest';
import {
  Compass,
  Sparkles,
  SlidersHorizontal,
  Search,
  Users,
  Activity,
  DollarSign,
  TrendingUp,
  Brain,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Loader2,
  X,
  Send,
  Building2,
  Filter,
} from 'lucide-react';

const formatCurrency = (val) => {
  const num = Number(val) || 0;
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(0)}L`;
  return `₹${num.toLocaleString('en-IN')}`;
};

const InvestorStartupDiscovery = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('ALL');
  const [selectedStage, setSelectedStage] = useState('ALL');
  const [minMatchThreshold, setMinMatchThreshold] = useState(0);

  // AI Explanation Modal State
  const [explainingStartup, setExplainingStartup] = useState(null);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [explanationData, setExplanationData] = useState(null);
  const [explanationError, setExplanationError] = useState(null);

  // Express Interest Modal State
  const [interestStartup, setInterestStartup] = useState(null);
  const [interestAmount, setInterestAmount] = useState('');
  const [interestMessage, setInterestMessage] = useState('Interested in discussing a potential investment.');
  const [submittingInterest, setSubmittingInterest] = useState(false);
  const [interestSuccess, setInterestSuccess] = useState('');
  const [interestError, setInterestError] = useState('');
  const [sentInterestsSet, setSentInterestsSet] = useState(new Set());

  const fetchMatchesData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getInvestorMatches();
      const list = res.data || [];
      setMatches(list);

      // Also fetch existing expressed interests to flag "Interest Sent"
      try {
        const myIntRes = await getMyFundingInterests();
        const activeSet = new Set((myIntRes.data || []).map((i) => i.startup?._id || i.startup));
        setSentInterestsSet(activeSet);
      } catch (e) {
        // Non-fatal
      }
    } catch (err) {
      console.error('Error fetching investor matches:', err);
      setError('Unable to load venture deal-flow. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchesData();
  }, []);

  // Handle opening AI explanation
  const handleOpenExplanation = async (startup) => {
    setExplainingStartup(startup);
    setExplanationData(null);
    setExplanationError(null);
    setExplanationLoading(true);

    try {
      const res = await getInvestorMatchExplanation(startup.startupId);
      setExplanationData(res);
    } catch (err) {
      console.error('Explanation error:', err);
      setExplanationError(err.message || 'Failed to generate match explanation');
    } finally {
      setExplanationLoading(false);
    }
  };

  // Handle opening interest modal
  const handleOpenInterestModal = (startup) => {
    setInterestStartup(startup);
    setInterestAmount(startup.fundingRequired ? String(startup.fundingRequired) : '1000000');
    setInterestMessage('Interested in discussing a potential investment.');
    setInterestSuccess('');
    setInterestError('');
  };

  // Submit funding interest
  const handleSubmitInterest = async (e) => {
    e.preventDefault();
    if (!interestStartup) return;

    const amountNum = Number(interestAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setInterestError('Please enter a valid investment amount greater than 0');
      return;
    }

    setSubmittingInterest(true);
    setInterestError('');
    try {
      await expressFundingInterest({
        startupId: interestStartup.startupId,
        amount: amountNum,
        message: interestMessage.trim(),
      });
      setInterestSuccess('Funding interest sent to founder.');
      setSentInterestsSet((prev) => new Set(prev).add(interestStartup.startupId));
      setTimeout(() => {
        setInterestStartup(null);
        setInterestSuccess('');
      }, 1500);
    } catch (err) {
      console.error('Express interest error:', err);
      setInterestError(err.message || 'Failed to submit funding interest');
    } finally {
      setSubmittingInterest(false);
    }
  };

  // Derived Filter Options
  const uniqueIndustries = Array.from(new Set(matches.map((m) => m.industry).filter(Boolean)));
  const uniqueStages = Array.from(new Set(matches.map((m) => m.stage).filter(Boolean)));

  const filteredMatches = matches.filter((m) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      m.startupName.toLowerCase().includes(q) ||
      (m.tagline && m.tagline.toLowerCase().includes(q)) ||
      (m.problemStatement && m.problemStatement.toLowerCase().includes(q)) ||
      (m.industry && m.industry.toLowerCase().includes(q));

    const matchesIndustry = selectedIndustry === 'ALL' || m.industry === selectedIndustry;
    const matchesStage = selectedStage === 'ALL' || m.stage === selectedStage;
    const matchesScore = m.matchScore >= minMatchThreshold;

    return matchesQuery && matchesIndustry && matchesStage && matchesScore;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 sm:p-8 rounded-2xl bg-[#11141C] border border-[#232735] shadow-xl">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-950/60 text-indigo-400 border border-indigo-800/60 mb-1">
            <Compass className="w-3.5 h-3.5" />
            <span>AI & Deterministic Matchmaking</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Discover Ventures
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Live startups ranked strictly by deterministic thesis alignment (Industry, Stage, Check Size, Team, and Execution Readiness).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#171A24] text-slate-300 border border-[#2A2F42]">
            {filteredMatches.length} of {matches.length} Ventures Available
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-[#11141C] border border-[#232735] shadow-lg space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, problem, industry..."
              className="w-full pl-9 pr-3 py-2 text-xs text-white bg-[#171A24] border border-[#2A2F42] rounded-xl focus:outline-hidden focus:border-indigo-500 placeholder:text-slate-500"
            />
          </div>

          {/* Industry Filter */}
          <div>
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="w-full px-3 py-2 text-xs text-slate-300 bg-[#171A24] border border-[#2A2F42] rounded-xl focus:outline-hidden focus:border-indigo-500"
            >
              <option value="ALL">All Industries</option>
              {uniqueIndustries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>

          {/* Stage Filter */}
          <div>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="w-full px-3 py-2 text-xs text-slate-300 bg-[#171A24] border border-[#2A2F42] rounded-xl focus:outline-hidden focus:border-indigo-500"
            >
              <option value="ALL">All Stages</option>
              {uniqueStages.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Min Match Filter */}
          <div>
            <select
              value={minMatchThreshold}
              onChange={(e) => setMinMatchThreshold(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs text-slate-300 bg-[#171A24] border border-[#2A2F42] rounded-xl focus:outline-hidden focus:border-indigo-500"
            >
              <option value={0}>All Match Scores</option>
              <option value={80}>High Fit Only (80%+)</option>
              <option value={60}>Moderate+ (60%+)</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid */}
      {loading ? (
        <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
            Calculating Deterministic Match Scores...
          </p>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#11141C] border border-[#232735] text-center space-y-3">
          <Compass className="w-10 h-10 text-slate-500 mx-auto mb-2" />
          <h3 className="text-base font-bold text-white">No Ventures Match Your Filter Criteria</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Try resetting your filters or adjusting your investment threshold to explore more deal-flow.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedIndustry('ALL');
              setSelectedStage('ALL');
              setMinMatchThreshold(0);
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-sm"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredMatches.map((startup) => {
            const hasSentInterest = sentInterestsSet.has(startup.startupId);
            const scoreColor =
              startup.matchScore >= 80
                ? 'text-emerald-400 border-emerald-800/60 bg-emerald-950/60'
                : startup.matchScore >= 60
                ? 'text-indigo-400 border-indigo-800/60 bg-indigo-950/60'
                : 'text-amber-400 border-amber-800/60 bg-amber-950/60';

            return (
              <div
                key={startup.startupId}
                className="p-6 rounded-2xl bg-[#11141C] border border-[#232735] hover:border-indigo-900/60 transition shadow-xl flex flex-col justify-between space-y-6 group"
              >
                <div className="space-y-4">
                  {/* Top Row: Venture Details & Match Score Badge */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition">
                          {startup.startupName}
                        </h3>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#171A24] text-slate-300 border border-[#2A2F42]">
                          {startup.stage}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1">
                        {startup.tagline || 'Next-gen venture solving core industry challenges'}
                      </p>
                      <span className="text-[11px] font-medium text-indigo-400 block">
                        Sector: {startup.industry}
                      </span>
                    </div>

                    {/* Match Score Display */}
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                        MATCH FIT
                      </span>
                      <div
                        className={`text-base font-black px-3.5 py-1 rounded-xl border flex items-center gap-1.5 shadow-sm ${scoreColor}`}
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>{startup.matchScore}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Problem & Solution Brief */}
                  {startup.problemStatement && (
                    <div className="p-3 rounded-xl bg-[#171A24] border border-[#2A2F42] text-xs text-slate-300 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Problem Statement
                      </span>
                      <p className="line-clamp-2 leading-relaxed text-slate-300">
                        {startup.problemStatement}
                      </p>
                    </div>
                  )}

                  {/* Key Venture Metrics */}
                  <div className="grid grid-cols-3 gap-2.5 pt-1">
                    <div className="p-2.5 rounded-xl bg-[#171A24] border border-[#2A2F42] text-center">
                      <span className="text-[10px] text-slate-400 block">Team Size</span>
                      <div className="flex items-center justify-center gap-1 text-xs font-bold text-white mt-0.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{startup.teamSize || 1} Member{startup.teamSize > 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#171A24] border border-[#2A2F42] text-center">
                      <span className="text-[10px] text-slate-400 block">Execution Score</span>
                      <div className="flex items-center justify-center gap-1 text-xs font-bold text-emerald-400 mt-0.5">
                        <Activity className="w-3.5 h-3.5" />
                        <span>{startup.executionScore}/100</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#171A24] border border-[#2A2F42] text-center">
                      <span className="text-[10px] text-slate-400 block">Funding Ask</span>
                      <div className="text-xs font-bold text-indigo-300 mt-0.5">
                        {formatCurrency(startup.fundingRequired)}
                      </div>
                    </div>
                  </div>

                  {/* 5-Component Match Breakdown Progress Bars */}
                  <div className="space-y-2 p-3.5 rounded-xl bg-[#141721] border border-[#232735]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Deterministic Match Breakdown
                    </span>

                    {/* Component 1: Industry Fit */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300">Industry Fit (30%)</span>
                        <span className="text-white font-semibold">{startup.components.industryFit.score}/30</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#1F2433] overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: `${(startup.components.industryFit.score / 30) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Component 2: Stage Fit */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300">Stage Fit (20%)</span>
                        <span className="text-white font-semibold">{startup.components.stageFit.score}/20</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#1F2433] overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${(startup.components.stageFit.score / 20) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Component 3: Investment Range */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300">Investment Range (20%)</span>
                        <span className="text-white font-semibold">{startup.components.investmentRange.score}/20</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#1F2433] overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${(startup.components.investmentRange.score / 20) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Component 4: Team Fit */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300">Team Fit (10%)</span>
                        <span className="text-white font-semibold">{startup.components.teamFit.score}/10</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#1F2433] overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full transition-all"
                          style={{ width: `${(startup.components.teamFit.score / 10) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Component 5: Investor Readiness */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300">Investor Readiness (20%)</span>
                        <span className="text-white font-semibold">{startup.components.investorReadiness.score}/20</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#1F2433] overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all"
                          style={{ width: `${(startup.components.investorReadiness.score / 20) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-[#232735] flex flex-wrap items-center gap-2">
                  <Link
                    to={`/startups/${startup.startupId}`}
                    className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-center text-slate-200 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] hover:text-white transition"
                  >
                    View Startup
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleOpenExplanation(startup)}
                    className="py-2 px-3 rounded-xl text-xs font-semibold text-indigo-300 bg-indigo-950/40 border border-indigo-800/50 hover:bg-indigo-900/40 transition flex items-center gap-1.5"
                  >
                    <Brain className="w-3.5 h-3.5" />
                    <span>Explain Match</span>
                  </button>

                  <button
                    type="button"
                    disabled={hasSentInterest}
                    onClick={() => handleOpenInterestModal(startup)}
                    className={`py-2 px-3.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                      hasSentInterest
                        ? 'bg-emerald-950/50 border border-emerald-800/50 text-emerald-400 cursor-default'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                    }`}
                  >
                    {hasSentInterest ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Interest Sent</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Express Interest</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* GEMINI AI MATCH EXPLANATION MODAL */}
      {/* ========================================================================= */}
      {explainingStartup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#11141C] max-w-xl w-full rounded-2xl border border-[#232735] p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#232735] pb-4">
              <div className="flex items-center gap-2.5">
                <Brain className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Thesis Alignment Diagnostics
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {explainingStartup.startupName} ({explainingStartup.matchScore}% Match)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setExplainingStartup(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#171A24] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {explanationLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Analyzing Thesis Alignment via Gemini AI...
                </p>
              </div>
            ) : explanationError ? (
              <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300">
                {explanationError}
              </div>
            ) : explanationData ? (
              <div className="space-y-4">
                {/* Summary Banner */}
                <div className="p-4 rounded-xl bg-[#171A24] border border-indigo-900/40 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
                    Strategic Investment Thesis
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {explanationData.summary}
                  </p>
                </div>

                {/* Strengths */}
                {explanationData.strengths?.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Key Strategic Strengths</span>
                    </span>
                    <ul className="space-y-1.5">
                      {explanationData.strengths.map((s, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-slate-300 p-2.5 rounded-xl bg-[#171A24] border border-[#2A2F42] flex items-start gap-2"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Alignment */}
                {explanationData.alignment?.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>Portfolio Alignment Synergies</span>
                    </span>
                    <ul className="space-y-1.5">
                      {explanationData.alignment.map((a, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-slate-300 p-2.5 rounded-xl bg-[#171A24] border border-[#2A2F42] flex items-start gap-2"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1.5" />
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Concerns / Diligence */}
                {explanationData.concerns?.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      <span>Key Due Diligence Areas</span>
                    </span>
                    <ul className="space-y-1.5">
                      {explanationData.concerns.map((c, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-slate-300 p-2.5 rounded-xl bg-[#171A24] border border-[#2A2F42] flex items-start gap-2"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendation */}
                {explanationData.recommendation && (
                  <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-xs text-slate-300 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
                      Analyst Recommendation
                    </span>
                    <p className="text-slate-200 leading-relaxed font-medium">
                      {explanationData.recommendation}
                    </p>
                  </div>
                )}

                {/* Source Badge */}
                <div className="pt-2 flex items-center justify-between text-[10px] text-slate-500 border-t border-[#232735]">
                  <span>
                    Deterministic Score: <strong className="text-slate-300">{explainingStartup.matchScore}/100</strong>
                  </span>
                  <span>
                    Source:{' '}
                    <strong className="text-indigo-400">
                      {explanationData.source === 'gemini' ? 'Powered by Google Gemini' : 'Deterministic Fallback Analysis'}
                    </strong>
                  </span>
                </div>
              </div>
            ) : null}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setExplainingStartup(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EXPRESS FUNDING INTEREST MODAL */}
      {/* ========================================================================= */}
      {interestStartup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#11141C] max-w-md w-full rounded-2xl border border-[#232735] p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#232735] pb-4">
              <div className="flex items-center gap-2.5">
                <Send className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Express Funding Interest</h3>
                  <p className="text-[11px] text-slate-400">{interestStartup.startupName}</p>
                </div>
              </div>
              <button
                onClick={() => setInterestStartup(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#171A24] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitInterest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Potential Investment Amount (₹)
                </label>
                <input
                  type="number"
                  min={1}
                  step={50000}
                  value={interestAmount}
                  onChange={(e) => setInterestAmount(e.target.value)}
                  placeholder="e.g. 1000000"
                  required
                  className="w-full px-3.5 py-2.5 text-xs text-white bg-[#171A24] border border-[#2A2F42] rounded-xl focus:outline-hidden focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Indicates your intended check allocation ({formatCurrency(Number(interestAmount) || 0)})
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Introduction / Syndicate Message
                </label>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={interestMessage}
                  onChange={(e) => setInterestMessage(e.target.value)}
                  placeholder="e.g. Interested in discussing potential seed syndication and reviewing your customer metrics..."
                  className="w-full px-3.5 py-2.5 text-xs text-white bg-[#171A24] border border-[#2A2F42] rounded-xl focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {interestError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{interestError}</span>
                </div>
              )}

              {interestSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{interestSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#232735]">
                <button
                  type="button"
                  disabled={submittingInterest}
                  onClick={() => setInterestStartup(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingInterest}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 transition shadow-lg shadow-indigo-600/20"
                >
                  {submittingInterest ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending Interest...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Interest</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestorStartupDiscovery;
