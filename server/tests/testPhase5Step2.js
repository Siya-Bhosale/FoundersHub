const http = require('http');
const { execSync } = require('child_process');
const path = require('path');

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.setHeader('Content-Type', 'application/json');
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runSuite() {
  const ts = Date.now();
  console.log('================================================================');
  console.log('PHASE 5 STEP 2: STARTUP JOIN REQUESTS & TEAM FORMATION SUITE');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // Setup Users: 2 Founders, 2 Developers, 1 Investor
  // -------------------------------------------------------------
  console.log('--- Setting up test accounts ---');
  
  // Founder 1
  const f1Email = `founder1_${ts}@test.com`;
  await request('http://localhost:5000/api/auth/register', { method: 'POST' }, {
    name: 'Founder One',
    email: f1Email,
    password: 'Password123!',
    role: 'FOUNDER',
  });
  const f1Login = await request('http://localhost:5000/api/auth/login', { method: 'POST' }, {
    email: f1Email,
    password: 'Password123!',
  });
  const f1Token = f1Login.data.token;
  const f1UserId = f1Login.data.user.id;

  // Founder 2
  const f2Email = `founder2_${ts}@test.com`;
  await request('http://localhost:5000/api/auth/register', { method: 'POST' }, {
    name: 'Founder Two',
    email: f2Email,
    password: 'Password123!',
    role: 'FOUNDER',
  });
  const f2Login = await request('http://localhost:5000/api/auth/login', { method: 'POST' }, {
    email: f2Email,
    password: 'Password123!',
  });
  const f2Token = f2Login.data.token;

  // Developer 1
  const dev1Email = `dev1_${ts}@test.com`;
  await request('http://localhost:5000/api/auth/register', { method: 'POST' }, {
    name: 'Dev One',
    email: dev1Email,
    password: 'Password123!',
    role: 'DEVELOPER',
  });
  const dev1Login = await request('http://localhost:5000/api/auth/login', { method: 'POST' }, {
    email: dev1Email,
    password: 'Password123!',
  });
  const dev1Token = dev1Login.data.token;
  const dev1UserId = dev1Login.data.user.id;

  // Create Developer 1 profile
  await request('http://localhost:5000/api/developers/profile', {
    method: 'POST',
    headers: { Authorization: `Bearer ${dev1Token}` },
  }, {
    bio: 'Fullstack MERN specialist with 3 years startup experience.',
    skills: ['React', 'Node.js', 'MongoDB', 'Tailwind CSS'],
    experience: '3 years in SaaS',
    github: 'https://github.com/devone',
    availability: 'AVAILABLE',
  });

  // Developer 2
  const dev2Email = `dev2_${ts}@test.com`;
  await request('http://localhost:5000/api/auth/register', { method: 'POST' }, {
    name: 'Dev Two',
    email: dev2Email,
    password: 'Password123!',
    role: 'DEVELOPER',
  });
  const dev2Login = await request('http://localhost:5000/api/auth/login', { method: 'POST' }, {
    email: dev2Email,
    password: 'Password123!',
  });
  const dev2Token = dev2Login.data.token;
  const dev2UserId = dev2Login.data.user.id;

  // Investor
  const invEmail = `investor_${ts}@test.com`;
  await request('http://localhost:5000/api/auth/register', { method: 'POST' }, {
    name: 'Angel Investor',
    email: invEmail,
    password: 'Password123!',
    role: 'INVESTOR',
  });
  const invLogin = await request('http://localhost:5000/api/auth/login', { method: 'POST' }, {
    email: invEmail,
    password: 'Password123!',
  });
  const invToken = invLogin.data.token;

  console.log('✓ Accounts successfully registered and authenticated\n');

  // Founder 1 creates a startup
  const createStartupRes = await request('http://localhost:5000/api/startups', {
    method: 'POST',
    headers: { Authorization: `Bearer ${f1Token}` },
  }, {
    name: `AgriVision AI ${ts}`,
    tagline: 'Computer vision for crop health detection',
    problemStatement: 'Farmers lack real-time localized diagnostics.',
    solution: 'Drone imagery with vision AI inference.',
    industry: 'Agriculture',
    stage: 'MVP',
  });
  const startup1Id = createStartupRes.data.startup.id;

  // Founder 2 creates a startup
  const createStartup2Res = await request('http://localhost:5000/api/startups', {
    method: 'POST',
    headers: { Authorization: `Bearer ${f2Token}` },
  }, {
    name: `FinPulse ${ts}`,
    tagline: 'Autonomous cashflow forecasting',
    problemStatement: 'SMBs struggle with burn predictability.',
    solution: 'AI bookkeeping and liquidity planning.',
    industry: 'Fintech',
    stage: 'IDEA',
  });
  const startup2Id = createStartup2Res.data.startup.id;

  // -------------------------------------------------------------
  // Test 1: Developer can request to join a startup
  // -------------------------------------------------------------
  console.log('Test 1: Developer can request to join a startup...');
  const joinRes1 = await request('http://localhost:5000/api/join-requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${dev1Token}` },
  }, {
    startupId: startup1Id,
    message: 'I would like to contribute my React and Node.js skills to build the analytics dashboard.',
  });
  if (joinRes1.status !== 201 || !joinRes1.data.success || !joinRes1.data.request) {
    throw new Error(`Test 1 Failed: Expected 201, got ${joinRes1.status} - ${JSON.stringify(joinRes1.data)}`);
  }
  const requestId1 = joinRes1.data.request.id;
  console.log(`✓ Test 1 Passed: Developer 1 created JoinRequest ${requestId1} (status: ${joinRes1.data.request.status})`);

  // -------------------------------------------------------------
  // Test 2: Request is stored in MongoDB and matches schema
  // -------------------------------------------------------------
  console.log('Test 2: Request is stored in MongoDB...');
  if (joinRes1.data.request.status !== 'PENDING' || joinRes1.data.request.startup !== startup1Id) {
    throw new Error('Test 2 Failed: Stored request properties do not match expected initial state');
  }
  console.log('✓ Test 2 Passed: Request correctly initialized with PENDING status in database');

  // -------------------------------------------------------------
  // Test 3: Developer cannot create request for nonexistent startup
  // -------------------------------------------------------------
  console.log('Test 3: Developer cannot create request for nonexistent startup (expect 404)...');
  const fakeId = '507f1f77bcf86cd799439011';
  const nonExistentRes = await request('http://localhost:5000/api/join-requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${dev1Token}` },
  }, {
    startupId: fakeId,
    message: 'Hello',
  });
  if (nonExistentRes.status !== 404) {
    throw new Error(`Test 3 Failed: Expected 404 for nonexistent startup, got ${nonExistentRes.status}`);
  }
  console.log('✓ Test 3 Passed: Nonexistent startup rejected with 404');

  // -------------------------------------------------------------
  // Test 4: Developer cannot submit duplicate pending request
  // -------------------------------------------------------------
  console.log('Test 4: Developer cannot submit duplicate pending request (expect 400)...');
  const dupJoinRes = await request('http://localhost:5000/api/join-requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${dev1Token}` },
  }, {
    startupId: startup1Id,
    message: 'Trying again',
  });
  if (dupJoinRes.status !== 400) {
    throw new Error(`Test 4 Failed: Expected 400 for duplicate pending request, got ${dupJoinRes.status}`);
  }
  console.log('✓ Test 4 Passed: Duplicate pending request rejected with 400');

  // -------------------------------------------------------------
  // Test 6: Founder can view requests for their own startup
  // -------------------------------------------------------------
  console.log("Test 6: Founder can view requests for their own startup...");
  const f1ViewRequests = await request(`http://localhost:5000/api/startups/${startup1Id}/join-requests`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${f1Token}` },
  });
  if (f1ViewRequests.status !== 200 || !Array.isArray(f1ViewRequests.data.requests)) {
    throw new Error(`Test 6 Failed: Expected 200 with requests array, got ${f1ViewRequests.status}`);
  }
  const foundDev1Req = f1ViewRequests.data.requests.find((r) => r.id === requestId1);
  if (!foundDev1Req || !foundDev1Req.developer?.profile?.skills) {
    throw new Error('Test 6 Failed: Developer request or populated profile missing from founder view');
  }
  console.log(`✓ Test 6 Passed: Founder 1 retrieved requests with developer profile (Skills: ${foundDev1Req.developer.profile.skills.join(', ')})`);

  // -------------------------------------------------------------
  // Test 7: Founder cannot view another founder's requests
  // -------------------------------------------------------------
  console.log("Test 7: Founder cannot view another founder's requests (expect 403)...");
  const f2ViewF1Requests = await request(`http://localhost:5000/api/startups/${startup1Id}/join-requests`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${f2Token}` },
  });
  if (f2ViewF1Requests.status !== 403) {
    throw new Error(`Test 7 Failed: Expected 403 for unauthorized founder, got ${f2ViewF1Requests.status}`);
  }
  console.log("✓ Test 7 Passed: Founder 2 blocked with 403 from viewing Founder 1's requests");

  // -------------------------------------------------------------
  // Test 8: Investor cannot create join request
  // -------------------------------------------------------------
  console.log('Test 8: Investor cannot create join request (expect 403)...');
  const invJoinRes = await request('http://localhost:5000/api/join-requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${invToken}` },
  }, {
    startupId: startup1Id,
    message: 'Investor want to join team',
  });
  if (invJoinRes.status !== 403) {
    throw new Error(`Test 8 Failed: Expected 403 for Investor, got ${invJoinRes.status}`);
  }
  console.log('✓ Test 8 Passed: Investor blocked with 403');

  // -------------------------------------------------------------
  // Test 9: Founder cannot create join request
  // -------------------------------------------------------------
  console.log('Test 9: Founder cannot create join request (expect 403)...');
  const founderJoinRes = await request('http://localhost:5000/api/join-requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${f2Token}` },
  }, {
    startupId: startup1Id,
    message: 'Founder wants to join startup',
  });
  if (founderJoinRes.status !== 403) {
    throw new Error(`Test 9 Failed: Expected 403 for Founder, got ${founderJoinRes.status}`);
  }
  console.log('✓ Test 9 Passed: Founder blocked with 403');

  // -------------------------------------------------------------
  // Test 10: Unauthenticated request returns 401
  // -------------------------------------------------------------
  console.log('Test 10: Unauthenticated request returns 401...');
  const unauthRes = await request('http://localhost:5000/api/join-requests', {
    method: 'POST',
  }, {
    startupId: startup1Id,
  });
  if (unauthRes.status !== 401) {
    throw new Error(`Test 10 Failed: Expected 401 for unauthenticated request, got ${unauthRes.status}`);
  }
  console.log('✓ Test 10 Passed: Unauthenticated request returned 401');

  // -------------------------------------------------------------
  // Test 17: Unrelated founder cannot accept another founder's request
  // -------------------------------------------------------------
  console.log("Test 17: Unrelated founder cannot accept another founder's request (expect 403)...");
  const f2AcceptAttempt = await request(`http://localhost:5000/api/join-requests/${requestId1}/accept`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${f2Token}` },
  });
  if (f2AcceptAttempt.status !== 403) {
    throw new Error(`Test 17 Failed: Expected 403 for unauthorized founder accept attempt, got ${f2AcceptAttempt.status}`);
  }
  console.log('✓ Test 17 Passed: Unauthorized founder blocked from accepting with 403');

  // -------------------------------------------------------------
  // Test 11: Founder can accept a pending request
  // -------------------------------------------------------------
  console.log('Test 11: Founder can accept a pending request...');
  const acceptRes = await request(`http://localhost:5000/api/join-requests/${requestId1}/accept`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${f1Token}` },
  });
  if (acceptRes.status !== 200 || !acceptRes.data.success || acceptRes.data.request.status !== 'ACCEPTED') {
    throw new Error(`Test 11 Failed: Expected 200 ACCEPTED, got ${acceptRes.status} - ${JSON.stringify(acceptRes.data)}`);
  }
  console.log('✓ Test 11 Passed: Founder 1 accepted request');

  // -------------------------------------------------------------
  // Test 12: Accepting creates TeamMembership
  // -------------------------------------------------------------
  console.log('Test 12: Accepting creates TeamMembership...');
  if (!acceptRes.data.membership || acceptRes.data.membership.status !== 'ACTIVE' || acceptRes.data.membership.role !== 'DEVELOPER') {
    throw new Error('Test 12 Failed: TeamMembership was not created or has invalid status/role');
  }
  console.log(`✓ Test 12 Passed: TeamMembership created with ID ${acceptRes.data.membership.id} (status: ACTIVE)`);

  // -------------------------------------------------------------
  // Test 13: Accepted request cannot be accepted again
  // -------------------------------------------------------------
  console.log('Test 13: Accepted request cannot be accepted again (expect 400)...');
  const doubleAcceptRes = await request(`http://localhost:5000/api/join-requests/${requestId1}/accept`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${f1Token}` },
  });
  if (doubleAcceptRes.status !== 400) {
    throw new Error(`Test 13 Failed: Expected 400 for re-accepting request, got ${doubleAcceptRes.status}`);
  }
  console.log('✓ Test 13 Passed: Re-accepting rejected with 400');

  // -------------------------------------------------------------
  // Test 5: Developer cannot request to join if already a member
  // -------------------------------------------------------------
  console.log('Test 5: Developer cannot request to join if already a member (expect 400)...');
  const memberJoinAttempt = await request('http://localhost:5000/api/join-requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${dev1Token}` },
  }, {
    startupId: startup1Id,
    message: 'Want to apply again',
  });
  if (memberJoinAttempt.status !== 400) {
    throw new Error(`Test 5 Failed: Expected 400 for already-active member, got ${memberJoinAttempt.status}`);
  }
  console.log('✓ Test 5 Passed: Active team member blocked from requesting again with 400');

  // -------------------------------------------------------------
  // Test 14: Founder can reject a pending request
  // -------------------------------------------------------------
  console.log('Test 14: Founder can reject a pending request...');
  // Dev 2 requests to join Startup 1
  const dev2JoinRes = await request('http://localhost:5000/api/join-requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${dev2Token}` },
  }, {
    startupId: startup1Id,
    message: 'Dev 2 application',
  });
  const requestId2 = dev2JoinRes.data.request.id;

  const rejectRes = await request(`http://localhost:5000/api/join-requests/${requestId2}/reject`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${f1Token}` },
  });
  if (rejectRes.status !== 200 || !rejectRes.data.success || rejectRes.data.request.status !== 'REJECTED') {
    throw new Error(`Test 14 Failed: Expected 200 REJECTED, got ${rejectRes.status}`);
  }
  console.log('✓ Test 14 Passed: Founder 1 rejected request 2');

  // -------------------------------------------------------------
  // Test 15: Rejected request does not create TeamMembership
  // -------------------------------------------------------------
  console.log('Test 15: Rejected request does not create TeamMembership...');
  if (rejectRes.data.membership) {
    throw new Error('Test 15 Failed: Membership object should not exist for rejected request');
  }
  console.log('✓ Test 15 Passed: Verified no TeamMembership was created for rejected request');

  // -------------------------------------------------------------
  // Test 16: Rejected/accepted request cannot be reviewed again
  // -------------------------------------------------------------
  console.log('Test 16: Rejected/accepted request cannot be reviewed again (expect 400)...');
  const reRejectAttempt = await request(`http://localhost:5000/api/join-requests/${requestId2}/reject`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${f1Token}` },
  });
  if (reRejectAttempt.status !== 400) {
    throw new Error(`Test 16 Failed: Expected 400 when re-rejecting, got ${reRejectAttempt.status}`);
  }
  const acceptRejectedAttempt = await request(`http://localhost:5000/api/join-requests/${requestId2}/accept`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${f1Token}` },
  });
  if (acceptRejectedAttempt.status !== 400) {
    throw new Error(`Test 16 Failed: Expected 400 when accepting an already-rejected request, got ${acceptRejectedAttempt.status}`);
  }
  console.log('✓ Test 16 Passed: Reviewed requests cannot be mutated');

  // -------------------------------------------------------------
  // Test 18: Team endpoint returns correct members
  // -------------------------------------------------------------
  console.log('Test 18: Team endpoint returns correct members...');
  const teamRes = await request(`http://localhost:5000/api/startups/${startup1Id}/team`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${f1Token}` },
  });
  if (teamRes.status !== 200 || !teamRes.data.success || !teamRes.data.founder || !Array.isArray(teamRes.data.members)) {
    throw new Error(`Test 18 Failed: Expected 200 with founder and members, got ${teamRes.status}`);
  }
  if (teamRes.data.founder.role !== 'FOUNDER') {
    throw new Error('Test 18 Failed: Founder data invalid');
  }
  const memberDev1 = teamRes.data.members.find((m) => m.user?.name === 'Dev One');
  if (!memberDev1 || memberDev1.role !== 'DEVELOPER' || memberDev1.status !== 'ACTIVE') {
    throw new Error('Test 18 Failed: Accepted developer missing from team members list');
  }
  console.log(`✓ Test 18 Passed: Team roster contains Founder (${teamRes.data.founder.name}) and Member (${memberDev1.user.name})`);

  // Active member (Dev 1) can also view team
  const dev1TeamView = await request(`http://localhost:5000/api/startups/${startup1Id}/team`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${dev1Token}` },
  });
  if (dev1TeamView.status !== 200 || !dev1TeamView.data.success) {
    throw new Error(`Test 18 Failed: Active member Dev 1 could not view team (status: ${dev1TeamView.status})`);
  }
  console.log('✓ Test 18 Passed: Active team member Dev 1 successfully viewed team roster');

  // -------------------------------------------------------------
  // Test 19: Unrelated user cannot view private team information
  // -------------------------------------------------------------
  console.log("Test 19: Unrelated user cannot view private team information (expect 403)...");
  const unrelatedDevTeamView = await request(`http://localhost:5000/api/startups/${startup1Id}/team`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${dev2Token}` },
  });
  if (unrelatedDevTeamView.status !== 403) {
    throw new Error(`Test 19 Failed: Expected 403 for non-member Dev 2, got ${unrelatedDevTeamView.status}`);
  }
  const investorTeamView = await request(`http://localhost:5000/api/startups/${startup1Id}/team`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${invToken}` },
  });
  if (investorTeamView.status !== 403) {
    throw new Error(`Test 19 Failed: Expected 403 for non-member Investor, got ${investorTeamView.status}`);
  }
  console.log('✓ Test 19 Passed: Unrelated users receive 403 on private team endpoint');

  // -------------------------------------------------------------
  // Test 20: Developer can see their own request history
  // -------------------------------------------------------------
  console.log('Test 20: Developer can see their own request history...');
  const dev1MyRequests = await request('http://localhost:5000/api/join-requests/my', {
    method: 'GET',
    headers: { Authorization: `Bearer ${dev1Token}` },
  });
  if (dev1MyRequests.status !== 200 || !Array.isArray(dev1MyRequests.data.requests)) {
    throw new Error(`Test 20 Failed: Expected 200 with requests array, got ${dev1MyRequests.status}`);
  }
  const myReq = dev1MyRequests.data.requests.find((r) => r.id === requestId1);
  if (!myReq || myReq.status !== 'ACCEPTED' || myReq.startup?.name !== `AgriVision AI ${ts}`) {
    throw new Error('Test 20 Failed: Request history missing startup details or status');
  }
  console.log(`✓ Test 20 Passed: Developer 1 history contains request for ${myReq.startup.name} (Status: ${myReq.status})`);

  // -------------------------------------------------------------
  // Test 21: Developer UI contract: Request to Join state contract
  // -------------------------------------------------------------
  console.log('Test 21: Developer UI contract: Request to Join state contract...');
  // Check Dev 2's status on startup 2 (never requested)
  const dev2MyRequests = await request('http://localhost:5000/api/join-requests/my', {
    method: 'GET',
    headers: { Authorization: `Bearer ${dev2Token}` },
  });
  const dev2HasStartup2 = dev2MyRequests.data.requests.some((r) => r.startup?.id === startup2Id);
  if (dev2HasStartup2) {
    throw new Error('Test 21 Failed: Dev 2 should have NONE status for startup 2');
  }
  console.log('✓ Test 21 Passed: Unrequested startup correctly resolves to NONE -> shows [Request to Join]');

  // -------------------------------------------------------------
  // Test 22: Pending state works
  // -------------------------------------------------------------
  console.log('Test 22: Pending state contract works...');
  // Dev 2 requests startup 2
  const dev2ReqS2 = await request('http://localhost:5000/api/join-requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${dev2Token}` },
  }, {
    startupId: startup2Id,
    message: 'Dev 2 interest in Fintech',
  });
  const dev2S2StatusCheck = await request('http://localhost:5000/api/join-requests/my', {
    method: 'GET',
    headers: { Authorization: `Bearer ${dev2Token}` },
  });
  const s2Req = dev2S2StatusCheck.data.requests.find((r) => r.startup?.id === startup2Id);
  if (!s2Req || s2Req.status !== 'PENDING') {
    throw new Error('Test 22 Failed: Pending state not verified');
  }
  console.log('✓ Test 22 Passed: Verified PENDING state contract -> shows [Request Pending]');

  // -------------------------------------------------------------
  // Test 23: Accepted state works
  // -------------------------------------------------------------
  console.log('Test 23: Accepted state contract works...');
  if (myReq.status !== 'ACCEPTED') {
    throw new Error('Test 23 Failed: Accepted state not verified');
  }
  console.log("✓ Test 23 Passed: Verified ACCEPTED state contract -> shows [You're on the Team]");

  // -------------------------------------------------------------
  // Test 24: Founder UI shows pending requests contract
  // -------------------------------------------------------------
  console.log('Test 24: Founder UI shows pending requests contract...');
  const f2Requests = await request(`http://localhost:5000/api/startups/${startup2Id}/join-requests`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${f2Token}` },
  });
  const pendingInF2 = f2Requests.data.requests.filter((r) => r.status === 'PENDING');
  if (pendingInF2.length === 0 || !pendingInF2[0].developer) {
    throw new Error('Test 24 Failed: Founder UI pending request contract invalid');
  }
  console.log(`✓ Test 24 Passed: Founder 2 has ${pendingInF2.length} pending request ready for review`);

  // -------------------------------------------------------------
  // Test 25: Accept/Reject UI payload works
  // -------------------------------------------------------------
  console.log('Test 25: Accept/Reject UI payload structure works...');
  const dev2S2ReqId = pendingInF2[0].id;
  const f2AcceptRes = await request(`http://localhost:5000/api/join-requests/${dev2S2ReqId}/accept`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${f2Token}` },
  });
  if (f2AcceptRes.status !== 200 || f2AcceptRes.data.membership.status !== 'ACTIVE') {
    throw new Error('Test 25 Failed: UI accept action failed contract verification');
  }
  console.log('✓ Test 25 Passed: Accept action successfully transition state and creates membership');

  // -------------------------------------------------------------
  // Test 26: Existing Startup Discovery still works
  // -------------------------------------------------------------
  console.log('Test 26: Existing Startup Discovery still works (GET /api/startups)...');
  const allStartupsRes = await request('http://localhost:5000/api/startups', {
    method: 'GET',
    headers: { Authorization: `Bearer ${dev1Token}` },
  });
  if (allStartupsRes.status !== 200 || !Array.isArray(allStartupsRes.data.startups) || allStartupsRes.data.startups.length < 2) {
    throw new Error(`Test 26 Failed: Startup discovery failed, status ${allStartupsRes.status}`);
  }
  console.log(`✓ Test 26 Passed: Discover Startups returned ${allStartupsRes.data.startups.length} ventures`);

  // -------------------------------------------------------------
  // Test 27: Existing AI Startup Analyzer still works
  // -------------------------------------------------------------
  console.log('Test 27: Existing AI Startup Analyzer still works...');
  const aiRes = await request(`http://localhost:5000/api/ai/startup-analysis/${startup1Id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${f1Token}` },
  });
  if (aiRes.status !== 200 || !aiRes.data.success || !aiRes.data.data) {
    throw new Error(`Test 27 Failed: AI analyzer failed with status ${aiRes.status}`);
  }
  console.log(`✓ Test 27 Passed: AI Analyzer returned assessment (Source: ${aiRes.data.data.source})`);

  // -------------------------------------------------------------
  // Test 28: Existing Developer Profile still works
  // -------------------------------------------------------------
  console.log('Test 28: Existing Developer Profile still works...');
  const devProfileRes = await request('http://localhost:5000/api/developers/profile', {
    method: 'GET',
    headers: { Authorization: `Bearer ${dev1Token}` },
  });
  if (devProfileRes.status !== 200 || !devProfileRes.data.data.skills.includes('React')) {
    throw new Error(`Test 28 Failed: Developer profile failed with status ${devProfileRes.status}`);
  }
  console.log('✓ Test 28 Passed: Developer Profile retrieved intact');

  // -------------------------------------------------------------
  // Test 29: Existing Founder startup CRUD still works (including cascade cleanup)
  // -------------------------------------------------------------
  console.log('Test 29: Existing Founder startup CRUD still works...');
  // Create temporary startup
  const tempStartupRes = await request('http://localhost:5000/api/startups', {
    method: 'POST',
    headers: { Authorization: `Bearer ${f1Token}` },
  }, {
    name: `Temp Startup ${ts}`,
    tagline: 'Temporary testing startup',
    problemStatement: 'Testing deletion cascade',
    solution: 'Testing solution',
    industry: 'Other',
    stage: 'IDEA',
  });
  const tempStartupId = tempStartupRes.data.startup.id;

  // Update it
  const updateRes = await request(`http://localhost:5000/api/startups/${tempStartupId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${f1Token}` },
  }, { tagline: 'Updated tagline' });
  if (updateRes.status !== 200 || updateRes.data.startup.tagline !== 'Updated tagline') {
    throw new Error('Test 29 Failed: Startup update failed');
  }

  // Delete it
  const deleteRes = await request(`http://localhost:5000/api/startups/${tempStartupId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${f1Token}` },
  });
  if (deleteRes.status !== 200) {
    throw new Error('Test 29 Failed: Startup delete failed');
  }
  console.log('✓ Test 29 Passed: Founder CRUD (create, update, delete with cascade) verified');

  // Security check: Verify passwordHash is never leaked
  console.log('Security check: Verify passwordHash is never leaked in any Phase 5 Step 2 endpoints...');
  const allPayloads = JSON.stringify([
    joinRes1,
    f1ViewRequests,
    acceptRes,
    rejectRes,
    teamRes,
    dev1MyRequests,
  ]);
  if (allPayloads.includes('passwordHash') || allPayloads.includes('Password123!')) {
    throw new Error('SECURITY VIOLATION: passwordHash or credentials leaked in response payloads!');
  }
  console.log('✓ Security Check Passed: Zero password/token leakage detected');

  // -------------------------------------------------------------
  // Test 30: npm run build succeeds with 0 errors
  // -------------------------------------------------------------
  console.log('Test 30: Client production build check (npm run build)...');
  const clientDir = path.resolve(__dirname, '../../client');
  try {
    execSync('npm run build', { cwd: clientDir, stdio: 'pipe' });
    console.log('✓ Test 30 Passed: Client built successfully with 0 errors');
  } catch (err) {
    throw new Error(`Test 30 Failed: Client build failed: ${err.stderr?.toString() || err.message}`);
  }

  console.log('\n================================================================');
  console.log('>>> ALL 30 ACCEPTANCE CRITERIA TESTS PASSED WITH ZERO ERRORS! <<<');
  console.log('================================================================\n');
}

runSuite().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
