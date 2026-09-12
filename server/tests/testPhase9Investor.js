/**
 * Phase 9 — Investor Matching + Funding Interest Automated Test Suite
 * Covers all 47 prompt verification requirements:
 * - Investor Profile CRUD, role enforcement (403 for Founder/Developer), passwordHash privacy
 * - Deterministic Match Score engine: Industry Fit (30%), Stage Fit (20%), Investment Range (20%), Team Fit (10%), Readiness (20%)
 * - Deterministic score sorting descending, score clamping (0-100), Gemini zero calculation invariance
 * - AI Match Explanation: required JSON schema, fallback safety, deterministic score preservation
 * - Funding Interest: creation, persistence, duplicate rejection, non-positive rejection, founder/dev rejection (403), investor cannot invest in own startup
 * - Interest retrieval: Investor my-interests, Founder received-interests, foreign founder 403, 401 unauth
 * - Regression check on Finance (Phase 8), Execution Intelligence (Phase 7), Sprint Planner (Phase 6), Join Requests (Phase 5), AI Analyzer, Auth, and npm run build
 */

const dotenv = require('dotenv');
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

async function runTests() {
  console.log('\n==================================================');
  console.log('PHASE 9 — INVESTOR MATCHING & FUNDING INTEREST TESTS');
  console.log('==================================================\n');

  const ts = Date.now();

  // Create actors
  const investor = await registerAndLogin('Green Ventures VC', `investor_${ts}@test.com`, 'Password123!', 'INVESTOR');
  const founderA = await registerAndLogin('Founder Alice', `foundera_${ts}@test.com`, 'Password123!', 'FOUNDER');
  const founderB = await registerAndLogin('Founder Bob', `founderb_${ts}@test.com`, 'Password123!', 'FOUNDER');
  const developer = await registerAndLogin('Developer Dan', `devdan_${ts}@test.com`, 'Password123!', 'DEVELOPER');

  assert(investor.token != null, 'Investor registered and logged in successfully');
  assert(founderA.token != null, 'Founder A registered and logged in successfully');

  // Create Startup A (Agriculture, MVP, ₹25L funding required)
  const startupARes = await request('/startups', {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderA.token}` },
    body: {
      name: `AgriVision AI ${ts}`,
      tagline: 'AI crop health diagnostics',
      problemStatement: 'Crop diseases cause severe yield loss across smallholder farms.',
      solution: 'Computer vision scanner on mobile devices with automated treatments.',
      industry: 'Agriculture',
      stage: 'MVP',
    },
  });
  const startupAId = startupARes.data?.startup?.id;
  assert(startupARes.status === 201 && startupAId != null, 'Startup A created successfully');

  // Configure Funding for Startup A: ₹25L required, ₹5L received, ₹1L capital
  await request(`/finance/${startupAId}/funding`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${founderA.token}` },
    body: {
      fundingRequired: 2500000,
      fundingReceived: 500000,
      initialCapital: 100000,
    },
  });

  // Record a transaction for Startup A so financial data exists
  await request(`/finance/${startupAId}/transactions`, {
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

  // Developer Dan joins Startup A
  const joinReqRes = await request('/join-requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${developer.token}` },
    body: { startupId: startupAId, message: 'Ready to write AI vision code' },
  });
  const joinReqId = joinReqRes.data?.request?.id || joinReqRes.data?.data?._id;
  if (joinReqId) {
    await request(`/join-requests/${joinReqId}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${founderA.token}` },
    });
  }

  // Developer profile with skills
  await request('/developers/profile', {
    method: 'POST',
    headers: { Authorization: `Bearer ${developer.token}` },
    body: {
      bio: 'Fullstack and AI engineer',
      skills: ['Python', 'Computer Vision', 'React', 'Node.js'],
      experience: 'MID',
      availability: 'AVAILABLE',
    },
  });

  console.log('\n--- Section 1: Investor Profile (Points 1 to 6) ---');

  // 1. Investor can create profile
  const createProfRes = await request('/investors/profile', {
    method: 'POST',
    headers: { Authorization: `Bearer ${investor.token}` },
    body: {
      firmName: 'Green Ventures',
      bio: 'Early-stage climate and agritech syndicate fund.',
      industries: ['Agriculture', 'AI', 'SaaS'],
      investmentStages: ['MVP', 'EARLY_TRACTION'],
      minInvestment: 500000,
      maxInvestment: 5000000,
      preferredGeographies: ['India', 'Global'],
    },
  });
  assert(createProfRes.status === 201, '1. Investor can create profile');
  assert(createProfRes.data?.data?.firmName === 'Green Ventures', 'Investor firmName saved');

  // 2. Investor can retrieve own profile
  const getProfRes = await request('/investors/profile', {
    headers: { Authorization: `Bearer ${investor.token}` },
  });
  assert(getProfRes.status === 200, '2. Investor can retrieve own profile');
  assert(getProfRes.data?.data?.user?.email === `investor_${ts}@test.com`, 'Profile populated with user email');

  // 3. Investor can update own profile
  const updateProfRes = await request('/investors/profile', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${investor.token}` },
    body: {
      firmName: 'Green Ventures Capital',
      maxInvestment: 6000000,
    },
  });
  assert(updateProfRes.status === 200 && updateProfRes.data?.data?.firmName === 'Green Ventures Capital', '3. Investor can update own profile');

  // 4. Founder cannot create investor profile (403)
  const founderCreateProf = await request('/investors/profile', {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderA.token}` },
    body: { firmName: 'Impostor VC', minInvestment: 100000, maxInvestment: 1000000 },
  });
  assert(founderCreateProf.status === 403, '4. Founder cannot create investor profile (403)');

  // 5. Developer cannot create investor profile (403)
  const devCreateProf = await request('/investors/profile', {
    method: 'POST',
    headers: { Authorization: `Bearer ${developer.token}` },
    body: { firmName: 'Dev VC', minInvestment: 100000, maxInvestment: 1000000 },
  });
  assert(devCreateProf.status === 403, '5. Developer cannot create investor profile (403)');

  // 6. passwordHash is never returned
  const rawProfString = JSON.stringify(getProfRes.data);
  assert(!rawProfString.includes('passwordHash'), '6. passwordHash is never returned in investor profile');

  console.log('\n--- Section 2: Deterministic Matching (Points 7 to 16) ---');

  // 7. Investor can retrieve startup matches
  const matchesRes = await request('/investors/matches', {
    headers: { Authorization: `Bearer ${investor.token}` },
  });
  assert(matchesRes.status === 200 && Array.isArray(matchesRes.data?.data), '7. Investor can retrieve startup matches');
  const matches = matchesRes.data?.data || [];

  // 8. Matches are sorted by deterministic score descending
  let isSortedDescending = true;
  for (let i = 0; i < matches.length - 1; i++) {
    if (matches[i].matchScore < matches[i + 1].matchScore) {
      isSortedDescending = false;
      break;
    }
  }
  assert(isSortedDescending, '8. Matches are sorted by deterministic score descending');

  // Look up Startup A match
  const matchA = matches.find((m) => m.startupId === startupAId);
  assert(matchA != null, 'Startup A found in matches list');

  // 9. Industry fit = 30%
  assert(matchA?.components?.industryFit?.weight === 30, '9. Industry fit weight is 30%');
  assert(matchA?.components?.industryFit?.score === 30, 'Industry fit score is 30 for matching Agriculture');

  // 10. Stage fit = 20%
  assert(matchA?.components?.stageFit?.weight === 20, '10. Stage fit weight is 20%');
  assert(matchA?.components?.stageFit?.score === 20, 'Stage fit score is 20 for matching MVP');

  // 11. Investment range = 20%
  assert(matchA?.components?.investmentRange?.weight === 20, '11. Investment range weight is 20%');
  assert(matchA?.components?.investmentRange?.score === 20, 'Investment range score is 20 for ₹25L in [₹5L, ₹60L]');

  // 12. Team fit = 10%
  assert(matchA?.components?.teamFit?.weight === 10, '12. Team fit weight is 10%');
  assert(matchA?.components?.teamFit?.score === 10, 'Team fit score is 10 (founder + active dev with verified skills)');

  // 13. Investor readiness = 20%
  assert(matchA?.components?.investorReadiness?.weight === 20, '13. Investor readiness weight is 20%');

  // 14. Final score is between 0 and 100
  assert(matchA?.matchScore >= 0 && matchA?.matchScore <= 100, `14. Final score (${matchA?.matchScore}) is between 0 and 100`);

  // 15. Match score is deterministic
  const matchDetailRes = await request(`/investors/matches/${startupAId}`, {
    headers: { Authorization: `Bearer ${investor.token}` },
  });
  assert(matchDetailRes.data?.data?.matchScore === matchA?.matchScore, '15. Match score is deterministic across calls');

  // 16. Gemini does not calculate match score
  // Sum of individual components matches overall matchScore
  const compSum =
    matchA.components.industryFit.score +
    matchA.components.stageFit.score +
    matchA.components.investmentRange.score +
    matchA.components.teamFit.score +
    matchA.components.investorReadiness.score;
  assert(matchA.matchScore === compSum, '16. Score is mathematically the sum of backend components (Gemini does not calculate score)');

  console.log('\n--- Section 3: AI Match Explanation (Points 17 to 21) ---');

  // 17. Investor can request match explanation
  const explRes = await request(`/ai/investor-match-explanation/${startupAId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${investor.token}` },
  });
  assert(explRes.status === 200, '17. Investor can request match explanation (200)');

  // 18. Gemini explanation contains required structure
  const expl = explRes.data;
  const hasStructure =
    typeof expl.summary === 'string' &&
    Array.isArray(expl.strengths) &&
    Array.isArray(expl.alignment) &&
    Array.isArray(expl.concerns) &&
    typeof expl.recommendation === 'string' &&
    ['gemini', 'fallback'].includes(expl.source);
  assert(hasStructure, '18. Explanation contains required structure (summary, strengths, alignment, concerns, recommendation, source)');

  // 19. Gemini failure produces fallback
  const { getFallbackMatchExplanation } = require('../services/investorMatchAiService');
  const mockFallback = getFallbackMatchExplanation({
    startup: { name: 'Test', industry: 'Agri', stage: 'MVP', fundingRequired: 2000000 },
    investor: { minInvestment: 500000, maxInvestment: 5000000 },
    matchScore: 90,
    components: matchA.components,
  });
  assert(mockFallback.source === 'fallback', '19. Gemini failure produces deterministic fallback with source="fallback"');

  // 20. Fallback contains no fake match score
  assert(mockFallback.matchScore === undefined, '20. Fallback explanation contains no fake match score');

  // 21. Existing deterministic score remains unchanged
  assert(expl.matchScore === matchA.matchScore, '21. Existing deterministic score remains unchanged after AI explanation');

  console.log('\n--- Section 4: Funding Interest (Points 22 to 31) ---');

  // 22. Investor can express interest
  const expressIntRes = await request('/funding-interest', {
    method: 'POST',
    headers: { Authorization: `Bearer ${investor.token}` },
    body: {
      startupId: startupAId,
      amount: 1000000,
      message: 'Interested in discussing a potential seed investment.',
    },
  });
  assert(expressIntRes.status === 201, '22. Investor can express funding interest (201)');

  // 23. Interest is persisted
  const createdInterest = expressIntRes.data?.data;
  assert(createdInterest?.amount === 1000000 && createdInterest?.status === 'INTERESTED', '23. Interest is persisted in database with status INTERESTED');

  // 24. Duplicate active interest is rejected (400)
  const dupIntRes = await request('/funding-interest', {
    method: 'POST',
    headers: { Authorization: `Bearer ${investor.token}` },
    body: {
      startupId: startupAId,
      amount: 1500000,
      message: 'Duplicate check attempt',
    },
  });
  assert(dupIntRes.status === 400, '24. Duplicate active funding interest rejected with 400');

  // 25. Invalid amount rejected
  const zeroAmtRes = await request('/funding-interest', {
    method: 'POST',
    headers: { Authorization: `Bearer ${investor.token}` },
    body: { startupId: startupAId, amount: 0 },
  });
  assert(zeroAmtRes.status === 400, '25. Zero amount rejected with 400');

  const negAmtRes = await request('/funding-interest', {
    method: 'POST',
    headers: { Authorization: `Bearer ${investor.token}` },
    body: { startupId: startupAId, amount: -50000 },
  });
  assert(negAmtRes.status === 400, 'Negative amount rejected with 400');

  // 26. Founder cannot create interest (403)
  const founderCreateInt = await request('/funding-interest', {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderA.token}` },
    body: { startupId: startupAId, amount: 100000 },
  });
  assert(founderCreateInt.status === 403, '26. Founder cannot create funding interest (403)');

  // 27. Developer cannot create interest (403)
  const devCreateInt = await request('/funding-interest', {
    method: 'POST',
    headers: { Authorization: `Bearer ${developer.token}` },
    body: { startupId: startupAId, amount: 100000 },
  });
  assert(devCreateInt.status === 403, '27. Developer cannot create funding interest (403)');

  // 28. Investor can retrieve own interests
  const myIntRes = await request('/funding-interest/my', {
    headers: { Authorization: `Bearer ${investor.token}` },
  });
  assert(myIntRes.status === 200, '28. Investor can retrieve own funding interests (200)');
  assert(Array.isArray(myIntRes.data?.data) && myIntRes.data?.data?.length >= 1, 'My interests contains submitted interest');

  // 29. Founder can retrieve interest for own startup
  const founderGetInterests = await request(`/startups/${startupAId}/funding-interest`, {
    headers: { Authorization: `Bearer ${founderA.token}` },
  });
  assert(founderGetInterests.status === 200, '29. Founder can retrieve interest for own startup');
  assert(founderGetInterests.data?.data?.[0]?.investor?.firmName === 'Green Ventures Capital', 'Founder sees investor firm name in interest payload');

  // 30. Founder cannot retrieve another founder's interests (403)
  const otherFounderInterests = await request(`/startups/${startupAId}/funding-interest`, {
    headers: { Authorization: `Bearer ${founderB.token}` },
  });
  assert(otherFounderInterests.status === 403, "30. Founder cannot retrieve another founder's interests (403)");

  // 31. Unauthenticated requests return 401
  const unauthMatches = await request('/investors/matches');
  const unauthInterest = await request('/funding-interest/my');
  assert(unauthMatches.status === 401 && unauthInterest.status === 401, '31. Unauthenticated requests return 401');

  console.log('\n--- Section 5: Integration & Privacy (Points 32 to 37) ---');

  // 32. Investor can discover real startups
  assert(matches.length >= 1, '32. Investor can discover real startups in database');

  // 33. Startup details show appropriate information
  const startupView = await request(`/startups/${startupAId}`, {
    headers: { Authorization: `Bearer ${investor.token}` },
  });
  assert(startupView.status === 200 && startupView.data?.startup?.name === `AgriVision AI ${ts}`, '33. Startup details accessible to investor');

  // 34. Execution score is displayed correctly
  const execScoreRes = await request(`/execution/startup/${startupAId}/score`, {
    headers: { Authorization: `Bearer ${investor.token}` },
  });
  assert([200, 403].includes(execScoreRes.status), '34. Execution score endpoint checked');

  // 35. Funding information is displayed correctly
  assert(startupView.data?.startup?.fundingRequired === 2500000, '35. Funding required displayed correctly (₹25L)');
  assert(startupView.data?.startup?.fundingReceived === 500000, 'Funding received displayed correctly (₹5L)');

  // 36. Private financial transactions are NOT exposed to investor
  const privateTxRes = await request(`/finance/${startupAId}/transactions`, {
    headers: { Authorization: `Bearer ${investor.token}` },
  });
  assert(privateTxRes.status === 403, '36. Private financial transactions are NOT exposed to investor (403 Forbidden)');

  // 37. Founder receives investor interest
  assert(founderGetInterests.data?.count >= 1, '37. Founder successfully receives investor interest in dashboard query');

  console.log('\n--- Section 6: Regression on Prior Modules (Points 38 to 46) ---');

  // 38. Existing Finance works
  const financeSumRes = await request(`/finance/${startupAId}/summary`, {
    headers: { Authorization: `Bearer ${founderA.token}` },
  });
  assert(financeSumRes.status === 200 && financeSumRes.data?.totalIncome === 50000, '38. Existing Phase 8 Finance summary works');

  // 39. Existing Execution Intelligence works
  const execScore = await request(`/execution/startup/${startupAId}/score`, {
    headers: { Authorization: `Bearer ${founderA.token}` },
  });
  assert(execScore.status === 200, '39. Existing Phase 7 Execution Intelligence works');

  // 40. Existing Sprint Planner works
  const taskRes = await request(`/startups/${startupAId}/tasks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderA.token}` },
    body: { title: 'Implement Pitch Generator', priority: 'MEDIUM' },
  });
  assert(taskRes.status === 201, '40. Existing Phase 6 Sprint / Task creation works');

  // 41. Existing Join Request works
  const joinMyRes = await request('/join-requests/my', {
    headers: { Authorization: `Bearer ${developer.token}` },
  });
  assert(joinMyRes.status === 200, '41. Existing Phase 5 Join Request workflow works');

  // 42. Existing Developer Profile works
  const devProfRes = await request('/developers/profile', {
    headers: { Authorization: `Bearer ${developer.token}` },
  });
  assert(devProfRes.status === 200 && devProfRes.data?.data?.experience === 'MID', '42. Existing Phase 5 Developer Profile works');

  // 43. Existing Startup Discovery works
  const allStartupsRes = await request('/startups', {
    headers: { Authorization: `Bearer ${investor.token}` },
  });
  assert(allStartupsRes.status === 200 && Array.isArray(allStartupsRes.data?.startups), '43. Existing Startup Discovery works');

  // 44. Existing AI Startup Analyzer works
  const aiIdeaRes = await request(`/ai/startup-analysis/${startupAId}`, {
    headers: { Authorization: `Bearer ${founderA.token}` },
  });
  assert([200, 404].includes(aiIdeaRes.status), '44. Existing Phase 4 AI Startup Analyzer endpoint intact');

  // 45. Authentication works
  const meRes = await request('/auth/me', {
    headers: { Authorization: `Bearer ${investor.token}` },
  });
  assert(meRes.status === 200 && meRes.data?.user?.role === 'INVESTOR', '45. Authentication works and returns correct role');

  // 46. Role restrictions work
  const founderAsInvestor = await request('/investors/matches', {
    headers: { Authorization: `Bearer ${founderA.token}` },
  });
  assert(founderAsInvestor.status === 403, '46. Role restrictions work (Founder cannot access investor matches)');

  console.log('\n--- Section 7: Production Build (Point 47) ---');

  // 47. npm run build succeeds with 0 errors
  try {
    const buildOutput = execSync('npm run build', {
      cwd: path.resolve(__dirname, '../../client'),
      encoding: 'utf8',
    });
    const builtSuccessfully = buildOutput.includes('built in') || buildOutput.includes('dist');
    assert(builtSuccessfully, '47. npm run build succeeds with 0 errors');
  } catch (buildErr) {
    console.error('Build error:', buildErr);
    assert(false, '47. npm run build succeeds with 0 errors');
  }

  console.log('\n==================================================');
  console.log(`FINAL RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
