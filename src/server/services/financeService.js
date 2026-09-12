const FinancialTransaction = require('../models/FinancialTransaction');
const Startup = require('../models/Startup');

/**
 * Calculates deterministic financial metrics for a startup.
 * Strictly computed from live database transactions & startup capital fields.
 */
async function calculateFinanceSummary(startupId) {
  const startup = await Startup.findById(startupId);
  if (!startup) {
    throw new Error('Startup not found');
  }

  const transactions = await FinancialTransaction.find({ startup: startupId }).sort({ date: 1 });

  let totalIncome = 0;
  let totalExpenses = 0;
  const categoryTotals = {};
  const monthlyDataMap = {};
  const expenseMonths = new Set();

  transactions.forEach((tx) => {
    const amount = Number(tx.amount) || 0;
    const monthKey = tx.date ? new Date(tx.date).toISOString().slice(0, 7) : 'Unknown';

    if (!monthlyDataMap[monthKey]) {
      monthlyDataMap[monthKey] = { month: monthKey, income: 0, expense: 0 };
    }

    if (tx.type === 'INCOME') {
      totalIncome += amount;
      monthlyDataMap[monthKey].income += amount;
    } else if (tx.type === 'EXPENSE') {
      totalExpenses += amount;
      monthlyDataMap[monthKey].expense += amount;
      expenseMonths.add(monthKey);

      // Accumulate category for expenses
      categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + amount;
    }
  });

  const initialCapital = Number(startup.initialCapital) || 0;
  const fundingReceived = Number(startup.fundingReceived) || 0;
  const fundingRequired = Number(startup.fundingRequired) || 0;

  // Net Cash Flow = Total Income - Total Expenses
  const netCashFlow = totalIncome - totalExpenses;

  // Current Cash = Initial Capital + Funding Received + Total Income - Total Expenses
  // Note: fundingReceived is NOT counted as income
  const currentCash = initialCapital + fundingReceived + totalIncome - totalExpenses;

  // Monthly Burn:
  // Average monthly expenses across active transaction months (minimum 1 month)
  const activeMonthsCount = Math.max(1, expenseMonths.size);
  const monthlyBurn = totalExpenses > 0 ? Math.round((totalExpenses / activeMonthsCount) * 100) / 100 : 0;

  // Runway Months:
  // Current Cash / Monthly Burn
  // If monthlyBurn === 0, avoid division-by-zero, return null
  let runwayMonths = null;
  if (monthlyBurn > 0) {
    if (currentCash <= 0) {
      runwayMonths = 0;
    } else {
      runwayMonths = Math.round((currentCash / monthlyBurn) * 100) / 100;
    }
  }

  // Funding Gap & Status
  const fundingGap = Math.max(0, fundingRequired - fundingReceived);
  const fundingStatus = fundingGap <= 0 && fundingRequired > 0 ? 'FULLY_FUNDED' : 'FUNDING_REQUIRED';

  // Format monthly trend array sorted chronologically
  const monthlyTrend = Object.values(monthlyDataMap).sort((a, b) => a.month.localeCompare(b.month));

  // Format category breakdown
  const categoryBreakdown = Object.keys(categoryTotals).map((cat) => ({
    category: cat,
    amount: categoryTotals[cat],
    percentage: totalExpenses > 0 ? Math.round((categoryTotals[cat] / totalExpenses) * 1000) / 10 : 0,
  }));

  return {
    totalIncome,
    totalExpenses,
    netCashFlow,
    fundingReceived,
    fundingRequired,
    initialCapital,
    currentCash,
    monthlyBurn,
    runwayMonths,
    fundingGap,
    fundingStatus,
    transactionCount: transactions.length,
    monthlyTrend,
    categoryBreakdown,
  };
}

module.exports = {
  calculateFinanceSummary,
};
