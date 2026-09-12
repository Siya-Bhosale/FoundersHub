/**
 * Phase 7 — Execution Intelligence Test Suite
 * Covers all 32 verification requirements:
 * - Deterministic execution scoring engine & weights (40/25/15/10/10)
 * - Deterministic grading & clamping (0-100)
 * - Access control (Founder & Active Developer allowed, Unrelated 403)
 * - AI Execution Risk Analysis (Founder only, 403 for developer/investor/other founder)
 * - Gemini response validation & data-driven fallback
 * - Persistence & retrieval of risk analysis
 * - Dynamic sensitivity to task changes (TODO -> DONE, BLOCKED, overdue)
 * - Regression check on existing endpoints (Auth, Startup, JoinRequest, AI Idea Analyzer)
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
  console.log('PHASE 7 — EXECUTION INTELLIGENCE TEST SUITE');
  console.log('==================================================\n');

  const timestamp = Date.now();

  // 1. Create Founder A
  const founderAEmail = `founderA_${timestamp}@test.com`;
  const founderA = await registerAndLogin('Founder Alice', founderAEmail, 'Password123!', 'FOUNDER');
  assert(founderA.token != null, 'Founder A registered and logged in successfully');
  const founderAToken = founderA.token;

  // 2. Create Startup A
  const startupARes = await request('/startups', {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderAToken}` },
    body: {
      name: `AgriVision AI ${timestamp}`,
      tagline: 'Intelligent Crop Disease Detection',
      problemStatement: 'Farmers suffer from undiagnosed fungal infections affecting yields.',
      solution: 'AI-powered computer vision scanning using mobile cameras.',
      industry: 'AgTech',
      stage: 'MVP',
      description: 'Computer vision diagnostics for modern farming.',
    },
  });
  assert(startupARes.status === 201, 'Startup A created successfully');
  const startupAId = startupARes.data?.startup?.id || startupARes.data?.startup?._id;

  // 3. Create Developer A
  const devAEmail = `devA_${timestamp}@test.com`;
  const devA = await registerAndLogin('Developer Bob', devAEmail, 'Password123!', 'DEVELOPER');
  assert(devA.token != null, 'Developer A registered and logged in successfully');
  const devAToken = devA.token;
  const devAId = devA.user?.id;

  // Developer A profile
  await request('/developers/profile', {
    method: 'POST',
    headers: { Authorization: `Bearer ${devAToken}` },
    body: {
      bio: 'Full-stack AI developer experienced with React, Node.js, and PyTorch.',
      skills: ['React', 'Node.js', 'PyTorch', 'MongoDB'],
      experience: 'MID',
      availability: 'AVAILABLE',
    },
  });

  // 4. Developer A joins Startup A & Founder accepts
  const joinReqRes = await request('/join-requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${devAToken}` },
    body: {
      startupId: startupAId,
      message: 'I want to build the model inference pipeline.',
    },
  });
  assert(joinReqRes.status === 201, 'Developer A submitted join request');
  const joinRequestId =
    joinReqRes.data?.request?.id ||
    joinReqRes.data?.request?._id ||
    joinReqRes.data?.data?._id ||
    joinReqRes.data?.data?.id;

  const acceptRes = await request(`/join-requests/${joinRequestId}/accept`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${founderAToken}` },
  });
  assert(acceptRes.status === 200, 'Founder accepted Developer A into team');

  // 5. Create Founder B (unrelated)
  const founderBEmail = `founderB_${timestamp}@test.com`;
  const founderB = await registerAndLogin('Founder Carol', founderBEmail, 'Password123!', 'FOUNDER');
  assert(founderB.token != null, 'Founder B registered and logged in successfully');
  const founderBToken = founderB.token;

  // 6. Create Developer B (unrelated)
  const devBEmail = `devB_${timestamp}@test.com`;
  const devB = await registerAndLogin('Developer Dan', devBEmail, 'Password123!', 'DEVELOPER');
  assert(devB.token != null, 'Developer B registered and logged in successfully');
  const devBToken = devB.token;

  // 7. Create Investor (unrelated role)
  const investorEmail = `investor_${timestamp}@test.com`;
  const investor = await registerAndLogin('Investor Ian', investorEmail, 'Password123!', 'INVESTOR');
  assert(investor.token != null, 'Investor registered and logged in successfully');
  const investorToken = investor.token;

  console.log('\n--- 1. Deterministic Execution Score Calculation & Weights ---');

  // Check initial empty tasks execution score
  const initialScoreRes = await request(`/execution/startup/${startupAId}/score`, {
    headers: { Authorization: `Bearer ${founderAToken}` },
  });
  assert(initialScoreRes.status === 200, 'Founder can view initial execution score');
  assert(initialScoreRes.data?.components?.taskCompletion?.weight === 40, 'Task completion weight is 40%');
  assert(initialScoreRes.data?.components?.deadlineAdherence?.weight === 25, 'Deadline adherence weight is 25%');
  assert(initialScoreRes.data?.components?.workload?.weight === 15, 'Workload weight is 15%');
  assert(initialScoreRes.data?.components?.risk?.weight === 10, 'Risk weight is 10%');
  assert(initialScoreRes.data?.components?.velocity?.weight === 10, 'Velocity weight is 10%');
  assert(
    initialScoreRes.data?.score >= 0 && initialScoreRes.data?.score <= 100,
    'Initial score is between 0 and 100'
  );
  assert(
    ['EXCELLENT', 'GOOD', 'NEEDS_ATTENTION', 'AT_RISK', 'CRITICAL'].includes(initialScoreRes.data?.grade),
    `Grade is deterministic enum (${initialScoreRes.data?.grade})`
  );

  console.log('\n--- 2. Adding Real Tasks & Testing Scoring Dynamics ---');

  // Task 1: Completed on time
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  const overdueDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  const t1Res = await request(`/startups/${startupAId}/tasks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderAToken}` },
    body: {
      title: 'Setup Core API Framework',
      description: 'Configure Express and MongoDB schemas',
      status: 'DONE',
      priority: 'HIGH',
      day: 1,
      dueDate: futureDate,
      estimatedHours: 4,
      assignedTo: devAId,
    },
  });
  assert(t1Res.status === 201, 'Task 1 (DONE) created successfully');
  const t1Id = t1Res.data?.data?._id || t1Res.data?.data?.id;

  // Task 2: In Progress
  const t2Res = await request(`/startups/${startupAId}/tasks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderAToken}` },
    body: {
      title: 'Train ResNet Disease Classifier',
      description: 'Train deep learning model on crop dataset',
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      day: 2,
      dueDate: futureDate,
      estimatedHours: 8,
      assignedTo: devAId,
    },
  });
  assert(t2Res.status === 201, 'Task 2 (IN_PROGRESS) created successfully');

  // Task 3: Overdue Critical Task
  const t3Res = await request(`/startups/${startupAId}/tasks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderAToken}` },
    body: {
      title: 'Field Hardware Sensor Gateway',
      description: 'Connect IoT gateways for soil moisture',
      status: 'TODO',
      priority: 'CRITICAL',
      day: 3,
      dueDate: overdueDate,
      estimatedHours: 6,
      assignedTo: devAId,
    },
  });
  assert(t3Res.status === 201, 'Task 3 (Overdue Critical) created successfully');
  const t3Id = t3Res.data?.data?._id || t3Res.data?.data?.id;

  // Task 4: Blocked task
  const t4Res = await request(`/startups/${startupAId}/tasks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderAToken}` },
    body: {
      title: 'Payment Gateway Integration',
      description: 'Stripe webhook listener',
      status: 'BLOCKED',
      priority: 'MEDIUM',
      day: 4,
      dueDate: futureDate,
      estimatedHours: 3,
    },
  });
  assert(t4Res.status === 201, 'Task 4 (BLOCKED) created successfully');
  const t4Id = t4Res.data?.data?._id || t4Res.data?.data?.id;

  // Fetch updated execution score
  const updatedScoreRes = await request(`/execution/startup/${startupAId}/score`, {
    headers: { Authorization: `Bearer ${founderAToken}` },
  });
  assert(updatedScoreRes.status === 200, 'Fetched updated execution score');
  const tc = updatedScoreRes.data?.components?.taskCompletion;
  assert(tc.percentage === 25, `Task completion percentage is 25% (1/4 tasks) - got ${tc.percentage}%`);
  assert(tc.score === 10, `Task completion score is 10/40 - got ${tc.score}`);

  // Check deadline adherence has penalty due to overdue task 3
  const da = updatedScoreRes.data?.components?.deadlineAdherence;
  assert(da.percentage < 100, `Deadline adherence reflects overdue task penalty: ${da.percentage}%`);

  // Check risk score has deduction due to blocked task 4 and overdue critical task 3
  const risk = updatedScoreRes.data?.components?.risk;
  assert(risk.percentage < 100, `Risk component has deductions for blocked & overdue critical work: ${risk.percentage}%`);

  console.log('\n--- 3. Testing Task Status Changes Impact on Score ---');

  // Mark Task 4 as DONE
  const updateT4Res = await request(`/tasks/${t4Id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${founderAToken}` },
    body: {
      status: 'DONE',
    },
  });
  assert(updateT4Res.status === 200, 'Task 4 updated to DONE');

  const afterDoneScoreRes = await request(`/execution/startup/${startupAId}/score`, {
    headers: { Authorization: `Bearer ${founderAToken}` },
  });
  const tcAfter = afterDoneScoreRes.data?.components?.taskCompletion;
  assert(tcAfter.percentage === 50, `Task completion increased to 50% (2/4 tasks) - got ${tcAfter.percentage}%`);
  assert(tcAfter.score === 20, `Task completion score increased to 20/40 - got ${tcAfter.score}`);
  assert(
    afterDoneScoreRes.data?.components?.risk?.score > risk.score,
    'Unblocking task improved risk component score'
  );

  console.log('\n--- 4. Access Control for Execution Score Endpoint ---');

  // Active Developer A can view
  const devAScoreRes = await request(`/execution/startup/${startupAId}/score`, {
    headers: { Authorization: `Bearer ${devAToken}` },
  });
  assert(devAScoreRes.status === 200, 'Active team developer A can view execution score');
  assert(devAScoreRes.data?.score === afterDoneScoreRes.data?.score, 'Developer sees identical score data');

  // Unrelated Developer B receives 403
  const devBScoreRes = await request(`/execution/startup/${startupAId}/score`, {
    headers: { Authorization: `Bearer ${devBToken}` },
  });
  assert(devBScoreRes.status === 403, 'Unrelated developer B gets 403 Forbidden');

  // Unrelated Founder B receives 403
  const founderBScoreRes = await request(`/execution/startup/${startupAId}/score`, {
    headers: { Authorization: `Bearer ${founderBToken}` },
  });
  assert(founderBScoreRes.status === 403, 'Unrelated founder B gets 403 Forbidden');

  // Unrelated Investor receives 403
  const investorScoreRes = await request(`/execution/startup/${startupAId}/score`, {
    headers: { Authorization: `Bearer ${investorToken}` },
  });
  assert(investorScoreRes.status === 403, 'Investor gets 403 Forbidden');

  // Unauthenticated receives 401
  const unauthScoreRes = await request(`/execution/startup/${startupAId}/score`);
  assert(unauthScoreRes.status === 401, 'Unauthenticated request receives 401 Unauthorized');

  console.log('\n--- 5. AI Execution Risk Analyzer & Fallback Handling ---');

  // Check GET before any analysis has been run (should be 404)
  const getInitialRiskRes = await request(`/ai/execution-risk/${startupAId}`, {
    headers: { Authorization: `Bearer ${founderAToken}` },
  });
  assert(getInitialRiskRes.status === 404, 'GET before analysis returns 404 Not Found');

  // Developer cannot generate AI risk analysis
  const devRiskPostRes = await request(`/ai/execution-risk/${startupAId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${devAToken}` },
  });
  assert(devRiskPostRes.status === 403, 'Developer cannot trigger AI execution risk analysis (403)');

  // Investor cannot generate AI risk analysis
  const investorRiskPostRes = await request(`/ai/execution-risk/${startupAId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${investorToken}` },
  });
  assert(investorRiskPostRes.status === 403, 'Investor cannot trigger AI execution risk analysis (403)');

  // Founder B cannot generate risk analysis for Founder A's startup
  const founderBRiskPostRes = await request(`/ai/execution-risk/${startupAId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderBToken}` },
  });
  assert(founderBRiskPostRes.status === 403, "Founder B cannot trigger risk analysis for Founder A's startup (403)");

  // Founder A generates AI Execution Risk Analysis
  console.log('  Triggering execution risk analysis via Founder A...');
  const analyzeRiskRes = await request(`/ai/execution-risk/${startupAId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderAToken}` },
  });
  assert(analyzeRiskRes.status === 200, 'Founder A successfully analyzed execution risk (200)');
  const riskData = analyzeRiskRes.data?.data;

  assert(
    ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(riskData?.overallRisk),
    `Overall risk is valid enum: ${riskData?.overallRisk}`
  );
  assert(
    riskData?.bottleneck && typeof riskData.bottleneck.title === 'string',
    `Bottleneck title exists: "${riskData?.bottleneck?.title}"`
  );
  assert(
    Array.isArray(riskData?.risks) && riskData.risks.length > 0,
    `Risks array populated: ${riskData?.risks?.length} risk items`
  );
  assert(
    riskData?.risks[0]?.impact && ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(riskData.risks[0].impact),
    `Risk item contains valid impact: ${riskData?.risks[0]?.impact}`
  );
  assert(
    Array.isArray(riskData?.recommendations) && riskData.recommendations.length > 0,
    `Recommendations array populated: ${riskData?.recommendations?.length} recommendations`
  );
  assert(
    Array.isArray(riskData?.positiveSignals),
    `Positive signals array populated: ${riskData?.positiveSignals?.length} items`
  );
  assert(
    ['gemini', 'fallback'].includes(riskData?.source),
    `Source is either 'gemini' or 'fallback': got '${riskData?.source}'`
  );

  // Verify no Gemini API key leaked in response
  const rawResponseString = JSON.stringify(analyzeRiskRes.data);
  assert(
    !rawResponseString.includes(process.env.GEMINI_API_KEY || 'AIzaSy'),
    'Zero secrets or GEMINI_API_KEY leaked in response'
  );

  // Verify persistence via GET /api/ai/execution-risk/:startupId
  const getStoredRiskRes = await request(`/ai/execution-risk/${startupAId}`, {
    headers: { Authorization: `Bearer ${founderAToken}` },
  });
  assert(getStoredRiskRes.status === 200, 'GET /api/ai/execution-risk returns stored analysis');
  assert(
    getStoredRiskRes.data?.data?.overallRisk === riskData?.overallRisk,
    'Retrieved risk analysis matches persisted analysis'
  );

  // Active Developer A can view stored risk analysis
  const devGetStoredRiskRes = await request(`/ai/execution-risk/${startupAId}`, {
    headers: { Authorization: `Bearer ${devAToken}` },
  });
  assert(devGetStoredRiskRes.status === 200, 'Active developer A can view stored risk analysis');

  // Developer personal tasks endpoint
  const myTasksRes = await request('/tasks/my-tasks', {
    headers: { Authorization: `Bearer ${devAToken}` },
  });
  assert(myTasksRes.status === 200, 'Developer can access /api/tasks/my-tasks');
  assert(myTasksRes.data?.summary?.total >= 2, `Developer assigned tasks counted: ${myTasksRes.data?.summary?.total}`);

  console.log('\n--- 6. Regression Check on Existing Functionality ---');

  // Existing Startup details
  const getStartupRes = await request(`/startups/${startupAId}`, {
    headers: { Authorization: `Bearer ${founderAToken}` },
  });
  assert(getStartupRes.status === 200, 'Existing Startup details API works');

  // Existing Team endpoint
  const getTeamRes = await request(`/startups/${startupAId}/team`, {
    headers: { Authorization: `Bearer ${founderAToken}` },
  });
  assert(getTeamRes.status === 200, 'Existing Startup Team endpoint works');

  // Existing Idea Analysis
  const getIdeaAnalysisRes = await request(`/ai/startup-analysis/${startupAId}`, {
    headers: { Authorization: `Bearer ${founderAToken}` },
  });
  assert([200, 404].includes(getIdeaAnalysisRes.status), 'Existing Idea Analysis endpoint intact');

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
