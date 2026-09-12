/**
 * Automated Verification Suite for AI Mentor:
 * Tests dynamic, accurate, startup-context aware responses for Developer and Founder.
 * Validates that all 10 core developer questions return distinct, non-identical answers.
 * Validates role-based authorization, empty input rejection (400), conversation history, and references.
 */

const http = require('http');
const assert = require('assert');

const BASE_URL = 'http://localhost:5000/api';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const reqOptions = {
      method: options.method || 'GET',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, data: parsed });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function registerAndLogin(role, emailPrefix = 'user') {
  const email = `${emailPrefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}@test.com`;
  const password = 'Password123!';
  const name = `${role} User`;

  const regRes = await request('/auth/register', {
    method: 'POST',
    body: { name, email, password, role },
  });
  assert([200, 201].includes(regRes.status), `Register failed for ${email}`);

  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  assert.strictEqual(loginRes.status, 200, `Login failed for ${email}`);

  return {
    user: loginRes.data.user,
    token: loginRes.data.token,
  };
}

async function runTests() {
  console.log('================================================================');
  console.log('STARTING AI MENTOR DYNAMIC & CONTEXT-AWARE VERIFICATION SUITE');
  console.log('================================================================\n');

  const timestamp = Date.now();

  // Step 1: Register Founder
  console.log('1. Registering & logging in Founder...');
  const founder = await registerAndLogin('FOUNDER', 'founder_mentor');
  const founderToken = founder.token;

  // Step 2: Register Developer A (Member)
  console.log('2. Registering & logging in Developer A...');
  const devA = await registerAndLogin('DEVELOPER', 'deva_mentor');
  const devAToken = devA.token;
  const devAId = devA.user.id || devA.user._id;

  // Step 3: Register Developer B (Non-Member)
  console.log('3. Registering & logging in Developer B (Non-Member)...');
  const devB = await registerAndLogin('DEVELOPER', 'devb_mentor');
  const devBToken = devB.token;

  // Step 4: Create Developer A Profile
  console.log('4. Creating Developer A Profile...');
  const devAProfile = await request('/developers/profile', {
    method: 'POST',
    headers: { Authorization: `Bearer ${devAToken}` },
    body: {
      bio: 'Fullstack node/react dev',
      skills: ['Node.js', 'React', 'MongoDB', 'Docker'],
      experience: '4 years backend and system architecture',
      availability: 'AVAILABLE',
    },
  });
  assert.strictEqual(devAProfile.status, 201, 'Developer A profile creation should succeed');

  // Step 5: Create Startup
  console.log('5. Creating Startup...');
  const startupRes = await request('/startups', {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderToken}` },
    body: {
      name: `AgriSensor_${timestamp}`,
      tagline: 'IoT Precision Agriculture',
      problemStatement: 'Farmers waste water and power due to unmonitored soil moisture levels.',
      solution: 'Solar-powered automated IoT sensors with telemetry and smart valve control.',
      industry: 'Agriculture',
      stage: 'MVP',
      fundingRequired: 500000,
    },
  });
  assert.strictEqual(startupRes.status, 201, 'Startup creation should succeed');
  const startupId = startupRes.data.startup?.id || startupRes.data.startup?._id || startupRes.data.data?.id;
  assert(startupId, 'Startup ID must exist');

  // Step 6: Developer A sends Join Request & Founder Accepts
  console.log('6. Developer A requests to join and founder accepts...');
  const joinReq = await request('/join-requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${devAToken}` },
    body: {
      startupId,
      message: 'Excited to build the IoT telemetry backend.',
      role: 'FULLSTACK',
    },
  });
  assert.strictEqual(joinReq.status, 201, 'Join request should be created');
  const requestId = joinReq.data.request?.id || joinReq.data.joinRequest?._id || joinReq.data.data?._id;

  const acceptRes = await request(`/join-requests/${requestId}/accept`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${founderToken}` },
  });
  assert.strictEqual(acceptRes.status, 200, 'Founder accepting join request should succeed');

  // Step 7: Create Sprint directly in DB
  console.log('7. Creating active sprint in database...');
  const mongoose = require('mongoose');
  const Sprint = require('../models/Sprint');
  require('dotenv').config();
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
  const sprint = await Sprint.create({
    startup: startupId,
    name: 'Sprint 1 - MVP Telemetry Engine',
    goal: 'Build sensor ingestion pipeline and real-time dashboard',
    duration: 14,
    status: 'ACTIVE',
  });
  assert(sprint._id, 'Sprint document created in DB');

  // Step 8: Create diverse tasks assigned to Developer A
  console.log('8. Creating tasks assigned to Developer A...');
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Task 1: Overdue and Blocked
  const task1 = await request(`/startups/${startupId}/tasks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderToken}` },
    body: {
      title: 'Fix Ingestion Pipeline Gateway Timeout',
      description: 'Sensor data dropping under burst traffic due to buffer overflow',
      priority: 'HIGH',
      status: 'BLOCKED',
      dueDate: yesterday,
      estimatedHours: 6,
      assignedTo: devAId,
    },
  });
  assert.strictEqual(task1.status, 201, 'Task 1 creation should succeed');

  // Task 2: Critical In Progress
  const task2 = await request(`/startups/${startupId}/tasks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderToken}` },
    body: {
      title: 'Implement MQTT Telemetry Consumer',
      description: 'Stream MQTT packets into MongoDB timeseries collection',
      priority: 'CRITICAL',
      status: 'IN_PROGRESS',
      dueDate: tomorrow,
      estimatedHours: 8,
      assignedTo: devAId,
    },
  });
  assert.strictEqual(task2.status, 201, 'Task 2 creation should succeed');

  // Task 3: High Priority Todo
  const task3 = await request(`/startups/${startupId}/tasks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderToken}` },
    body: {
      title: 'Build Valve Actuator Control API',
      description: 'REST endpoints for remote irrigation triggers',
      priority: 'HIGH',
      status: 'TODO',
      dueDate: nextWeek,
      estimatedHours: 5,
      assignedTo: devAId,
    },
  });
  assert.strictEqual(task3.status, 201, 'Task 3 creation should succeed');

  // Task 4: Completed task
  const task4 = await request(`/startups/${startupId}/tasks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderToken}` },
    body: {
      title: 'Setup Environment Config & Secrets',
      description: 'Configure environment variables and connection strings',
      priority: 'MEDIUM',
      status: 'DONE',
      dueDate: yesterday,
      estimatedHours: 3,
      assignedTo: devAId,
    },
  });
  assert.strictEqual(task4.status, 201, 'Task 4 creation should succeed');

  // =========================================================================
  // Section A: Test All 10 Developer Questions
  // =========================================================================
  console.log('\n--- Section A: Testing 10 Distinct Developer AI Mentor Questions ---');

  const questions = [
    'What should I work on next?',
    'Which of my tasks are highest priority?',
    'Do I have any overdue tasks?',
    'How am I performing?',
    'What is blocking my progress?',
    'What should I complete before the sprint ends?',
    'Give me a summary of my current sprint.',
    'Which task should I finish today?',
    'Why is my execution score low?',
    'What should I discuss with my founder?',
  ];

  const responses = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    console.log(`\nTesting Question ${i + 1}: "${q}"`);
    const res = await request(`/developers/startups/${startupId}/ai-mentor`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${devAToken}` },
      body: { message: q },
    });

    assert.strictEqual(res.status, 200, `Question ${i + 1} should return 200`);
    assert.strictEqual(res.data.success, true, `Question ${i + 1} should have success: true`);
    assert(typeof res.data.answer === 'string' && res.data.answer.length > 20, `Question ${i + 1} answer must be substantial`);
    assert(Array.isArray(res.data.actions) && res.data.actions.length >= 1, `Question ${i + 1} must include actions array`);
    assert(Array.isArray(res.data.references) && res.data.references.length >= 1, `Question ${i + 1} must include references array`);
    assert(['gemini', 'fallback'].includes(res.data.source), `Question ${i + 1} source must be gemini or fallback`);

    console.log(`  Source: ${res.data.source}`);
    console.log(`  Answer snippet: "${res.data.answer.slice(0, 100)}..."`);
    console.log(`  References: [${res.data.references.join('; ')}]`);
    console.log(`  Actions count: ${res.data.actions.length}`);

    responses.push({ question: q, answer: res.data.answer, references: res.data.references });
  }

  // Verify all 10 responses are UNIQUE (non-identical)
  console.log('\n--- Verifying Question-to-Answer Diversity ---');
  const answerSet = new Set(responses.map((r) => r.answer));
  console.log(`Total questions: ${questions.length}, Unique answers: ${answerSet.size}`);
  assert.strictEqual(
    answerSet.size,
    questions.length,
    `CRITICAL REQUIREMENT: All ${questions.length} questions MUST produce distinct answers! (Found ${answerSet.size})`
  );
  console.log('✓ PASS: All 10 questions produced 10 unique, non-identical answers.');

  // Specific semantic groundings
  // Q2 (Highest priority): should reference CRITICAL task
  const q2Res = responses[1];
  assert(
    q2Res.answer.toLowerCase().includes('critical') || q2Res.answer.toLowerCase().includes('consumer') || q2Res.answer.toLowerCase().includes('priority'),
    'Q2 answer must mention critical priority tasks'
  );
  console.log('✓ PASS: Q2 accurately references critical priority task.');

  // Q3 (Overdue): should mention overdue task
  const q3Res = responses[2];
  assert(
    q3Res.answer.toLowerCase().includes('overdue') && (q3Res.answer.toLowerCase().includes('fix') || q3Res.answer.toLowerCase().includes('timeout')),
    'Q3 answer must mention overdue task'
  );
  console.log('✓ PASS: Q3 accurately detects overdue task.');

  // Q5 (Blocker): should mention blocked task
  const q5Res = responses[4];
  assert(
    q5Res.answer.toLowerCase().includes('blocked') || q5Res.answer.toLowerCase().includes('timeout') || q5Res.answer.toLowerCase().includes('gateway'),
    'Q5 answer must identify blocked task'
  );
  console.log('✓ PASS: Q5 accurately detects blocked task.');

  // =========================================================================
  // Section B: Input Contract & Edge Cases
  // =========================================================================
  console.log('\n--- Section B: Testing Input Contracts & Edge Cases ---');

  // Test 1: Accept "question" field instead of "message"
  console.log('1. Testing "question" field compatibility...');
  const altFieldRes = await request(`/developers/startups/${startupId}/ai-mentor`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${devAToken}` },
    body: { question: 'What should I work on next?' },
  });
  assert.strictEqual(altFieldRes.status, 200, 'Endpoint should accept "question" field');
  assert.strictEqual(altFieldRes.data.success, true);
  console.log('✓ PASS: Endpoint accepts both "message" and "question".');

  // Test 2: Reject empty question with 400
  console.log('2. Testing empty question rejection (400 Bad Request)...');
  const emptyRes1 = await request(`/developers/startups/${startupId}/ai-mentor`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${devAToken}` },
    body: { message: '   ' },
  });
  assert.strictEqual(emptyRes1.status, 400, 'Whitespace message should return 400');

  const emptyRes2 = await request(`/developers/startups/${startupId}/ai-mentor`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${devAToken}` },
    body: {},
  });
  assert.strictEqual(emptyRes2.status, 400, 'Empty body should return 400');
  console.log('✓ PASS: Empty questions rejected with 400.');

  // Test 3: Conversation history support
  console.log('3. Testing conversation history support...');
  const historyRes = await request(`/developers/startups/${startupId}/ai-mentor`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${devAToken}` },
    body: {
      message: 'Can you give me more details on that?',
      history: [
        { role: 'user', content: 'What should I work on next?' },
        { role: 'assistant', content: responses[0].answer },
      ],
    },
  });
  assert.strictEqual(historyRes.status, 200, 'History request should succeed');
  assert(historyRes.data.answer.length > 20, 'Should return detailed response');
  console.log('✓ PASS: Conversation history incorporated successfully.');

  // =========================================================================
  // Section C: Security & Authorization
  // =========================================================================
  console.log('\n--- Section C: Security & Access Control ---');

  // Test 1: Non-member developer cannot access AI Mentor (403)
  console.log('1. Non-member developer attempting access...');
  const nonMemberRes = await request(`/developers/startups/${startupId}/ai-mentor`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${devBToken}` },
    body: { message: 'What should I work on?' },
  });
  assert.strictEqual(nonMemberRes.status, 403, 'Non-member developer must receive 403 Forbidden');
  console.log('✓ PASS: Non-member developer blocked with 403 Forbidden.');

  // Test 2: Unauthenticated query rejected (401)
  console.log('2. Unauthenticated query attempting access...');
  const unauthRes = await request(`/developers/startups/${startupId}/ai-mentor`, {
    method: 'POST',
    body: { message: 'What should I work on?' },
  });
  assert.strictEqual(unauthRes.status, 401, 'Unauthenticated query must receive 401');
  console.log('✓ PASS: Unauthenticated query rejected with 401 Unauthorized.');

  // Test 3: Founder accessing Founder Copilot / AI Mentor endpoint
  console.log('3. Founder querying Founder Copilot endpoint...');
  const founderCopilotRes = await request(`/ai/copilot/${startupId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderToken}` },
    body: { message: 'What should we focus on this week?' },
  });
  assert.strictEqual(founderCopilotRes.status, 200, 'Founder should access /ai/copilot with 200');
  assert(typeof founderCopilotRes.data.answer === 'string' && founderCopilotRes.data.answer.length > 20);
  assert(Array.isArray(founderCopilotRes.data.actions));
  assert(Array.isArray(founderCopilotRes.data.references));
  console.log('✓ PASS: Founder accesses Founder Copilot with references and actions.');

  // Test 4: Developer cannot access Founder Copilot endpoint (403)
  console.log('4. Developer attempting access to Founder Copilot endpoint...');
  const devToFounderCopilot = await request(`/ai/copilot/${startupId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${devAToken}` },
    body: { message: 'What should we focus on this week?' },
  });
  assert.strictEqual(devToFounderCopilot.status, 403, 'Developer must receive 403 on Founder Copilot endpoint');
  console.log('✓ PASS: Developer cannot access Founder Copilot endpoint (403 Forbidden).');

  console.log('\n================================================================');
  console.log('ALL AI MENTOR DYNAMIC & ACCURACY TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ AI MENTOR TEST FAILED:', err);
  process.exit(1);
});
