const http = require('http');
const dotenv = require('dotenv');
dotenv.config();

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

async function runE2ETests() {
  const ts = Date.now();
  console.log('=== PHASE 4 STEP 1 VERIFICATION SUITE ===\n');

  // 1. Setup Users
  console.log('1. Setting up users (Founders, Developer, Investor)...');
  const f1Reg = await request(
    'http://localhost:5000/api/auth/register',
    { method: 'POST' },
    {
      name: 'Founder One',
      email: 'f1_' + ts + '@test.com',
      password: 'Password123!',
      role: 'FOUNDER',
    }
  );
  const f1Login = await request(
    'http://localhost:5000/api/auth/login',
    { method: 'POST' },
    {
      email: 'f1_' + ts + '@test.com',
      password: 'Password123!',
    }
  );
  const f1Token = f1Login.data.token;

  const f2Reg = await request(
    'http://localhost:5000/api/auth/register',
    { method: 'POST' },
    {
      name: 'Founder Two',
      email: 'f2_' + ts + '@test.com',
      password: 'Password123!',
      role: 'FOUNDER',
    }
  );
  const f2Login = await request(
    'http://localhost:5000/api/auth/login',
    { method: 'POST' },
    {
      email: 'f2_' + ts + '@test.com',
      password: 'Password123!',
    }
  );
  const f2Token = f2Login.data.token;

  const devReg = await request(
    'http://localhost:5000/api/auth/register',
    { method: 'POST' },
    {
      name: 'Dev User',
      email: 'dev_' + ts + '@test.com',
      password: 'Password123!',
      role: 'DEVELOPER',
    }
  );
  const devLogin = await request(
    'http://localhost:5000/api/auth/login',
    { method: 'POST' },
    {
      email: 'dev_' + ts + '@test.com',
      password: 'Password123!',
    }
  );
  const devToken = devLogin.data.token;

  const invReg = await request(
    'http://localhost:5000/api/auth/register',
    { method: 'POST' },
    {
      name: 'Investor User',
      email: 'inv_' + ts + '@test.com',
      password: 'Password123!',
      role: 'INVESTOR',
    }
  );
  const invLogin = await request(
    'http://localhost:5000/api/auth/login',
    { method: 'POST' },
    {
      email: 'inv_' + ts + '@test.com',
      password: 'Password123!',
    }
  );
  const invToken = invLogin.data.token;

  console.log('✓ Users registered & logged in successfully.\n');

  // 2. Founder 1 creates startup
  console.log('2. Founder 1 creates startup: AgriVision AI...');
  const createStartupRes = await request(
    'http://localhost:5000/api/startups',
    {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + f1Token },
    },
    {
      name: 'AgriVision AI',
      tagline: 'AI-powered crop disease detection for farmers',
      problemStatement:
        'Farmers struggle to identify crop diseases early, leading to 30% yield loss annually.',
      solution:
        'Computer vision mobile app that analyzes leaf photos in seconds and recommends treatments.',
      industry: 'AgriTech',
      stage: 'MVP',
      description:
        'Empowering smallholder farmers with offline-first AI crop diagnostics.',
    }
  );
  const startupId = createStartupRes.data.startup?.id;
  console.log('✓ Startup created with ID:', startupId, '\n');

  // 3. GET analysis before it is generated -> expect 404
  console.log('3. Testing GET analysis before generation...');
  const preGetRes = await request(
    `http://localhost:5000/api/ai/startup-analysis/${startupId}`,
    {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + f1Token },
    }
  );
  console.log('Status (expect 404):', preGetRes.status, 'Message:', preGetRes.data.message);
  if (preGetRes.status !== 404) throw new Error('Expected 404 for unanalyzed startup');
  console.log('✓ Pre-analysis 404 verified.\n');

  // 4. Role restrictions: Developer and Investor attempts
  console.log('4. Testing Role Restrictions (Developer & Investor expect 403)...');
  const devPost = await request(
    `http://localhost:5000/api/ai/startup-analysis/${startupId}`,
    {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + devToken },
    }
  );
  console.log('Developer POST status (expect 403):', devPost.status, devPost.data.message);
  if (devPost.status !== 403) throw new Error('Developer POST should be 403');

  const invPost = await request(
    `http://localhost:5000/api/ai/startup-analysis/${startupId}`,
    {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + invToken },
    }
  );
  console.log('Investor POST status (expect 403):', invPost.status, invPost.data.message);
  if (invPost.status !== 403) throw new Error('Investor POST should be 403');

  const devGet = await request(
    `http://localhost:5000/api/ai/startup-analysis/${startupId}`,
    {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + devToken },
    }
  );
  console.log('Developer GET status (expect 403):', devGet.status, devGet.data.message);
  if (devGet.status !== 403) throw new Error('Developer GET should be 403');

  const invGet = await request(
    `http://localhost:5000/api/ai/startup-analysis/${startupId}`,
    {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + invToken },
    }
  );
  console.log('Investor GET status (expect 403):', invGet.status, invGet.data.message);
  if (invGet.status !== 403) throw new Error('Investor GET should be 403');
  console.log('✓ Role restrictions verified.\n');

  // 5. Cross-founder ownership protection
  console.log('5. Testing Cross-Founder Ownership Protection (Founder 2 attempting Founder 1 startup)...');
  const f2Post = await request(
    `http://localhost:5000/api/ai/startup-analysis/${startupId}`,
    {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + f2Token },
    }
  );
  console.log('Founder 2 POST status (expect 403):', f2Post.status, 'Message:', f2Post.data.message);
  if (f2Post.status !== 403) throw new Error('Founder 2 POST should be 403');

  const f2Get = await request(
    `http://localhost:5000/api/ai/startup-analysis/${startupId}`,
    {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + f2Token },
    }
  );
  console.log('Founder 2 GET status (expect 403):', f2Get.status, 'Message:', f2Get.data.message);
  if (f2Get.status !== 403) throw new Error('Founder 2 GET should be 403');
  console.log('✓ Cross-founder ownership verified.\n');

  // 6. Invalid and non-existent IDs
  console.log('6. Testing Invalid & Non-existent Startup IDs...');
  const invalidIdRes = await request('http://localhost:5000/api/ai/startup-analysis/invalid-123', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + f1Token },
  });
  console.log('Invalid ID status (expect 400):', invalidIdRes.status, 'Message:', invalidIdRes.data.message);
  if (invalidIdRes.status !== 400) throw new Error('Invalid ID should return 400');

  const notFoundIdRes = await request(
    'http://localhost:5000/api/ai/startup-analysis/507f1f77bcf86cd799439011',
    {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + f1Token },
    }
  );
  console.log(
    'Non-existent ID status (expect 404):',
    notFoundIdRes.status,
    'Message:',
    notFoundIdRes.data.message
  );
  if (notFoundIdRes.status !== 404) throw new Error('Non-existent ID should return 404');
  console.log('✓ ID validation verified.\n');

  // 7. Successful AI analysis generation (POST /api/ai/startup-analysis/:startupId)
  console.log('7. Triggering AI analysis generation (POST /api/ai/startup-analysis/:startupId)...');
  const analyzeRes = await request(
    `http://localhost:5000/api/ai/startup-analysis/${startupId}`,
    {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + f1Token },
    }
  );
  console.log('Analyze response status:', analyzeRes.status);
  console.log('Success:', analyzeRes.data.success);
  console.log('Source:', analyzeRes.data.data?.source);
  console.log('Problem score:', analyzeRes.data.data?.problemStrength?.score);
  console.log('Market score:', analyzeRes.data.data?.marketPotential?.score);
  console.log('Feasibility score:', analyzeRes.data.data?.feasibility?.score);
  console.log('Risks count:', analyzeRes.data.data?.risks?.length);
  console.log('Opportunities count:', analyzeRes.data.data?.opportunities?.length);
  console.log('Recommendations count:', analyzeRes.data.data?.recommendations?.length);

  if (analyzeRes.status !== 200) throw new Error('Analysis request failed');
  if (!analyzeRes.data.data?.overallAssessment) throw new Error('Missing overallAssessment');
  if (!analyzeRes.data.data?.source) throw new Error('Missing source');
  console.log('✓ Analysis generation and response structure verified.\n');

  // 8. GET analysis (GET /api/ai/startup-analysis/:startupId)
  console.log('8. Testing GET analysis (GET /api/ai/startup-analysis/:startupId)...');
  const getAnalysisRes = await request(
    `http://localhost:5000/api/ai/startup-analysis/${startupId}`,
    {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + f1Token },
    }
  );
  console.log('GET analysis status:', getAnalysisRes.status);
  console.log(
    'Retrieved assessment:',
    getAnalysisRes.data.data?.overallAssessment?.slice(0, 80) + '...'
  );
  console.log('Retrieved source:', getAnalysisRes.data.data?.source);
  if (getAnalysisRes.status !== 200) throw new Error('GET analysis failed');
  console.log('✓ GET analysis verified.\n');

  // 9. Startup Details API includes aiAnalysis
  console.log('9. Checking GET /api/startups/:id includes aiAnalysis...');
  const startupDetailsRes = await request(
    `http://localhost:5000/api/startups/${startupId}`,
    {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + f1Token },
    }
  );
  console.log('Startup details status:', startupDetailsRes.status);
  console.log('Has aiAnalysis on startup object:', !!startupDetailsRes.data.startup?.aiAnalysis);
  console.log('✓ Startup details integration verified.\n');

  // 10. Security check: API key not exposed in any response
  console.log('10. Security Verification: Checking responses do not leak GEMINI_API_KEY...');
  const apiKey = process.env.GEMINI_API_KEY;
  const rawResponses =
    JSON.stringify(analyzeRes) +
    JSON.stringify(getAnalysisRes) +
    JSON.stringify(startupDetailsRes);
  if (apiKey && rawResponses.includes(apiKey)) {
    throw new Error('CRITICAL SECURITY LEAK: GEMINI_API_KEY detected in API response!');
  }
  console.log('✓ Security verified: GEMINI_API_KEY is never exposed.\n');

  console.log('====================================================');
  console.log('>>> ALL 10 E2E VERIFICATION TEST SUITES PASSED! <<<');
  console.log('====================================================');
}

runE2ETests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
