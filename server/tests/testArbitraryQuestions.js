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

async function testArbitrary() {
  console.log('Testing arbitrary, unique questions against live AI Mentor...');

  const ts = Date.now();
  // 1. Register & Login Founder
  await request('/auth/register', {
    method: 'POST',
    body: { name: 'Founder Uniq', email: `founder_${ts}@test.com`, password: 'Password123!', role: 'FOUNDER' },
  });
  const fLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: `founder_${ts}@test.com`, password: 'Password123!' },
  });
  const fToken = fLogin.data.token;

  // 2. Create Startup
  const sRes = await request('/startups', {
    method: 'POST',
    headers: { Authorization: `Bearer ${fToken}` },
    body: {
      name: `StreamMesh_${ts}`,
      tagline: 'High-throughput event streaming',
      industry: 'Developer Tools',
      stage: 'MVP',
      problemStatement: 'Message brokers are notoriously hard to scale and manage on edge nodes.',
      solution: 'Distributed zero-config messaging mesh optimized for edge IoT devices.',
      fundingRequired: 5000000,
    },
  });
  const startupId = sRes.data.startup?._id || sRes.data.data?._id || sRes.data.startup?.id;

  // 3. Register & Login Developer
  await request('/auth/register', {
    method: 'POST',
    body: { name: 'Dev Uniq', email: `dev_${ts}@test.com`, password: 'Password123!', role: 'DEVELOPER' },
  });
  const dLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: `dev_${ts}@test.com`, password: 'Password123!' },
  });
  const dToken = dLogin.data.token;

  // 4. Create Developer Profile
  await request('/developers/profile', {
    method: 'POST',
    headers: { Authorization: `Bearer ${dToken}` },
    body: {
      name: 'Dev Uniq',
      skills: ['Rust', 'WebSockets', 'Distributed Systems', 'PostgreSQL'],
      experienceYears: 4,
    },
  });

  // 5. Join request & Accept
  const jrRes = await request('/join-requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${dToken}` },
    body: {
      startupId,
      message: 'I can build the Rust streaming core',
      role: 'FULLSTACK',
    },
  });
  assert.strictEqual(jrRes.status, 201, 'Join request should succeed');
  const reqId = jrRes.data.request?.id || jrRes.data.joinRequest?._id || jrRes.data.data?._id;

  const acceptRes = await request(`/join-requests/${reqId}/accept`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${fToken}` },
  });
  assert.strictEqual(acceptRes.status, 200, 'Accept join request should succeed');

  // 6. Ask 3 completely custom, arbitrary questions to Developer AI Mentor
  console.log('\n--- Testing Developer AI Mentor with Arbitrary Technical Questions ---');
  const devQuestions = [
    'How should I structure the database indexing for our real-time telemetry?',
    'What is the best architectural pattern to handle WebSocket reconnections with minimal data loss?',
    'How can our startup benchmark Rust event throughput before deploying to pilot customers?',
  ];

  const devAnswers = [];
  for (let i = 0; i < devQuestions.length; i++) {
    const q = devQuestions[i];
    console.log(`\nSending Developer Question ${i + 1}: "${q}"`);
    const mentorRes = await request(`/developers/startups/${startupId}/ai-mentor`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${dToken}` },
      body: { message: q },
    });

    assert.strictEqual(mentorRes.status, 200, `Expected 200, got ${mentorRes.status}`);
    console.log(`  Source: ${mentorRes.data.source}`);
    console.log(`  Answer: "${mentorRes.data.answer.slice(0, 150)}..."`);
    console.log(`  Actions:`, mentorRes.data.actions);
    console.log(`  References:`, mentorRes.data.references);
    devAnswers.push(mentorRes.data.answer);
  }

  assert.notStrictEqual(devAnswers[0], devAnswers[1], 'Dev answers 0 and 1 must be unique');
  assert.notStrictEqual(devAnswers[1], devAnswers[2], 'Dev answers 1 and 2 must be unique');
  assert.notStrictEqual(devAnswers[0], devAnswers[2], 'Dev answers 0 and 2 must be unique');

  console.log('\n✓ ALL 3 DEVELOPER AI MENTOR ARBITRARY QUESTIONS RETURNED UNIQUE, CUSTOMIZED ANSWERS!');

  // 7. Ask 3 completely custom, arbitrary questions to Founder Copilot
  console.log('\n--- Testing Founder Copilot with Arbitrary Strategic Questions ---');
  const founderQuestions = [
    'How should we approach enterprise pilot pricing for edge IoT devices?',
    'What key hire should we make next given our stage and technical needs?',
    'How do we prepare our pitch to highlight our distributed mesh moat against Kafka?',
  ];

  const founderAnswers = [];
  for (let i = 0; i < founderQuestions.length; i++) {
    const q = founderQuestions[i];
    console.log(`\nSending Founder Question ${i + 1}: "${q}"`);
    const copilotRes = await request(`/ai/copilot/${startupId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${fToken}` },
      body: { message: q },
    });

    assert.strictEqual(copilotRes.status, 200, `Expected 200, got ${copilotRes.status}`);
    console.log(`  Source: ${copilotRes.data.source}`);
    console.log(`  Answer: "${copilotRes.data.answer.slice(0, 150)}..."`);
    console.log(`  Actions:`, copilotRes.data.actions);
    console.log(`  References:`, copilotRes.data.references);
    founderAnswers.push(copilotRes.data.answer);
  }

  assert.notStrictEqual(founderAnswers[0], founderAnswers[1], 'Founder answers 0 and 1 must be unique');
  assert.notStrictEqual(founderAnswers[1], founderAnswers[2], 'Founder answers 1 and 2 must be unique');
  assert.notStrictEqual(founderAnswers[0], founderAnswers[2], 'Founder answers 0 and 2 must be unique');

  console.log('\n✓ ALL 3 FOUNDER COPILOT ARBITRARY QUESTIONS RETURNED UNIQUE, CUSTOMIZED ANSWERS!');
  console.log('\n================================================================');
  console.log('✓ ALL DEVELOPER AND FOUNDER CHATBOT RESPONSES ARE UNIQUE AND DYNAMIC!');
  console.log('================================================================');
}

testArbitrary().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
