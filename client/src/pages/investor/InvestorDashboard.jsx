import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getInvestorProfile,
  createInvestorProfile,
  updateInvestorProfile,
  getInvestorMatches,
} from '../../api/investor';
import { getMyFundingInterests } from '../../api/fundingInterest';
import {
  Compass,
  Sparkles,
  TrendingUp,
  Briefcase,
  Layers,
  Banknote,
  CheckCircle2,
  Clock,
  ArrowRight,
  Loader2,
  AlertCircle,
  SlidersHorizontal,
  X,
  ShieldCheck,
  Building2,
  Send,
} from 'lucide-react';

const STAGE_OPTIONS = ['IDEA', 'MVP', 'EARLY_TRACTION', 'GROWTH'];
const INDUSTRY_SUGGESTIONS = [
  'Agriculture',
  'AI',
  'FinTech',
  'HealthTech',
  'EdTech',
  'SaaS',
  'Cybersecurity',
  'E-commerce',
  'CleanTech',
  'Logistics',
];

const formatCurrency = (val) => {
  const num = Number(val) || 0;
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(0)}L`;
  return `₹${num.toLocaleString('en-IN')}`;
};

const InvestorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Profile Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firmName: '',
    bio: '',
    industries: [],
    investmentStages: [],
    minInvestment: 500000,
    maxInvestment: 5000000,
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Profile
      let profData = null;
      try {
        const profRes = await getInvestorProfile();
        profData = profRes.data || null;
        setProfile(profData);
        if (profData) {
          setProfileForm({
            firmName: profData.firmName || '',
            bio: profData.bio || '',
            industries: profData.industries || [],
            investmentStages: profData.investmentStages || [],
            minInvestment: profData.minInvestment || 500000,
            maxInvestment: profData.maxInvestment || 5000000,
          });
        }
      } catch (err) {
        // Profile might not exist yet (404), which is normal for first-time login
        setProfile(null);
      }

      // 2. Fetch Matches
      try {
        const matchesRes = await getInvestorMatches();
        setMatches(matchesRes.data || []);
      } catch (err) {
        setMatches([]);
      }

      // 3. Fetch Funding Interests
      try {
        const intRes = await getMyFundingInterests();
        setInterests(intRes.data || []);
      } catch (err) {
        setInterests([]);
      }
    } catch (err) {
      console.error('Error loading investor dashboard:', err);
      setError('Unable to load investor dashboard details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      if (profile) {
        await updateInvestorProfile(profileForm);
      } else {
        await createInvestorProfile(profileForm);
      }
      setIsEditModalOpen(false);
      await fetchData();
    } catch (err) {
      console.error('Error saving profile:', err);
      alert(err.message || 'Failed to save investor preferences');
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleIndustry = (ind) => {
    setProfileForm((prev) => {
      const exists = prev.industries.includes(ind);
      return {
        ...prev,
        industries: exists
          ? prev.industries.filter((i) => i !== ind)
          : [...prev.industries, ind],
      };
    });
  };

  const toggleStage = (st) => {
    setProfileForm((prev) => {
      const exists = prev.investmentStages.includes(st);
      return {
        ...prev,
        investmentStages: exists
          ? prev.investmentStages.filter((s) => s !== st)
          : [...prev.investmentStages, st],
      };
    });
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Loading Investor Portal...
        </p>
      </div>
    );
  }

  const topMatches = matches.slice(0, 3);
  const isProfileComplete = profile && profile.industries?.length > 0 && profile.investmentStages?.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 sm:p-8 rounded-2xl bg-[#11141C] border border-[#232735] shadow-xl relative overflow-hidden">
        <div className="space-y-1.5 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/60 text-amber-400 border border-amber-800/60 mb-1">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Investor Discovery Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Welcome, {user?.name || 'Venture Partner'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Discover vetted startups, review deterministic thesis match scores, and express funding interest directly to venture founders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-200 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] hover:text-white transition shadow-sm"
          >
            <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
            <span>{profile ? 'Edit Preferences' : 'Setup Preferences'}</span>
          </button>
          <Link
            to="/investor/startups"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition"
          >
            <Compass className="w-4 h-4" />
            <span>Discover Startups</span>
          </Link>
        </div>

        {/* Ambient subtle glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid: Preferences & Profile Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Investment Preferences */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#11141C] border border-[#232735] shadow-lg flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#232735] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-800/50 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Investment Preferences</h2>
                  <p className="text-[11px] text-slate-400">
                    {profile?.firmName || 'Independent Investor'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                Configure
              </button>
            </div>

            {/* Preferences Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Industries */}
              <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Target Industries
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {profile?.industries?.length > 0 ? (
                    profile.industries.map((ind) => (
                      <span
                        key={ind}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-950/60 text-indigo-300 border border-indigo-800/60"
                      >
                        {ind}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">None specified</span>
                  )}
                </div>
              </div>

              {/* Stages */}
              <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Investment Stages
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {profile?.investmentStages?.length > 0 ? (
                    profile.investmentStages.map((st) => (
                      <span
                        key={st}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/60"
                      >
                        {st}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">None specified</span>
                  )}
                </div>
              </div>

              {/* Investment Range */}
              <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Ticket Size Range
                </span>
                <p className="text-sm font-bold text-white">
                  {profile
                    ? `${formatCurrency(profile.minInvestment)} — ${formatCurrency(profile.maxInvestment)}`
                    : '₹5L — ₹50L'}
                </p>
                <span className="text-[10px] text-slate-400 block">Typical initial check size</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-[#232735]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Matching algorithm tuned to your active mandate</span>
            </span>
            <Link
              to="/investor/startups"
              className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              <span>View All {matches.length} Matches</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 2: Profile Status & Expressed Interests */}
        <div className="p-6 rounded-2xl bg-[#11141C] border border-[#232735] shadow-lg flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span>Deal-Flow Activity</span>
            </h2>

            <div className="space-y-3 pt-1">
              <div className="p-3.5 rounded-xl bg-[#171A24] border border-[#2A2F42] flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">Profile Mandate</span>
                  <span className="text-xs font-bold text-white">
                    {isProfileComplete ? 'Fully Configured' : 'Needs Preferences'}
                  </span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    isProfileComplete
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                      : 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                  }`}
                >
                  {isProfileComplete ? 'ACTIVE' : 'INCOMPLETE'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#171A24] border border-[#2A2F42] flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">Startups Analyzed</span>
                  <span className="text-xs font-bold text-white">{matches.length} Ventures</span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-400 border border-indigo-800/50">
                  Live
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#171A24] border border-[#2A2F42] flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">Funding Interests Sent</span>
                  <span className="text-xs font-bold text-white">{interests.length} Submissions</span>
                </div>
                <Link
                  to="/investor/interests"
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  View
                </Link>
              </div>
            </div>
          </div>

          <Link
            to="/investor/startups"
            className="w-full py-2.5 rounded-xl text-xs font-semibold text-center text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition block"
          >
            Start Discovering Startups
          </Link>
        </div>
      </div>

      {/* Top Matched Startups Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Top Recommended Startups</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#171A24] text-slate-400 border border-[#2A2F42]">
              Deterministic Fit
            </span>
          </div>
          <Link
            to="/investor/startups"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
          >
            <span>Explore full deal-flow</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {topMatches.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#11141C] border border-[#232735] text-center space-y-3">
            <p className="text-xs text-slate-400">
              No matching startups found. Ensure founders have registered active ventures in the system.
            </p>
            <Link
              to="/investor/startups"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition"
            >
              Browse All Startups
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {topMatches.map((m) => {
              const scoreColor =
                m.matchScore >= 80
                  ? 'text-emerald-400 border-emerald-800/60 bg-emerald-950/60'
                  : m.matchScore >= 60
                  ? 'text-indigo-400 border-indigo-800/60 bg-indigo-950/60'
                  : 'text-amber-400 border-amber-800/60 bg-amber-950/60';

              return (
                <div
                  key={m.startupId}
                  className="p-5 rounded-2xl bg-[#11141C] border border-[#232735] hover:border-indigo-900/60 transition shadow-lg flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition">
                          {m.startupName}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                          {m.tagline || m.problemStatement || 'Innovative venture'}
                        </p>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${scoreColor}`}>
                        {m.matchScore}%
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      <span className="px-2 py-0.5 rounded-md bg-[#171A24] text-slate-300 border border-[#2A2F42]">
                        {m.industry}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#171A24] text-slate-300 border border-[#2A2F42]">
                        {m.stage}
                      </span>
                    </div>

                    {/* Progress Breakdown Preview */}
                    <div className="space-y-1.5 pt-2 border-t border-[#232735] text-[11px]">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Industry Fit</span>
                        <span className="text-slate-200 font-semibold">{m.components.industryFit.score}/30</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Stage Fit</span>
                        <span className="text-slate-200 font-semibold">{m.components.stageFit.score}/20</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Funding Target</span>
                        <span className="text-indigo-300 font-semibold">{formatCurrency(m.fundingRequired)}</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    to={`/startups/${m.startupId}`}
                    className="w-full py-2 rounded-xl text-xs font-semibold text-center text-slate-300 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] hover:text-white transition flex items-center justify-center gap-1.5"
                  >
                    <span>View Venture Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit / Setup Preferences Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#11141C] max-w-xl w-full rounded-2xl border border-[#232735] p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-[#232735] pb-4">
              <div className="flex items-center gap-2.5">
                <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Investment Thesis Preferences</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#171A24] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Firm or Syndicate Name
                </label>
                <input
                  type="text"
                  value={profileForm.firmName}
                  onChange={(e) => setProfileForm({ ...profileForm, firmName: e.target.value })}
                  placeholder="e.g. Green Ventures Capital"
                  className="w-full px-3.5 py-2.5 text-xs text-white bg-[#171A24] border border-[#2A2F42] rounded-xl focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Investor Bio & Thesis
                </label>
                <textarea
                  rows={3}
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  placeholder="e.g. Seed fund backing bold founders in climate, agritech, and AI..."
                  className="w-full px-3.5 py-2.5 text-xs text-white bg-[#171A24] border border-[#2A2F42] rounded-xl focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Preferred Industries */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Target Industries (Select all that apply)
                </label>
                <div className="flex flex-wrap gap-2">
                  {INDUSTRY_SUGGESTIONS.map((ind) => {
                    const selected = profileForm.industries.includes(ind);
                    return (
                      <button
                        key={ind}
                        type="button"
                        onClick={() => toggleIndustry(ind)}
                        className={`text-xs px-3 py-1 rounded-full font-semibold border transition ${
                          selected
                            ? 'bg-indigo-600 text-white border-indigo-500'
                            : 'bg-[#171A24] text-slate-400 border-[#2A2F42] hover:text-slate-200'
                        }`}
                      >
                        {ind}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preferred Stages */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Preferred Investment Stages
                </label>
                <div className="flex flex-wrap gap-2">
                  {STAGE_OPTIONS.map((st) => {
                    const selected = profileForm.investmentStages.includes(st);
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => toggleStage(st)}
                        className={`text-xs px-3 py-1 rounded-full font-semibold border transition ${
                          selected
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-[#171A24] text-slate-400 border-[#2A2F42] hover:text-slate-200'
                        }`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Investment Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Minimum Investment (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={50000}
                    value={profileForm.minInvestment}
                    onChange={(e) => setProfileForm({ ...profileForm, minInvestment: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-xs text-white bg-[#171A24] border border-[#2A2F42] rounded-xl focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Maximum Investment (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={100000}
                    value={profileForm.maxInvestment}
                    onChange={(e) => setProfileForm({ ...profileForm, maxInvestment: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-xs text-white bg-[#171A24] border border-[#2A2F42] rounded-xl focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#232735]">
                <button
                  type="button"
                  disabled={savingProfile}
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 transition shadow-lg shadow-indigo-600/20"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Preferences</span>
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

export default InvestorDashboard;
