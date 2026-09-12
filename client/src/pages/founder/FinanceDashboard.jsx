import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getFinanceSummary,
  getTransactions,
  createTransaction,
  deleteTransaction,
  updateFundingDetails,
} from '../../api/finance';
import { getMyStartups, getStartupById } from '../../api/startups';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Flame,
  Hourglass,
  Wallet,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Calendar,
  Layers,
  ArrowLeft,
  X,
  PieChart as PieIcon,
  BarChart3,
  Building2,
  ChevronDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const CATEGORIES = [
  'REVENUE',
  'SALARY',
  'MARKETING',
  'INFRASTRUCTURE',
  'SOFTWARE',
  'OPERATIONS',
  'LEGAL',
  'OFFICE',
  'OTHER',
];

const CATEGORY_COLORS = {
  REVENUE: '#10B981',
  SALARY: '#6366F1',
  MARKETING: '#F59E0B',
  INFRASTRUCTURE: '#06B6D4',
  SOFTWARE: '#8B5CF6',
  OPERATIONS: '#EC4899',
  LEGAL: '#64748B',
  OFFICE: '#F97316',
  OTHER: '#94A3B8',
};

const formatINR = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

const FinanceDashboard = () => {
  const { startupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [startups, setStartups] = useState([]);
  const [selectedStartupId, setSelectedStartupId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Transaction filter
  const [txFilter, setTxFilter] = useState('ALL'); // 'ALL' | 'INCOME' | 'EXPENSE'

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFundingModalOpen, setIsFundingModalOpen] = useState(false);
  const [submittingTx, setSubmittingTx] = useState(false);
  const [submittingFunding, setSubmittingFunding] = useState(false);
  const [modalError, setModalError] = useState('');

  // Add Transaction Form State
  const [txForm, setTxForm] = useState({
    type: 'EXPENSE',
    category: 'INFRASTRUCTURE',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  // Funding Form State
  const [fundingForm, setFundingForm] = useState({
    initialCapital: 0,
    fundingReceived: 0,
    fundingRequired: 0,
  });

  // 1. Fetch founder's startups and safely resolve matching startup
  useEffect(() => {
    let isMounted = true;
    const initStartups = async () => {
      try {
        const res = await getMyStartups();
        const list = res.startups || [];
        if (!isMounted) return;
        setStartups(list);

        if (list.length === 0) {
          setSelectedStartupId(null);
          setLoading(false);
          return;
        }

        // Verify if startupId in URL belongs to this founder's ventures
        let targetId = null;
        if (startupId) {
          const match = list.find((s) => (s.id || s._id) === startupId);
          if (match) {
            targetId = match.id || match._id;
          }
        }

        // If no URL startupId or it belongs to another founder, fallback to founder's first startup
        if (!targetId) {
          targetId = list[0].id || list[0]._id;
          navigate(`/finance/${targetId}`, { replace: true });
        }

        setSelectedStartupId(targetId);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load your ventures');
        setLoading(false);
      }
    };

    initStartups();
    return () => {
      isMounted = false;
    };
  }, [startupId, navigate]);

  // 2. Fetch financial data whenever selectedStartupId is verified
  const loadFinanceData = async () => {
    if (!selectedStartupId) return;
    setLoading(true);
    setError('');
    try {
      const [sumRes, txRes] = await Promise.all([
        getFinanceSummary(selectedStartupId),
        getTransactions(selectedStartupId),
      ]);

      setSummary(sumRes);
      setTransactions(txRes.data || []);

      setFundingForm({
        initialCapital: sumRes.initialCapital || 0,
        fundingReceived: sumRes.fundingReceived || 0,
        fundingRequired: sumRes.fundingRequired || 0,
      });
    } catch (err) {
      if (err.status === 401) {
        setError('Please log in again.');
      } else if (err.status === 403) {
        setError("You don't have permission to access this startup's finances.");
      } else if (err.status === 404) {
        setError('Startup not found.');
      } else if (err.status === 400) {
        setError(err.message || 'Invalid request. Please check your input.');
      } else {
        setError('Unable to load financial data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStartupId) {
      loadFinanceData();
    }
  }, [selectedStartupId]);

  // Handle Add Transaction
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (submittingTx) return;

    const amt = Number(txForm.amount);
    if (isNaN(amt) || amt <= 0) {
      setModalError('Amount must be a positive number greater than 0');
      return;
    }

    if (!txForm.type || !['INCOME', 'EXPENSE'].includes(txForm.type)) {
      setModalError('Transaction type must be INCOME or EXPENSE');
      return;
    }

    if (!txForm.category || !CATEGORIES.includes(txForm.category)) {
      setModalError('Please select a valid category');
      return;
    }

    if (!txForm.date) {
      setModalError('Please select a valid date');
      return;
    }

    setSubmittingTx(true);
    setModalError('');
    try {
      await createTransaction(selectedStartupId, {
        type: txForm.type,
        category: txForm.category,
        amount: amt,
        description: txForm.description ? txForm.description.trim() : '',
        date: txForm.date,
      });

      setIsAddModalOpen(false);
      setTxForm({
        type: 'EXPENSE',
        category: 'INFRASTRUCTURE',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      setActionSuccess('Transaction recorded successfully');
      setTimeout(() => setActionSuccess(''), 3000);
      await loadFinanceData();
    } catch (err) {
      setModalError(err.message || 'Failed to add transaction');
    } finally {
      setSubmittingTx(false);
    }
  };

  // Handle Delete Transaction
  const handleDeleteTransaction = async (transactionId) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await deleteTransaction(transactionId);
      setActionSuccess('Transaction deleted');
      setTimeout(() => setActionSuccess(''), 3000);
      await loadFinanceData();
    } catch (err) {
      setError(err.message || 'Failed to delete transaction');
    }
  };

  // Handle Update Funding
  const handleUpdateFunding = async (e) => {
    e.preventDefault();
    if (submittingFunding) return;

    const initCap = Number(fundingForm.initialCapital);
    const fundRec = Number(fundingForm.fundingReceived);
    const fundReq = Number(fundingForm.fundingRequired);

    if (isNaN(initCap) || initCap < 0) {
      setModalError('Initial capital must be a non-negative number');
      return;
    }
    if (isNaN(fundRec) || fundRec < 0) {
      setModalError('Funding received must be a non-negative number');
      return;
    }
    if (isNaN(fundReq) || fundReq < 0) {
      setModalError('Funding required must be a non-negative number');
      return;
    }

    setSubmittingFunding(true);
    setModalError('');
    try {
      await updateFundingDetails(selectedStartupId, {
        initialCapital: initCap,
        fundingReceived: fundRec,
        fundingRequired: fundReq,
      });

      setIsFundingModalOpen(false);
      setActionSuccess('Funding details updated');
      setTimeout(() => setActionSuccess(''), 3000);
      await loadFinanceData();
    } catch (err) {
      setModalError(err.message || 'Failed to update funding details');
    } finally {
      setSubmittingFunding(false);
    }
  };

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    if (txFilter === 'ALL') return true;
    return tx.type === txFilter;
  });

  // If founder has no startups
  if (!loading && startups.length === 0) {
    return (
      <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-[#11141C] p-8 rounded-2xl border border-[#232735] shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-800/40 flex items-center justify-center mx-auto">
            <DollarSign className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">No Startup Registered</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Create your first venture to activate the Startup Financial Operating System,
            manage ledger entries, track burn rate, and calculate cash runway.
          </p>
          <Link
            to="/startups/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Startup</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-7">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#11141C] p-6 sm:p-7 rounded-2xl border border-[#232735] shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {startups.find((s) => (s.id || s._id) === selectedStartupId)?.name || summary?.startup?.name || 'Startup'} Financial Health
                </h1>
                {summary?.fundingStatus && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      summary.fundingStatus === 'FULLY_FUNDED'
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                        : 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                    }`}
                  >
                    {summary.fundingStatus === 'FULLY_FUNDED' ? 'Fully Funded' : 'Funding Needed'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Deterministic cash ledger, burn rate calculation, and runway forecasting
              </p>
            </div>
          </div>

          {/* Startup Selector & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {startups.length > 1 && (
              <div className="relative">
                <select
                  value={selectedStartupId || ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedStartupId(id);
                    navigate(`/finance/${id}`);
                  }}
                  className="bg-[#171A24] border border-[#2A2F42] text-xs font-semibold text-white rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-indigo-500 appearance-none"
                >
                  {startups.map((s) => (
                    <option key={s.id || s._id} value={s.id || s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            <button
              onClick={() => setIsFundingModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] hover:text-white transition"
            >
              <Wallet className="w-3.5 h-3.5 text-indigo-400" />
              <span>Update Funding</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Transaction</span>
            </button>
          </div>
        </div>

        {/* Success / Error Alerts */}
        {actionSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 flex items-center gap-2 text-xs text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/50 flex items-center gap-2 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center bg-[#11141C] rounded-2xl border border-[#232735] shadow-xl">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
            <p className="text-xs text-slate-400 font-medium">Computing financial ledger metrics...</p>
          </div>
        ) : summary ? (
          <>
            {/* Row 1: Core Financial Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Current Cash */}
              <div className="p-6 rounded-2xl bg-[#11141C] border border-[#232735] shadow-xl space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  <span>Current Cash Balance</span>
                  <Wallet className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-black text-white">
                  {formatINR(summary.currentCash)}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-[#232735]">
                  <span>Capital + Net Flow</span>
                  <span className={summary.currentCash >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {summary.currentCash >= 0 ? 'Solvent' : 'Deficit'}
                  </span>
                </div>
              </div>

              {/* Monthly Burn */}
              <div className="p-6 rounded-2xl bg-[#11141C] border border-[#232735] shadow-xl space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  <span>Monthly Burn Rate</span>
                  <Flame className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-black text-amber-400">
                  {formatINR(summary.monthlyBurn)}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-[#232735]">
                  <span>Average Outflow / mo</span>
                  <span>{summary.totalExpenses > 0 ? 'Active' : 'Zero Burn'}</span>
                </div>
              </div>

              {/* Runway Months */}
              <div className="p-6 rounded-2xl bg-[#11141C] border border-[#232735] shadow-xl space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  <span>Cash Runway</span>
                  <Hourglass className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-3xl font-black text-white">
                  {summary.runwayMonths !== null ? `${summary.runwayMonths} mo` : 'N/A'}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-[#232735]">
                  <span>At current burn rate</span>
                  <span
                    className={
                      summary.runwayMonths === null
                        ? 'text-slate-400'
                        : summary.runwayMonths > 6
                        ? 'text-emerald-400 font-semibold'
                        : 'text-amber-400 font-semibold'
                    }
                  >
                    {summary.runwayMonths === null
                      ? 'No active burn'
                      : summary.runwayMonths > 6
                      ? 'Healthy Runway'
                      : 'Fundraising Needed'}
                  </span>
                </div>
              </div>
            </div>

            {/* Row 2: Cash Flow Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Revenue */}
              <div className="p-5 rounded-xl bg-[#11141C] border border-[#232735] shadow-xl space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  <span>Total Revenue / Income</span>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-400">
                  {formatINR(summary.totalIncome)}
                </div>
                <div className="text-[11px] text-slate-500">Earned operational revenue</div>
              </div>

              {/* Total Expenses */}
              <div className="p-5 rounded-xl bg-[#11141C] border border-[#232735] shadow-xl space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  <span>Total Expenses</span>
                  <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <div className="text-2xl font-bold text-rose-400">
                  {formatINR(summary.totalExpenses)}
                </div>
                <div className="text-[11px] text-slate-500">Cumulative operating costs</div>
              </div>

              {/* Net Cash Flow */}
              <div className="p-5 rounded-xl bg-[#11141C] border border-[#232735] shadow-xl space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  <span>Net Cash Flow</span>
                  <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div
                  className={`text-2xl font-bold ${
                    summary.netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {summary.netCashFlow >= 0 ? '+' : ''}
                  {formatINR(summary.netCashFlow)}
                </div>
                <div className="text-[11px] text-slate-500">Income minus expenses</div>
              </div>
            </div>

            {/* Funding Progress Section */}
            <div className="p-6 rounded-2xl bg-[#11141C] border border-[#232735] shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-800/40 flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Venture Capital & Funding Target</h2>
                    <p className="text-xs text-slate-400">
                      Tracking initial capital, equity rounds, and capital deficit
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsFundingModalOpen(true)}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline hover:no-underline self-start sm:self-auto"
                >
                  Edit Capital Parameters
                </button>
              </div>

              {/* Funding Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-2">
                <div className="p-3.5 rounded-xl bg-[#171A24] border border-[#2A2F42]">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Initial Capital
                  </span>
                  <span className="text-sm font-bold text-white block mt-0.5">
                    {formatINR(summary.initialCapital)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#171A24] border border-[#2A2F42]">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Funding Received
                  </span>
                  <span className="text-sm font-bold text-emerald-400 block mt-0.5">
                    {formatINR(summary.fundingReceived)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#171A24] border border-[#2A2F42]">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Target Requirement
                  </span>
                  <span className="text-sm font-bold text-indigo-400 block mt-0.5">
                    {formatINR(summary.fundingRequired)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#171A24] border border-[#2A2F42]">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Capital Gap
                  </span>
                  <span className="text-sm font-bold text-amber-400 block mt-0.5">
                    {formatINR(summary.fundingGap)}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              {summary.fundingRequired > 0 && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Target Achievement</span>
                    <span className="font-bold text-white">
                      {Math.min(
                        100,
                        Math.round((summary.fundingReceived / summary.fundingRequired) * 100)
                      )}
                      % funded
                    </span>
                  </div>
                  <div className="w-full bg-[#0B0D12] rounded-full h-3 overflow-hidden border border-[#232735]">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(
                          100,
                          (summary.fundingReceived / summary.fundingRequired) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Visual Analytics Charts (Recharts) */}
            {summary.monthlyTrend.length > 0 || summary.categoryBreakdown.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Chart 1: Cashflow Trend */}
                <div className="p-6 rounded-2xl bg-[#11141C] border border-[#232735] shadow-xl space-y-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-bold text-white">Cashflow Trend (Income vs Outflow)</h3>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summary.monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="month" stroke="#64748B" fontSize={11} />
                        <YAxis stroke="#64748B" fontSize={11} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#171A24', borderColor: '#2A2F42', borderRadius: 8, fontSize: 12 }}
                          formatter={(value) => [formatINR(value), '']}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="income" name="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expense" name="Expense" fill="#EF4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2: Category Breakdown */}
                <div className="p-6 rounded-2xl bg-[#11141C] border border-[#232735] shadow-xl space-y-4">
                  <div className="flex items-center gap-2">
                    <PieIcon className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-bold text-white">Expense Distribution</h3>
                  </div>

                  <div className="h-64 w-full flex items-center justify-center">
                    {summary.categoryBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={summary.categoryBreakdown}
                            dataKey="amount"
                            nameKey="category"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={4}
                          >
                            {summary.categoryBreakdown.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={CATEGORY_COLORS[entry.category] || '#6366F1'}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: '#171A24', borderColor: '#2A2F42', borderRadius: 8, fontSize: 12 }}
                            formatter={(value) => [formatINR(value), '']}
                          />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-xs text-slate-500 italic">No expense entries recorded yet.</div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Transactions Ledger Table */}
            <div className="bg-[#11141C] rounded-2xl border border-[#232735] shadow-xl p-6 sm:p-7 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-800/40 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Financial Ledger Entries</h2>
                    <p className="text-xs text-slate-400">
                      {transactions.length} record(s) logged for this startup
                    </p>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#171A24] border border-[#2A2F42] self-start sm:self-auto">
                  {['ALL', 'INCOME', 'EXPENSE'].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setTxFilter(f)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        txFilter === f
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {f === 'ALL' ? 'All' : f === 'INCOME' ? 'Income' : 'Expenses'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transactions List */}
              {filteredTransactions.length === 0 ? (
                <div className="py-12 px-4 rounded-xl border border-dashed border-[#2A2F42] text-center space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-[#171A24] text-slate-400 flex items-center justify-center mx-auto">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-white">
                    Your financial dashboard is ready.
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    No financial transactions have been recorded yet. Click below to add your first revenue or operating cost entry.
                  </p>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add First Transaction</span>
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[#232735]">
                  {filteredTransactions.map((tx) => (
                    <div
                      key={tx._id || tx.id}
                      className="py-3.5 flex items-center justify-between gap-3 group transition"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                            tx.type === 'INCOME'
                              ? 'bg-emerald-950/60 border-emerald-800/40 text-emerald-400'
                              : 'bg-rose-950/60 border-rose-800/40 text-rose-400'
                          }`}
                        >
                          {tx.type === 'INCOME' ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white truncate">
                              {tx.description || tx.category}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded border uppercase bg-[#171A24] text-slate-400 border-[#2A2F42]">
                              {tx.category}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{new Date(tx.date).toLocaleDateString()}</span>
                            {tx.createdBy?.name && (
                              <>
                                <span>•</span>
                                <span>By {tx.createdBy.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`text-sm font-bold ${
                            tx.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {tx.type === 'INCOME' ? '+' : '-'}
                          {formatINR(tx.amount)}
                        </span>

                        <button
                          onClick={() => handleDeleteTransaction(tx._id || tx.id)}
                          type="button"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition opacity-0 group-hover:opacity-100"
                          title="Delete transaction"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* MODAL 1: Add Transaction */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#11141C] max-w-md w-full rounded-2xl border border-[#232735] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#232735]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-800/40 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Record Transaction</h3>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setModalError('');
                }}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-400">
                {modalError}
              </div>
            )}

            <form onSubmit={handleAddTransaction} className="space-y-4">
              {/* Type Toggle */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Transaction Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTxForm({ ...txForm, type: 'INCOME', category: 'REVENUE' })}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-1.5 ${
                      txForm.type === 'INCOME'
                        ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400 shadow-sm'
                        : 'bg-[#171A24] border-[#2A2F42] text-slate-400 hover:text-white'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Income / Revenue</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxForm({ ...txForm, type: 'EXPENSE', category: 'INFRASTRUCTURE' })}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-1.5 ${
                      txForm.type === 'EXPENSE'
                        ? 'bg-rose-950/60 border-rose-800/60 text-rose-400 shadow-sm'
                        : 'bg-[#171A24] border-[#2A2F42] text-slate-400 hover:text-white'
                    }`}
                  >
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>Expense / Cost</span>
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Amount (₹ INR) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    required
                    placeholder="e.g. 50000"
                    value={txForm.amount}
                    onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-[#171A24] border border-[#2A2F42] text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Category *
                </label>
                <select
                  value={txForm.category}
                  onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#171A24] border border-[#2A2F42] text-white text-sm focus:outline-none focus:border-indigo-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. AWS monthly cloud hosting"
                  value={txForm.description}
                  onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#171A24] border border-[#2A2F42] text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Date */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  value={txForm.date}
                  onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#171A24] border border-[#2A2F42] text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#232735]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTx}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingTx ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Record Transaction</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Update Funding */}
      {isFundingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#11141C] max-w-md w-full rounded-2xl border border-[#232735] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#232735]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-800/40 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Update Capital & Funding</h3>
              </div>
              <button
                onClick={() => {
                  setIsFundingModalOpen(false);
                  setModalError('');
                }}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-400">
                {modalError}
              </div>
            )}

            <form onSubmit={handleUpdateFunding} className="space-y-4">
              {/* Initial Capital */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Initial / Founder Capital (₹ INR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={fundingForm.initialCapital}
                  onChange={(e) =>
                    setFundingForm({ ...fundingForm, initialCapital: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#171A24] border border-[#2A2F42] text-white text-sm focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Founders' initial equity contribution or starting cash
                </span>
              </div>

              {/* Funding Received */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Funding Received to Date (₹ INR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={fundingForm.fundingReceived}
                  onChange={(e) =>
                    setFundingForm({ ...fundingForm, fundingReceived: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#171A24] border border-[#2A2F42] text-white text-sm focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Capital already wired from angel investors, accelerators, or grants
                </span>
              </div>

              {/* Funding Required */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Total Funding Target / Required (₹ INR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={fundingForm.fundingRequired}
                  onChange={(e) =>
                    setFundingForm({ ...fundingForm, fundingRequired: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#171A24] border border-[#2A2F42] text-white text-sm focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Target round size to achieve next major milestone
                </span>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#232735]">
                <button
                  type="button"
                  onClick={() => setIsFundingModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingFunding}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingFunding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Save Capital Info</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceDashboard;
