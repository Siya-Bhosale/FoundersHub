/**
 * Phase 8 — Startup Finance Automated Test Suite
 * Covers all 34 prompt verification requirements:
 * - Transaction creation (Income, Expense), validation rules, positive amounts
 * - Transaction listing, filtering, and deletion
 * - Funding updates (initialCapital, fundingReceived, fundingRequired)
 * - Access control (Founder only for mutation, active team view, 403 for unrelated/dev/investor)
 * - Deterministic calculations: totalIncome, totalExpenses, netCashFlow, currentCash, monthlyBurn, runwayMonths, fundingGap, fundingStatus
 * - Zero burn division-by-zero protection
 * - Regression checks on Phase 7 Execution Intelligence, Join Requests, Startup CRUD, Auth
 */

const dotenv = require('dotenv');
dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const config = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, config);
  const status = res.status;
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status, data, headers: res.headers };
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function registerAndLogin(name, email, password, role) {
  const regRes = await request('/auth/register', {
    method: 'POST',
    body: { name, email, password, role },
  });
  if (regRes.status !== 201) {
    console.error('Registration failed:', regRes.data);
    return { token: null, user: null };
  }
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  if (loginRes.status !== 200) {
    console.error('Login failed:', loginRes.data);
    return { token: null, user: regRes.data.user };
  }
  return { token: loginRes.data.token, user: regRes.data.user };
}

