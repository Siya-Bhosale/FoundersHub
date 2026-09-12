/**
 * Phase 8 Finance Module Verification Suite
 * Tests all 30 points required by the Phase 8 specification + Real MongoDB AgriVision AI Data verification.
 */

const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const { execSync } = require('child_process');
const path = require('path');
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
    config.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
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

async function runAllTests() {
  console.log('\n==================================================');
  console.log('PHASE 8 FINANCE — COMPLETE 30-POINT VERIFICATION');
  console.log('==================================================\n');

  const ts = Date.now();

  // Setup roles
  const founderA = await registerAndLogin('Owner Founder', `owner_${ts}@test.com`, 'Password123!', 'FOUNDER');
  const founderB = await registerAndLogin('Other Founder', `other_${ts}@test.com`, 'Password123!', 'FOUNDER');
  const dev = await registerAndLogin('Developer Dan', `dev_${ts}@test.com`, 'Password123!', 'DEVELOPER');
  const investor = await registerAndLogin('Investor Ian', `inv_${ts}@test.com`, 'Password123!', 'INVESTOR');

  // Create isolated startup for tests
  const startupRes = await request('/startups', {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderA.token}` },
    body: {
      name: `Clean Venture ${ts}`,
      tagline: 'Modern Finance Ledger',
      problemStatement: 'Cash flow visibility',
      solution: 'Automated ledger',
      industry: 'FinTech',
      stage: 'MVP',
    },
  });
  assert(startupRes.status === 201, 'Startup created for tests');
  const startupId = startupRes.data?.startup?.id;

  console.log('\n--- Section 1: Verification Points 1 to 6 (CRUD by Founder) ---');

  // 1. Founder can access own finance summary
  const summary1 = await request(`/finance/${startupId}/summary`, {
    headers: { Authorization: `Bearer ${founderA.token}` },
  });
  assert(summary1.status === 200 && summary1.data?.totalIncome === 0, '1. Founder can access own finance summary');

  // 2. Founder can retrieve own transactions
  const txList1 = await request(`/finance/${startupId}/transactions`, {
    headers: { Authorization: `Bearer ${founderA.token}` },
  });
  assert(txList1.status === 200 && Array.isArray(txList1.data?.data), '2. Founder can retrieve own transactions');

  // 3. Founder can create income
  const createIncomeRes = await request(`/finance/${startupId}/transactions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderA.token}` },
    body: {
      type: 'INCOME',
      category: 'REVENUE',
      amount: 50000,
      description: 'Customer payment',
      date: '2026-09-12',
    },
  });
  assert(createIncomeRes.status === 201 && createIncomeRes.data?.data?.amount === 50000, '3. Founder can create income');
  const incomeTxId = createIncomeRes.data?.data?._id;

  // 4. Founder can create expense
  const createExpenseRes = await request(`/finance/${startupId}/transactions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderA.token}` },
    body: {
      type: 'EXPENSE',
      category: 'MARKETING',
      amount: 10000,
      description: 'Digital marketing campaign',
      date: '2026-09-12',
    },
  });
  assert(createExpenseRes.status === 201 && createExpenseRes.data?.data?.amount === 10000, '4. Founder can create expense');
  const expenseTxId = createExpenseRes.data?.data?._id;

  // 5. Founder can update funding
  const updateFundingRes = await request(`/finance/${startupId}/funding`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${founderA.token}` },
    body: {
      initialCapital: 100000,
      fundingReceived: 500000,
      fundingRequired: 2500000,
    },
  });
  assert(updateFundingRes.status === 200 && updateFundingRes.data?.funding?.fundingRequired === 2500000, '5. Founder can update funding');

  // 6. Founder can delete transaction
  const tempTxRes = await request(`/finance/${startupId}/transactions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderA.token}` },
    body: {
      type: 'EXPENSE',
      category: 'OFFICE',
      amount: 2000,
      description: 'Temporary expense to delete',
      date: '2026-09-12',
    },
  });
  const tempTxId = tempTxRes.data?.data?._id;
  const deleteTxRes = await request(`/finance/transactions/${tempTxId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${founderA.token}` },
  });
  assert(deleteTxRes.status === 200, '6. Founder can delete transaction');

  console.log('\n--- Section 2: Verification Points 7 to 12 (Security & Status Codes) ---');

  // 7. Another founder cannot access finance
  const otherFounderSummary = await request(`/finance/${startupId}/summary`, {
    headers: { Authorization: `Bearer ${founderB.token}` },
  });
  assert(otherFounderSummary.status === 403, '7. Another founder cannot access finance (403)');

  // 8. Developer cannot access private finance
  const devSummary = await request(`/finance/${startupId}/summary`, {
    headers: { Authorization: `Bearer ${dev.token}` },
  });
  assert(devSummary.status === 403, '8. Developer cannot access private finance (403)');

  // 9. Investor cannot access private finance
  const investorSummary = await request(`/finance/${startupId}/summary`, {
    headers: { Authorization: `Bearer ${investor.token}` },
  });
  assert(investorSummary.status === 403, '9. Investor cannot access private finance (403)');

  // 10. Unauthenticated user receives 401
  const unauthRes = await request(`/finance/${startupId}/summary`);
  assert(unauthRes.status === 401, '10. Unauthenticated user receives 401');

  // 11. Invalid startup ID returns 400
  const invalidIdRes = await request('/finance/invalid-object-id/summary', {
    headers: { Authorization: `Bearer ${founderA.token}` },
  });
  assert(invalidIdRes.status === 400, '11. Invalid startup ID returns 400');

  // 12. Nonexistent startup returns 404
  const nonexistentRes = await request('/finance/6aa000000000000000000000/summary', {
    headers: { Authorization: `Bearer ${founderA.token}` },
  });
  assert(nonexistentRes.status === 404, '12. Nonexistent startup returns 404');

  console.log('\n--- Section 3: Verification Points 13 to 18 (Input Validation Rules) ---');

  // 13. Positive transaction amount accepted
  const positiveTxRes = await request(`/finance/${startupId}/transactions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderA.token}` },
    body: {
      type: 'INCOME',
      category: 'REVENUE',
      amount: 15000,
      description: 'Valid positive amount',
      date: '2026-09-12',
    },
  });
  assert(positiveTxRes.status === 201, '13. Positive transaction amount accepted');
  // cleanup the extra tx
  if (positiveTxRes.data?.data?._id) {
    await request(`/finance/transactions/${positiveTxRes.data.data._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${founderA.token}` },
    });
  }

  // 14. Zero amount rejected
  const zeroAmountRes = await request(`/finance/${startupId}/transactions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderA.token}` },
    body: {
      type: 'INCOME',
      category: 'REVENUE',
      amount: 0,
      description: 'Zero amount',
      date: '2026-09-12',
    },
  });
  assert(zeroAmountRes.status === 400, '14. Zero amount rejected with 400');

  // 15. Negative amount rejected
  const negAmountRes = await request(`/finance/${startupId}/transactions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderA.token}` },
    body: {
      type: 'EXPENSE',
      category: 'MARKETING',
      amount: -5000,
      description: 'Negative amount',
      date: '2026-09-12',
    },
  });
  assert(negAmountRes.status === 400, '15. Negative amount rejected with 400');

  // 16. Invalid transaction type rejected
  const invalidTypeRes = await request(`/finance/${startupId}/transactions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderA.token}` },
    body: {
      type: 'TRANSFER',
      category: 'REVENUE',
      amount: 1000,
      date: '2026-09-12',
    },
  });
  assert(invalidTypeRes.status === 400, '16. Invalid transaction type rejected with 400');

  // 17. Invalid category rejected
  const invalidCatRes = await request(`/finance/${startupId}/transactions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderA.token}` },
    body: {
      type: 'EXPENSE',
      category: 'PARTY_EXPENSES',
      amount: 1000,
      date: '2026-09-12',
    },
  });
  assert(invalidCatRes.status === 400, '17. Invalid category rejected with 400');

  // 18. Invalid date rejected
  const invalidDateRes = await request(`/finance/${startupId}/transactions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderA.token}` },
    body: {
      type: 'EXPENSE',
      category: 'SOFTWARE',
      amount: 1000,
      date: 'not-a-valid-date-string',
    },
  });
  assert(invalidDateRes.status === 400, '18. Invalid date rejected with 400');

  console.log('\n--- Section 4: Verification Points 19 to 21 (Calculations & Zero Burn) ---');

  // Fetch summary of current state:
  // Income: 50,000 | Expense: 10,000 | netCashFlow: 40,000
  // InitialCapital: 100,000 | fundingReceived: 500,000 | fundingRequired: 2,500,000
  // currentCash = 100000 + 500000 + 40000 = 640,000
  // monthlyBurn = 10000
  // runwayMonths = 640000 / 10000 = 64
  // fundingGap = 2000000
  const summaryRes = await request(`/finance/${startupId}/summary`, {
    headers: { Authorization: `Bearer ${founderA.token}` },
  });
  const sumData = summaryRes.data;

  // 19. Summary calculations are correct
  const isSummaryCorrect =
    sumData.totalIncome === 50000 &&
    sumData.totalExpenses === 10000 &&
    sumData.netCashFlow === 40000 &&
    sumData.currentCash === 640000 &&
    sumData.monthlyBurn === 10000 &&
    sumData.runwayMonths === 64;
  assert(isSummaryCorrect, `19. Summary calculations are correct (inc: ${sumData.totalIncome}, exp: ${sumData.totalExpenses}, net: ${sumData.netCashFlow}, cash: ${sumData.currentCash}, runway: ${sumData.runwayMonths})`);

  // 20. Funding gap calculation is correct
  const isGapCorrect =
    sumData.fundingGap === 2000000 &&
    sumData.fundingStatus === 'FUNDING_REQUIRED';
  assert(isGapCorrect, `20. Funding gap calculation is correct (gap: ${sumData.fundingGap}, status: ${sumData.fundingStatus})`);

  // 21. Zero monthly burn does not cause division by zero
  // Create another clean startup with zero expenses
  const zeroBurnStartup = await request('/startups', {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderA.token}` },
    body: {
      name: `Zero Burn Startup ${ts}`,
      tagline: 'Zero burn test',
      problemStatement: 'Testing zero burn',
      solution: 'Test zero burn',
      industry: 'FinTech',
      stage: 'MVP',
    },
  });
  const zeroBurnId = zeroBurnStartup.data?.startup?.id;
  const zeroBurnSummary = await request(`/finance/${zeroBurnId}/summary`, {
    headers: { Authorization: `Bearer ${founderA.token}` },
  });
  assert(
    zeroBurnSummary.data?.monthlyBurn === 0 &&
    zeroBurnSummary.data?.runwayMonths === null &&
    !isNaN(zeroBurnSummary.data?.currentCash),
    '21. Zero monthly burn does not cause division by zero (runwayMonths is null)'
  );

  console.log('\n--- Section 5: Verification Points 22 to 24 (Finance Dashboard Integration) ---');

  // 22. Finance dashboard loads successfully
  assert(summaryRes.status === 200 && sumData.startup?.id != null, '22. Finance dashboard data loads successfully');

  // 23. Adding transaction updates dashboard
  const addExtraTx = await request(`/finance/${startupId}/transactions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderA.token}` },
    body: {
      type: 'INCOME',
      category: 'REVENUE',
      amount: 25000,
      description: 'Second customer payment',
      date: '2026-09-12',
    },
  });
  const updatedSum = await request(`/finance/${startupId}/summary`, {
    headers: { Authorization: `Bearer ${founderA.token}` },
  });
  assert(updatedSum.data?.totalIncome === 75000, '23. Adding transaction updates dashboard (totalIncome increased to 75000)');

  // Revert back by deleting the extra transaction
  if (addExtraTx.data?.data?._id) {
    await request(`/finance/transactions/${addExtraTx.data.data._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${founderA.token}` },
    });
  }

  // 24. Funding update updates dashboard
  const updateExtraFunding = await request(`/finance/${startupId}/funding`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${founderA.token}` },
    body: { fundingReceived: 2500000, fundingRequired: 2500000 },
  });
  const fundingUpdatedSum = await request(`/finance/${startupId}/summary`, {
    headers: { Authorization: `Bearer ${founderA.token}` },
  });
  assert(
    fundingUpdatedSum.data?.fundingGap === 0 &&
    fundingUpdatedSum.data?.fundingStatus === 'FULLY_FUNDED',
    '24. Funding update updates dashboard (fundingStatus changed to FULLY_FUNDED)'
  );

  // Restore back to 500,000
  await request(`/finance/${startupId}/funding`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${founderA.token}` },
    body: { fundingReceived: 500000, fundingRequired: 2500000 },
  });

  console.log('\n--- Section 6: Verification Points 25 to 29 (Regression & Prior Modules) ---');

  // 25. Existing Phase 7 Execution Intelligence still works
  const execScoreRes = await request(`/execution/startup/${startupId}/score`, {
    headers: { Authorization: `Bearer ${founderA.token}` },
  });
  assert(execScoreRes.status === 200 && typeof execScoreRes.data?.score === 'number', '25. Existing Phase 7 Execution Intelligence still works');

  // 26. Existing Phase 6 Sprint / Task management still works
  const createTaskRes = await request(`/startups/${startupId}/tasks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderA.token}` },
    body: { title: 'Finance Engine Audit', priority: 'HIGH', status: 'TODO' },
  });
  const getTasksRes = await request(`/tasks/startup/${startupId}`, {
    headers: { Authorization: `Bearer ${founderA.token}` },
  });
  assert(createTaskRes.status === 201 && getTasksRes.status === 200, '26. Existing Phase 6 Sprint / Task management still works');

  // 27. Existing join-request/team workflow still works
  const joinReq = await request('/join-requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${dev.token}` },
    body: { startupId, message: 'Interested in working on finance features' },
  });
  const myJoinReqs = await request('/join-requests/my', {
    headers: { Authorization: `Bearer ${dev.token}` },
  });
  assert(joinReq.status === 201 && myJoinReqs.status === 200, '27. Existing join-request/team workflow still works');

  // 28. Existing AI Startup Analyzer still works
  const aiAnalysisRes = await request(`/ai/startup-analysis/${startupId}`, {
    headers: { Authorization: `Bearer ${founderA.token}` },
  });
  assert([200, 404].includes(aiAnalysisRes.status), '28. Existing AI Startup Analyzer endpoint intact');

  // 29. Authentication still works
  const meRes = await request('/auth/me', {
    headers: { Authorization: `Bearer ${founderA.token}` },
  });
  assert(meRes.status === 200 && meRes.data?.user?.role === 'FOUNDER' && meRes.data?.user?.id === founderA.user.id, '29. Authentication still works');

  console.log('\n--- Section 7: Verification Point 30 (npm run build) ---');

  // 30. npm run build succeeds
  try {
    const buildOutput = execSync('npm run build', {
      cwd: path.resolve(__dirname, '../../client'),
      encoding: 'utf8',
    });
    const builtSuccessfully = buildOutput.includes('built in') || buildOutput.includes('dist');
    assert(builtSuccessfully, '30. npm run build succeeds without errors');
  } catch (buildErr) {
    console.error('Build error:', buildErr);
    assert(false, '30. npm run build succeeds');
  }

  console.log('\n--- Section 8: Real AgriVision AI MongoDB Verification ---');

  // PART 6 & 7: Test against the actual AgriVision AI startup in MongoDB
  const agriVisionId = '6aa440aa65472e3fe2c8afd0';
  const rajToken = jwt.sign(
    { userId: '6aa3eba186e10f5115944a34', role: 'FOUNDER' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  const agriVisionSummary = await request(`/finance/${agriVisionId}/summary`, {
    headers: { Authorization: `Bearer ${rajToken}` },
  });
  assert(agriVisionSummary.status === 200, 'AgriVision AI real summary fetched with 200 OK');
  const av = agriVisionSummary.data;

  assert(av.totalIncome === 50000, `AgriVision totalIncome is 50,000 (got ${av.totalIncome})`);
  assert(av.totalExpenses === 10000, `AgriVision totalExpenses is 10,000 (got ${av.totalExpenses})`);
  assert(av.netCashFlow === 40000, `AgriVision netCashFlow is 40,000 (got ${av.netCashFlow})`);
  assert(av.initialCapital === 100000, `AgriVision initialCapital is 100,000 (got ${av.initialCapital})`);
  assert(av.fundingReceived === 500000, `AgriVision fundingReceived is 500,000 (got ${av.fundingReceived})`);
  assert(av.fundingRequired === 2500000, `AgriVision fundingRequired is 2,500,000 (got ${av.fundingRequired})`);
  assert(av.currentCash === 640000, `AgriVision currentCash is 640,000 (got ${av.currentCash})`);
  assert(av.fundingGap === 2000000, `AgriVision fundingGap is 2,000,000 (got ${av.fundingGap})`);
  assert(av.fundingStatus === 'FUNDING_REQUIRED', `AgriVision fundingStatus is FUNDING_REQUIRED (got ${av.fundingStatus})`);

  console.log('\n==================================================');
  console.log(`FINAL RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
