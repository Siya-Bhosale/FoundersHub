const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { execSync } = require('child_process');

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

async function runJoinRequestFixSuite() {
  const ts = Date.now();
  console.log('================================================================');
  console.log('JOIN REQUEST WORKFLOW & FOUNDER RETRIEVAL VERIFICATION SUITE');
  console.log('================================================================\n');

  // Connect to MongoDB directly to verify database records
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;

  // -------------------------------------------------------------
  // Setup Users: Founder A, Founder B, Developer A, Developer B, Investor
  // -------------------------------------------------------------
  console.log('--- Registering and authenticating test accounts ---');

  // Founder A
  const fAEmail = `founderA_${ts}@test.com`;
  await request('http://localhost:5000/api/auth/register', { method: 'POST' }, {
    name: 'Founder A',
    email: fAEmail,
    password: 'Password123!',
    role: 'FOUNDER',
  });
  const fALogin = await request('http://localhost:5000/api/auth/login', { method: 'POST' }, {
    email: fAEmail,
    password: 'Password123!',
  });
  const fAToken = fALogin.data.token;
  const fAId = fALogin.data.user.id;

  // Founder B
  const fBEmail = `founderB_${ts}@test.com`;
  await request('http://localhost:5000/api/auth/register', { method: 'POST' }, {
    name: 'Founder B',
    email: fBEmail,
    password: 'Password123!',
    role: 'FOUNDER',
  });
  const fBLogin = await request('http://localhost:5000/api/auth/login', { method: 'POST' }, {
    email: fBEmail,
    password: 'Password123!',
  });
  const fBToken = fBLogin.data.token;
  const fBId = fBLogin.data.user.id;

  // Developer A
  const devAEmail = `devA_${ts}@test.com`;
  await request('http://localhost:5000/api/auth/register', { method: 'POST' }, {
    name: 'Developer A',
    email: devAEmail,
    password: 'Password123!',
    role: 'DEVELOPER',
  });
  const devALogin = await request('http://localhost:5000/api/auth/login', { method: 'POST' }, {
    email: devAEmail,
    password: 'Password123!',
  });
  const devAToken = devALogin.data.token;
  const devAId = devALogin.data.user.id;

  // Developer A Profile with React, Node.js, MongoDB
  await request('http://localhost:5000/api/developers/profile', {
    method: 'POST',
    headers: { Authorization: `Bearer ${devAToken}` },
  }, {
    bio: 'Experienced full stack engineer specializing in MERN stack architectures.',
    skills: ['React', 'Node.js', 'MongoDB'],
    experience: '3 years building production applications',
    github: 'https://github.com/developer-a',
    availability: 'AVAILABLE',
  });

  // Developer B
  const devBEmail = `devB_${ts}@test.com`;
  await request('http://localhost:5000/api/auth/register', { method: 'POST' }, {
    name: 'Developer B',
    email: devBEmail,
    password: 'Password123!',
    role: 'DEVELOPER',
  });
  const devBLogin = await request('http://localhost:5000/api/auth/login', { method: 'POST' }, {
    email: devBEmail,
    password: 'Password123!',
  });
  const devBToken = devBLogin.data.token;
  const devBId = devBLogin.data.user.id;

  // Investor
  const invEmail = `investor_${ts}@test.com`;
  await request('http://localhost:5000/api/auth/register', { method: 'POST' }, {
    name: 'Investor One',
    email: invEmail,
    password: 'Password123!',
    role: 'INVESTOR',
  });
  const invLogin = await request('http://localhost:5000/api/auth/login', { method: 'POST' }, {
    email: invEmail,
    password: 'Password123!',
  });
  const invToken = invLogin.data.token;

  console.log('✓ Accounts successfully created.\n');

  // STEP 1: Founder A creates AgriVision AI
  console.log('STEP 1: Founder A creates startup "AgriVision AI"...');
  const startupRes = await request('http://localhost:5000/api/startups', {
    method: 'POST',
    headers: { Authorization: `Bearer ${fAToken}` },
  }, {
    name: `AgriVision AI ${ts}`,
    tagline: 'Computer vision diagnostics for modern farm yields',
    problemStatement: 'Crop diseases go undetected until large-scale loss occurs.',
    solution: 'Real-time drone vision AI inference for field telemetry.',
    industry: 'Agriculture',
    stage: 'MVP',
  });

  if (startupRes.status !== 201 || !startupRes.data.startup) {
    throw new Error(`Failed to create startup: ${JSON.stringify(startupRes.data)}`);
  }
  const startupAId = startupRes.data.startup.id;
  console.log(`✓ STEP 1 Passed: AgriVision AI created with ObjectId ${startupAId}`);

  // Founder B creates Startup B
  const startupBRes = await request('http://localhost:5000/api/startups', {
    method: 'POST',
    headers: { Authorization: `Bearer ${fBToken}` },
  }, {
    name: `FinTech B ${ts}`,
    tagline: 'Autonomous cashflow for SaaS',
    problemStatement: 'SaaS burn rate is unpredictable.',
    solution: 'Predictive liquidity models.',
    industry: 'Fintech',
    stage: 'IDEA',
  });
  const startupBId = startupBRes.data.startup.id;

  // -------------------------------------------------------------
  // Test 1: Developer can create join request
  // -------------------------------------------------------------
  console.log('\nTest 1: Developer can create join request...');
  const msgA = 'I would like to contribute my React, Node.js and MongoDB skills to the development of this startup.';
  const createReqRes = await request('http://localhost:5000/api/join-requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${devAToken}` },
  }, {
    startupId: startupAId,
    message: msgA,
  });

  if (createReqRes.status !== 201 || !createReqRes.data.success || !createReqRes.data.request) {
    throw new Error(`Test 1 Failed: Expected 201, got ${createReqRes.status}: ${JSON.stringify(createReqRes.data)}`);
  }
  const requestId = createReqRes.data.request.id;
  console.log(`✓ Test 1 Passed: Developer A created join request ${requestId}`);

  // -------------------------------------------------------------
  // Test 2, 3, 4, 5: Verify MongoDB persistence and schema
  // -------------------------------------------------------------
  console.log('Test 2, 3, 4, 5: Directly verifying MongoDB document...');
  const dbDoc = await db.collection('joinrequests').findOne({ _id: new mongoose.Types.ObjectId(requestId) });
  if (!dbDoc) {
    throw new Error('Test 2 Failed: JoinRequest document not found in MongoDB!');
  }
  console.log('✓ Test 2 Passed: Join request is persisted in MongoDB.');

  if (dbDoc.startup.toString() !== startupAId) {
    throw new Error(`Test 3 Failed: startup ObjectId ${dbDoc.startup} does not match ${startupAId}`);
  }
  console.log(`✓ Test 3 Passed: Correct startup ObjectId stored (${dbDoc.startup})`);

  if (dbDoc.developer.toString() !== devAId) {
    throw new Error(`Test 4 Failed: developer ObjectId ${dbDoc.developer} does not match ${devAId}`);
  }
  console.log(`✓ Test 4 Passed: Correct developer ObjectId stored (${dbDoc.developer})`);

  if (dbDoc.status !== 'PENDING') {
    throw new Error(`Test 5 Failed: status is ${dbDoc.status}, expected PENDING`);
  }
  console.log('✓ Test 5 Passed: Status defaults to PENDING');

  // -------------------------------------------------------------
  // Test 6 & 7: Founder can retrieve requests for own startup and sees correct developer
  // -------------------------------------------------------------
  console.log('Test 6 & 7: Founder can retrieve requests for own startup...');
  const founderGetRes = await request(`http://localhost:5000/api/startups/${startupAId}/join-requests`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${fAToken}` },
  });

  if (founderGetRes.status !== 200 || !Array.isArray(founderGetRes.data.requests)) {
    throw new Error(`Test 6 Failed: Expected 200, got ${founderGetRes.status}`);
  }
  const foundReq = founderGetRes.data.requests.find((r) => r.id === requestId);
  if (!foundReq) {
    throw new Error('Test 6 Failed: JoinRequest not returned in founder request query');
  }
  console.log('✓ Test 6 Passed: Founder retrieved request list containing the pending request.');

  if (!foundReq.developer || foundReq.developer.name !== 'Developer A') {
    throw new Error(`Test 7 Failed: Developer info mismatch: ${JSON.stringify(foundReq.developer)}`);
  }
  const skills = foundReq.developer.skills || foundReq.developer.profile?.skills || [];
  if (!skills.includes('React') || !skills.includes('Node.js') || !skills.includes('MongoDB')) {
    throw new Error(`Test 7 Failed: Developer skills missing React, Node.js, or MongoDB: ${skills}`);
  }
  console.log(`✓ Test 7 Passed: Founder sees correct developer "Developer A" with skills [${skills.join(', ')}]`);

  // Test alias endpoint: GET /api/join-requests/startup/:startupId
  const aliasGetRes = await request(`http://localhost:5000/api/join-requests/startup/${startupAId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${fAToken}` },
  });
  if (aliasGetRes.status !== 200) {
    throw new Error(`Alias endpoint GET /api/join-requests/startup/:startupId failed with status ${aliasGetRes.status}`);
  }
  console.log('✓ Verified: Alias endpoint GET /api/join-requests/startup/:startupId returns 200');

  // -------------------------------------------------------------
  // Test 8: Founder cannot retrieve another founder's requests
  // -------------------------------------------------------------
  console.log("Test 8: Founder B cannot retrieve Founder A's requests (expect 403)...");
  const crossFounderRes = await request(`http://localhost:5000/api/startups/${startupAId}/join-requests`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${fBToken}` },
  });
  if (crossFounderRes.status !== 403) {
    throw new Error(`Test 8 Failed: Expected 403, got ${crossFounderRes.status}`);
  }
  console.log("✓ Test 8 Passed: Cross-founder access correctly blocked with 403 Forbidden");

  // -------------------------------------------------------------
  // Test 9: Developer can retrieve own requests
  // -------------------------------------------------------------
  console.log('Test 9: Developer can retrieve own requests...');
  const devMyRes = await request('http://localhost:5000/api/join-requests/my', {
    method: 'GET',
    headers: { Authorization: `Bearer ${devAToken}` },
  });
  if (devMyRes.status !== 200 || !Array.isArray(devMyRes.data.requests)) {
    throw new Error(`Test 9 Failed: Expected 200, got ${devMyRes.status}`);
  }
  const myReq = devMyRes.data.requests.find((r) => r.id === requestId);
  if (!myReq || myReq.status !== 'PENDING') {
    throw new Error('Test 9 Failed: Pending request not found in developer request list');
  }
  console.log('✓ Test 9 Passed: Developer retrieved own requests with status PENDING');

  // -------------------------------------------------------------
  // Test 10: Investor cannot create join request
  // -------------------------------------------------------------
  console.log('Test 10: Investor cannot create join request (expect 403)...');
  const invCreateRes = await request('http://localhost:5000/api/join-requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${invToken}` },
  }, {
    startupId: startupAId,
    message: 'Invest and join',
  });
  if (invCreateRes.status !== 403) {
    throw new Error(`Test 10 Failed: Expected 403, got ${invCreateRes.status}`);
  }
  console.log('✓ Test 10 Passed: Investor creation blocked with 403');

  // -------------------------------------------------------------
  // Test 11: Investor cannot retrieve founder requests
  // -------------------------------------------------------------
  console.log('Test 11: Investor cannot retrieve founder requests (expect 403)...');
  const invGetRes = await request(`http://localhost:5000/api/startups/${startupAId}/join-requests`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${invToken}` },
  });
  if (invGetRes.status !== 403) {
    throw new Error(`Test 11 Failed: Expected 403, got ${invGetRes.status}`);
  }
  console.log('✓ Test 11 Passed: Investor retrieval blocked with 403');

  // -------------------------------------------------------------
  // Test 12: Unauthenticated request returns 401
  // -------------------------------------------------------------
  console.log('Test 12: Unauthenticated request returns 401...');
  const unauthRes = await request('http://localhost:5000/api/join-requests', {
    method: 'POST',
  }, { startupId: startupAId });
  if (unauthRes.status !== 401) {
    throw new Error(`Test 12 Failed: Expected 401, got ${unauthRes.status}`);
  }
  console.log('✓ Test 12 Passed: Unauthenticated request returned 401');

  // -------------------------------------------------------------
  // Test 13: Invalid startup ID returns 400
  // -------------------------------------------------------------
  console.log('Test 13: Invalid startup ID returns 400...');
  const invalidIdRes = await request('http://localhost:5000/api/join-requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${devAToken}` },
  }, {
    startupId: 'invalid-id-format',
    message: 'test',
  });
  if (invalidIdRes.status !== 400) {
    throw new Error(`Test 13 Failed: Expected 400, got ${invalidIdRes.status}`);
  }
  console.log('✓ Test 13 Passed: Invalid startup ID returned 400');

  // -------------------------------------------------------------
  // Test 14: Nonexistent startup returns 404
  // -------------------------------------------------------------
  console.log('Test 14: Nonexistent startup returns 404...');
  const fakeStartupId = '507f1f77bcf86cd799439011';
  const nonexistentRes = await request('http://localhost:5000/api/join-requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${devAToken}` },
  }, {
    startupId: fakeStartupId,
    message: 'test',
  });
  if (nonexistentRes.status !== 404) {
    throw new Error(`Test 14 Failed: Expected 404, got ${nonexistentRes.status}`);
  }
  console.log('✓ Test 14 Passed: Nonexistent startup returned 404');

  // -------------------------------------------------------------
  // Test 15: Duplicate pending request is rejected
  // -------------------------------------------------------------
  console.log('Test 15: Duplicate pending request is rejected (expect 400)...');
  const dupRes = await request('http://localhost:5000/api/join-requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${devAToken}` },
  }, {
    startupId: startupAId,
    message: 'Applying a second time',
  });
  if (dupRes.status !== 400) {
    throw new Error(`Test 15 Failed: Expected 400, got ${dupRes.status}`);
  }
  console.log('✓ Test 15 Passed: Duplicate pending request rejected with 400');

  // -------------------------------------------------------------
  // Test 21: Cross-founder accept/reject returns 403
  // -------------------------------------------------------------
  console.log("Test 21: Cross-founder access on accept returns 403...");
  const crossAcceptRes = await request(`http://localhost:5000/api/join-requests/${requestId}/accept`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${fBToken}` },
  });
  if (crossAcceptRes.status !== 403) {
    throw new Error(`Test 21 Failed: Expected 403, got ${crossAcceptRes.status}`);
  }
  console.log('✓ Test 21 Passed: Cross-founder accept rejected with 403');

  // -------------------------------------------------------------
  // Test 22: Refreshing founder page still retrieves request from database
  // -------------------------------------------------------------
  console.log('Test 22: Refreshing founder page still retrieves request from database...');
  const refreshedGetRes = await request(`http://localhost:5000/api/startups/${startupAId}/join-requests`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${fAToken}` },
  });
  if (refreshedGetRes.status !== 200 || !refreshedGetRes.data.requests.some((r) => r.id === requestId && r.status === 'PENDING')) {
    throw new Error('Test 22 Failed: Request not present on page refresh');
  }
  console.log('✓ Test 22 Passed: Request persistently retrieved on fresh query');

  // -------------------------------------------------------------
  // Test 17 & 18: Founder can accept request & TeamMembership is created
  // -------------------------------------------------------------
  console.log('Test 17 & 18: Founder accepts request...');
  const acceptRes = await request(`http://localhost:5000/api/join-requests/${requestId}/accept`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${fAToken}` },
  });
  if (acceptRes.status !== 200 || !acceptRes.data.success || acceptRes.data.request.status !== 'ACCEPTED') {
    throw new Error(`Test 17 Failed: Expected 200 ACCEPTED, got ${acceptRes.status}`);
  }
  console.log('✓ Test 17 Passed: Request accepted');

  if (!acceptRes.data.membership || acceptRes.data.membership.status !== 'ACTIVE') {
    throw new Error('Test 18 Failed: TeamMembership not created with status ACTIVE');
  }
  const membershipId = acceptRes.data.membership.id;
  console.log(`✓ Test 18 Passed: TeamMembership created (${membershipId}, status: ACTIVE)`);

  // Direct MongoDB verification of TeamMembership
  const teamMemberInDb = await db.collection('teammemberships').findOne({
    startup: new mongoose.Types.ObjectId(startupAId),
    user: new mongoose.Types.ObjectId(devAId),
    status: 'ACTIVE',
  });
  if (!teamMemberInDb) {
    throw new Error('Test 18 Verification Failed: TeamMembership not found in MongoDB');
  }
  console.log('✓ Verified: TeamMembership document confirmed in MongoDB');

  // -------------------------------------------------------------
  // Test 16: Existing active team member cannot create duplicate join request
  // -------------------------------------------------------------
  console.log('Test 16: Active team member cannot create duplicate join request (expect 400)...');
  const memberApplyRes = await request('http://localhost:5000/api/join-requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${devAToken}` },
  }, {
    startupId: startupAId,
    message: 'Applying as active member',
  });
  if (memberApplyRes.status !== 400) {
    throw new Error(`Test 16 Failed: Expected 400, got ${memberApplyRes.status}`);
  }
  console.log('✓ Test 16 Passed: Active member blocked from re-requesting with 400');

  // -------------------------------------------------------------
  // Test 19 & 20: Founder can reject request & Rejection does not create TeamMembership
  // -------------------------------------------------------------
  console.log('\nTest 19 & 20: Founder rejects a request...');
  // Developer B applies to AgriVision AI
  const devBReqRes = await request('http://localhost:5000/api/join-requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${devBToken}` },
  }, {
    startupId: startupAId,
    message: 'Developer B application note',
  });
  const reqBId = devBReqRes.data.request.id;

  const rejectRes = await request(`http://localhost:5000/api/join-requests/${reqBId}/reject`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${fAToken}` },
  });
  if (rejectRes.status !== 200 || !rejectRes.data.success || rejectRes.data.request.status !== 'REJECTED') {
    throw new Error(`Test 19 Failed: Expected 200 REJECTED, got ${rejectRes.status}`);
  }
  console.log('✓ Test 19 Passed: Join request rejected with status REJECTED');

  const rejectedMemberInDb = await db.collection('teammemberships').findOne({
    startup: new mongoose.Types.ObjectId(startupAId),
    user: new mongoose.Types.ObjectId(devBId),
  });
  if (rejectedMemberInDb) {
    throw new Error('Test 20 Failed: TeamMembership should NOT exist for rejected request');
  }
  console.log('✓ Test 20 Passed: Verified no TeamMembership was created for rejected request');

  // -------------------------------------------------------------
  // Test 23: Developer sees correct request status
  // -------------------------------------------------------------
  console.log('Test 23: Developer sees correct request status...');
  const devACheckRes = await request('http://localhost:5000/api/join-requests/my', {
    method: 'GET',
    headers: { Authorization: `Bearer ${devAToken}` },
  });
  const devAReqObj = devACheckRes.data.requests.find((r) => r.id === requestId);
  if (!devAReqObj || devAReqObj.status !== 'ACCEPTED') {
    throw new Error(`Test 23 Failed: Expected status ACCEPTED, got ${devAReqObj?.status}`);
  }
  console.log('✓ Test 23 Passed: Developer A sees status ACCEPTED');

  // -------------------------------------------------------------
  // Test 24 & 25: Security checks (no passwordHash or secrets exposed)
  // -------------------------------------------------------------
  console.log('Test 24 & 25: Security checks on responses...');
  const responsesToCheck = [founderGetRes, aliasGetRes, devMyRes, acceptRes, rejectRes];
  responsesToCheck.forEach((res) => {
    const raw = JSON.stringify(res.data);
    if (raw.includes('passwordHash') || raw.includes('$2a$') || raw.includes('$2b$')) {
      throw new Error('Test 24 Failed: passwordHash leaked in API response!');
    }
    if (raw.includes('JWT_SECRET') || raw.includes('process.env')) {
      throw new Error('Test 25 Failed: Secret leaked in API response!');
    }
  });
  console.log('✓ Test 24 & 25 Passed: Zero passwordHash or token secrets leaked');

  // -------------------------------------------------------------
  // Test 26: Existing Startup Discovery still works
  // -------------------------------------------------------------
  console.log('Test 26: Existing Startup Discovery still works...');
  const discoverRes = await request('http://localhost:5000/api/startups', {
    method: 'GET',
    headers: { Authorization: `Bearer ${devAToken}` },
  });
  if (discoverRes.status !== 200 || !Array.isArray(discoverRes.data.startups)) {
    throw new Error(`Test 26 Failed: Expected 200 with startups array, got ${discoverRes.status}`);
  }
  console.log(`✓ Test 26 Passed: Discovery works (${discoverRes.data.startups.length} startups returned)`);

  // -------------------------------------------------------------
  // Test 27: Existing Developer Profile still works
  // -------------------------------------------------------------
  console.log('Test 27: Existing Developer Profile still works...');
  const profileRes = await request('http://localhost:5000/api/developers/profile', {
    method: 'GET',
    headers: { Authorization: `Bearer ${devAToken}` },
  });
  if (profileRes.status !== 200 || !profileRes.data.data) {
    throw new Error(`Test 27 Failed: Expected 200 profile data, got ${profileRes.status}`);
  }
  console.log('✓ Test 27 Passed: Developer Profile retrieved intact');

  // -------------------------------------------------------------
  // Test 28: Existing Team page still works
  // -------------------------------------------------------------
  console.log('Test 28: Existing Team page endpoint still works...');
  const teamRes = await request(`http://localhost:5000/api/startups/${startupAId}/team`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${fAToken}` },
  });
  if (teamRes.status !== 200 || !Array.isArray(teamRes.data.members)) {
    throw new Error(`Test 28 Failed: Expected 200 with team members, got ${teamRes.status}`);
  }
  const memberFound = teamRes.data.members.some((m) => m.user?.name === 'Developer A');
  if (!memberFound) {
    throw new Error('Test 28 Failed: Developer A not found in team members list');
  }
  console.log('✓ Test 28 Passed: Team roster contains Developer A as active member');

  // -------------------------------------------------------------
  // Test 29: Authentication still works
  // -------------------------------------------------------------
  console.log('Test 29: Authentication still works...');
  const authCheckRes = await request('http://localhost:5000/api/auth/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${devAToken}` },
  });
  if (authCheckRes.status !== 200 || authCheckRes.data.user?.id !== devAId) {
    throw new Error(`Test 29 Failed: Auth verification failed with status ${authCheckRes.status}`);
  }
  console.log('✓ Test 29 Passed: Auth verification works seamlessly');

  // -------------------------------------------------------------
  // Test 30: npm run build check
  // -------------------------------------------------------------
  console.log('Test 30: Running client production build check...');
  const buildOutput = execSync('npm run build', {
    cwd: path.resolve(__dirname, '../../client'),
    encoding: 'utf8',
  });
  if (!buildOutput.includes('built in')) {
    throw new Error(`Test 30 Failed: Build output unexpected: ${buildOutput}`);
  }
  console.log('✓ Test 30 Passed: Production build succeeded with zero errors');

  console.log('\n================================================================');
  console.log('>>> ALL 30 ACCEPTANCE CRITERIA TESTS PASSED WITH ZERO ERRORS! <<<');
  console.log('================================================================');

  await mongoose.disconnect();
}

runJoinRequestFixSuite().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