async function runTests() {
  console.log('\n==================================================');
  console.log('PHASE 8 — STARTUP FINANCE TEST SUITE');
  console.log('==================================================\n');

  const timestamp = Date.now();

  // 1. Create Founder A
  const founderA = await registerAndLogin(
    'Finance Founder',
    `fin_founder_${timestamp}@test.com`,
    'Password123!',
    'FOUNDER'
  );
  assert(founderA.token != null, 'Founder A registered and authenticated');
  const founderAToken = founderA.token;

  // 2. Create Startup A
  const startupARes = await request('/startups', {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderAToken}` },
    body: {
      name: `FinTech Flow ${timestamp}`,
      tagline: 'Automated Financial Operations for Startups',
      problemStatement: 'Early-stage founders lack real-time visibility into burn rate and runway.',
      solution: 'Deterministic financial ledger with runway forecasting.',
      industry: 'FinTech',
      stage: 'MVP',
      description: 'Streamlined venture cash flow tracker.',
    },
  });
  assert(startupARes.status === 201, 'Startup A created successfully');
  const startupAId = startupARes.data?.startup?.id;

  // 3. Create Developer A (Team Member)
  const devA = await registerAndLogin(
    'Developer Dan',
    `fin_dev_${timestamp}@test.com`,
    'Password123!',
    'DEVELOPER'
  );
  const devAToken = devA.token;
  await request('/developers/profile', {
    method: 'POST',
    headers: { Authorization: `Bearer ${devAToken}` },
    body: {
      bio: 'FinTech full-stack engineer.',
      skills: ['Node.js', 'React', 'MongoDB'],
      experience: 'SENIOR',
      availability: 'AVAILABLE',
    },
  });

  // Developer A joins Startup A & Founder accepts
  const joinReqRes = await request('/join-requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${devAToken}` },
    body: { startupId: startupAId, message: 'Ready to build finance engine.' },
  });
  const joinRequestId = joinReqRes.data?.request?.id || joinReqRes.data?.data?._id;
  await request(`/join-requests/${joinRequestId}/accept`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${founderAToken}` },
  });

  // 4. Create Founder B (Unrelated)
  const founderB = await registerAndLogin(
    'Founder Bob',
    `fin_founderB_${timestamp}@test.com`,
    'Password123!',
    'FOUNDER'
  );
  const founderBToken = founderB.token;

  // 5. Create Investor (Unrelated)
  const investor = await registerAndLogin(
    'Investor Ian',
    `fin_investor_${timestamp}@test.com`,
    'Password123!',
    'INVESTOR'
  );
  const investorToken = investor.token;

  console.log('\n--- 1. Initial Empty Financial State & Zero-Burn Protection ---');

  const emptySummaryRes = await request(`/finance/${startupAId}/summary`, {
    headers: { Authorization: `Bearer ${founderAToken}` },
  });
  assert(emptySummaryRes.status === 200, 'Founder can retrieve initial financial summary');
  assert(emptySummaryRes.data?.totalIncome === 0, 'Initial totalIncome is 0');
  assert(emptySummaryRes.data?.totalExpenses === 0, 'Initial totalExpenses is 0');
  assert(emptySummaryRes.data?.netCashFlow === 0, 'Initial netCashFlow is 0');
  assert(emptySummaryRes.data?.monthlyBurn === 0, 'Initial monthlyBurn is 0');
  assert(emptySummaryRes.data?.runwayMonths === null, 'Zero burn does not divide by zero (runwayMonths is null)');

  console.log('\n--- 2. Updating Funding Information ---');

  // Update funding: initialCapital = 100000, fundingReceived = 500000, fundingRequired = 2500000
  const updateFundingRes = await request(`/finance/${startupAId}/funding`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${founderAToken}` },
    body: {
      initialCapital: 100000,
      fundingReceived: 500000,
      fundingRequired: 2500000,
    },
  });
  assert(updateFundingRes.status === 200, 'Founder can update funding information');
  assert(updateFundingRes.data?.funding?.fundingRequired === 2500000, 'fundingRequired updated to 2,500,000');
  assert(updateFundingRes.data?.funding?.fundingReceived === 500000, 'fundingReceived updated to 500,000');
  assert(updateFundingRes.data?.funding?.initialCapital === 100000, 'initialCapital updated to 100,000');

  // Negative funding values should be rejected
  const negFundingRes = await request(`/finance/${startupAId}/funding`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${founderAToken}` },
    body: { fundingRequired: -500 },
  });
  assert(negFundingRes.status === 400, 'Negative funding value rejected with 400');

  console.log('\n--- 3. Transaction Creation & Validation Rules ---');

  // Test 1: Create Income Transaction
  const incomeTx1 = await request(`/finance/${startupAId}/transactions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderAToken}` },
    body: {
      type: 'INCOME',
      category: 'REVENUE',
      amount: 250000,
      description: 'Enterprise subscription revenue',
      date: new Date(),
    },
  });
  assert(incomeTx1.status === 201, 'Founder can create INCOME transaction');
  const incomeTx1Id = incomeTx1.data?.data?._id;

  // Test 2: Create Expense Transaction 1 (Salary)
  const expenseTx1 = await request(`/finance/${startupAId}/transactions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderAToken}` },
    body: {
      type: 'EXPENSE',
      category: 'SALARY',
      amount: 80000,
      description: 'Lead developer payroll',
      date: new Date(),
    },
  });
  assert(expenseTx1.status === 201, 'Founder can create EXPENSE transaction');
  const expenseTx1Id = expenseTx1.data?.data?._id;

  // Test 3: Create Expense Transaction 2 (Infrastructure)
  const expenseTx2 = await request(`/finance/${startupAId}/transactions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderAToken}` },
    body: {
      type: 'EXPENSE',
      category: 'INFRASTRUCTURE',
      amount: 40000,
      description: 'Cloud servers and DB cluster',
      date: new Date(),
    },
  });
  assert(expenseTx2.status === 201, 'Founder can create second EXPENSE transaction');

  // Test 4: Invalid transaction type rejected
  const invalidTypeRes = await request(`/finance/${startupAId}/transactions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderAToken}` },
    body: {
      type: 'INVALID_TYPE',
      category: 'REVENUE',
      amount: 5000,
    },
  });
  assert(invalidTypeRes.status === 400, 'Invalid transaction type rejected with 400');

  // Test 5: Negative/zero amount rejected
  const zeroAmountRes = await request(`/finance/${startupAId}/transactions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderAToken}` },
    body: {
      type: 'INCOME',
      category: 'REVENUE',
      amount: 0,
    },
  });
  assert(zeroAmountRes.status === 400, 'Zero amount rejected with 400');

  const negAmountRes = await request(`/finance/${startupAId}/transactions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderAToken}` },
    body: {
      type: 'EXPENSE',
      category: 'MARKETING',
      amount: -1500,
    },
  });
  assert(negAmountRes.status === 400, 'Negative amount rejected with 400');

  // Test 6: Missing required fields rejected
  const missingFieldsRes = await request(`/finance/${startupAId}/transactions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderAToken}` },
    body: {},
  });
  assert(missingFieldsRes.status === 400, 'Missing required fields rejected with 400');

  console.log('\n--- 4. Deterministic Financial Metric Verification ---');

  // Fetch summary after transactions:
  // totalIncome = 250,000
  // totalExpenses = 80,000 + 40,000 = 120,000
  // netCashFlow = 250,000 - 120,000 = 130,000
  // currentCash = initialCapital (100,000) + fundingReceived (500,000) + netCashFlow (130,000) = 730,000
  // monthlyBurn = 120,000 (1 month active)
  // runwayMonths = 730,000 / 120,000 = 6.08
  // fundingGap = 2,500,000 - 500,000 = 2,000,000
  // fundingStatus = 'FUNDING_REQUIRED'

  const summaryRes = await request(`/finance/${startupAId}/summary`, {
    headers: { Authorization: `Bearer ${founderAToken}` },
  });
  assert(summaryRes.status === 200, 'Fetched updated financial summary');
  const s = summaryRes.data;

  assert(s.totalIncome === 250000, `totalIncome is exactly 250,000 (got ${s.totalIncome})`);
  assert(s.totalExpenses === 120000, `totalExpenses is exactly 120,000 (got ${s.totalExpenses})`);
  assert(s.netCashFlow === 130000, `netCashFlow is exactly 130,000 (got ${s.netCashFlow})`);
  assert(s.fundingReceived === 500000, `fundingReceived is exactly 500,000 (got ${s.fundingReceived})`);
  assert(s.fundingRequired === 2500000, `fundingRequired is exactly 2,500,000 (got ${s.fundingRequired})`);
  assert(s.currentCash === 730000, `currentCash is exactly 730,000 (got ${s.currentCash})`);
  assert(s.monthlyBurn === 120000, `monthlyBurn is exactly 120,000 (got ${s.monthlyBurn})`);
  assert(s.runwayMonths === 6.08, `runwayMonths is exactly 6.08 (got ${s.runwayMonths})`);
  assert(s.fundingGap === 2000000, `fundingGap is exactly 2,000,000 (got ${s.fundingGap})`);
  assert(s.fundingStatus === 'FUNDING_REQUIRED', `fundingStatus is FUNDING_REQUIRED (got ${s.fundingStatus})`);
  assert(Array.isArray(s.categoryBreakdown) && s.categoryBreakdown.length >= 2, 'Category breakdown calculated for charts');

  console.log('\n--- 5. Transactions Retrieval & Deletion ---');

  // Retrieve transactions list
  const txListRes = await request(`/finance/${startupAId}/transactions`, {
    headers: { Authorization: `Bearer ${founderAToken}` },
  });
  assert(txListRes.status === 200, 'Founder can retrieve transactions list');
  assert(txListRes.data?.count === 3, `Transaction count is 3 (got ${txListRes.data?.count})`);

  // Active Team Developer Dan can view transactions
  const devTxListRes = await request(`/finance/${startupAId}/transactions`, {
    headers: { Authorization: `Bearer ${devAToken}` },
  });
  assert(devTxListRes.status === 200, 'Active team developer can view transactions list');

  // Delete transaction 2 (expense 40,000)
  const delTxRes = await request(`/finance/transactions/${incomeTx1Id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${founderAToken}` },
  });
  assert(delTxRes.status === 200, 'Founder can delete transaction');

  // Verify deletion refreshed summary: totalIncome should become 0
  const afterDelSummary = await request(`/finance/${startupAId}/summary`, {
    headers: { Authorization: `Bearer ${founderAToken}` },
  });
  assert(afterDelSummary.data?.totalIncome === 0, 'After deleting income tx, totalIncome is 0');
  assert(afterDelSummary.data?.netCashFlow === -120000, 'netCashFlow updated to -120,000');

  console.log('\n--- 6. Security, Authentication & Role Restrictions ---');

  // Unauthenticated requests return 401
  const unauthRes = await request(`/finance/${startupAId}/summary`);
  assert(unauthRes.status === 401, 'Unauthenticated summary request returns 401');

  // Developer cannot create financial transactions (403)
  const devCreateTxRes = await request(`/finance/${startupAId}/transactions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${devAToken}` },
    body: { type: 'INCOME', category: 'REVENUE', amount: 50000 },
  });
  assert(devCreateTxRes.status === 403, 'Developer cannot create financial transactions (403 Forbidden)');

  // Developer cannot update funding (403)
  const devUpdateFundingRes = await request(`/finance/${startupAId}/funding`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${devAToken}` },
    body: { fundingRequired: 9999999 },
  });
  assert(devUpdateFundingRes.status === 403, 'Developer cannot update funding details (403 Forbidden)');

  // Investor cannot access private finance summary (403)
  const investorSummaryRes = await request(`/finance/${startupAId}/summary`, {
    headers: { Authorization: `Bearer ${investorToken}` },
  });
  assert(investorSummaryRes.status === 403, 'Investor cannot access private founder finance (403 Forbidden)');

  // Founder B cannot access Founder A's finance summary (403)
  const founderBSummaryRes = await request(`/finance/${startupAId}/summary`, {
    headers: { Authorization: `Bearer ${founderBToken}` },
  });
  assert(founderBSummaryRes.status === 403, "Founder B cannot access Founder A's finance (403 Forbidden)");

  // Founder B cannot delete Founder A's transaction (403)
  const founderBDelRes = await request(`/finance/transactions/${expenseTx1Id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${founderBToken}` },
  });
  assert(founderBDelRes.status === 403, "Founder B cannot delete Founder A's transaction (403 Forbidden)");

  console.log('\n--- 7. Regression Check on Prior Modules ---');

  // Phase 7 Execution Score
  const execScoreRes = await request(`/execution/startup/${startupAId}/score`, {
    headers: { Authorization: `Bearer ${founderAToken}` },
  });
  assert(execScoreRes.status === 200, 'Phase 7 Execution Score still works intact');

  // Phase 7 Tasks API
  const taskRes = await request(`/startups/${startupAId}/tasks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderAToken}` },
    body: { title: 'Implement Payment Gateway', priority: 'HIGH' },
  });
  assert(taskRes.status === 201, 'Phase 7 Task API still works intact');

  // Phase 5 Join Requests
  const myJoinReqRes = await request('/join-requests/my', {
    headers: { Authorization: `Bearer ${devAToken}` },
  });
  assert(myJoinReqRes.status === 200, 'Phase 5 Join Requests API still works intact');

  // Phase 4 AI Idea Analyzer
  const ideaRes = await request(`/ai/startup-analysis/${startupAId}`, {
    headers: { Authorization: `Bearer ${founderAToken}` },
  });
  assert([200, 404].includes(ideaRes.status), 'Phase 4 AI Startup Idea Analyzer endpoint intact');

  // Verify Zero Secrets or Passwords in Finance Responses
  const rawResponse = JSON.stringify(summaryRes.data);
  assert(
    !rawResponse.includes('passwordHash') && !rawResponse.includes(process.env.JWT_SECRET || 'secret'),
    'Zero sensitive credentials leaked in finance endpoints'
  );

  console.log('\n==================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
