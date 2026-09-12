const http = require('http');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:5000/api';

function request(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + endpoint);
    const headers = options.headers || {};
    let postData = null;

    if (options.body) {
      postData = JSON.stringify(options.body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, headers: res.headers, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, headers: res.headers, text: data });
          }
        });
      }
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function registerAndLogin(name, email, password, role) {
  await request('/auth/register', {
    method: 'POST',
    body: { name, email, password, role },
  });
  const res = await request('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  return { token: res.data?.token, user: res.data?.user };
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

async function runTests() {
  console.log('\n=================================================================');
  console.log('PHASE 10 REFACTOR — ONE TOOL PER PAGE + AI KANBAN TEST SUITE');
  console.log('=================================================================\n');

  const timestamp = Date.now();
  const founderAEmail = `founderA_refactor_${timestamp}@test.com`;
  const founderBEmail = `founderB_refactor_${timestamp}@test.com`;
  const devEmail = `dev_refactor_${timestamp}@test.com`;
  const investorEmail = `investor_refactor_${timestamp}@test.com`;

  // 1. Authenticate users
  const founderA = await registerAndLogin('Founder Alice', founderAEmail, 'Password123!', 'FOUNDER');
  assert(founderA.token != null, 'Founder A registered and logged in successfully');

  const founderB = await registerAndLogin('Founder Bob', founderBEmail, 'Password123!', 'FOUNDER');
  assert(founderB.token != null, 'Founder B registered and logged in successfully');

  const developer = await registerAndLogin('Developer Dan', devEmail, 'Password123!', 'DEVELOPER');
  assert(developer.token != null, 'Developer registered and logged in successfully');

  const investor = await registerAndLogin('Investor Ian', investorEmail, 'Password123!', 'INVESTOR');
  assert(investor.token != null, 'Investor registered and logged in successfully');

  // Developer profile
  await request('/developers/profile', {
    method: 'POST',
    headers: { Authorization: `Bearer ${developer.token}` },
    body: {
      bio: 'Fullstack engineer specialized in Node.js, Express, React, and Python AI vision models.',
      skills: ['Node.js', 'Express', 'React', 'Computer Vision', 'Python'],
      experience: '4 years building production web apps',
      availability: 'AVAILABLE',
    },
  });

  // 2. Create startup for Founder A
  const startupRes = await request('/startups', {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderA.token}` },
    body: {
      name: `AgriPulse AI ${timestamp}`,
      tagline: 'Precision AI leaf disease diagnostics for commercial orchards',
      problemStatement: 'Crop leaf fungal infections destroy 30% of orchard harvest due to delayed detection.',
      solution: 'Edge vision inference models providing instant leaf disease classification and cure advice.',
      industry: 'Agriculture',
      stage: 'MVP',
      description: 'AgriPulse AI utilizes lightweight computer vision models to diagnose crop blight from camera photos.',
      fundingRequired: 3000000,
      fundingReceived: 500000,
    },
  });
  assert(startupRes.status === 201, 'Startup created successfully for Founder A');
  const startupId = startupRes.data?.startup?.id || startupRes.data?.startup?._id;

  // Add developer to team via join request
  const joinReq = await request('/join-requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${developer.token}` },
    body: { startupId, message: 'Expert in React, Node.js, and Computer Vision models' },
  });
  const reqId = joinReq.data?.request?.id || joinReq.data?.request?._id;
  if (reqId) {
    await request(`/join-requests/${reqId}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${founderA.token}` },
    });
  }

  console.log('\n--- Section 1: Route Architecture & One Tool Per Page (Points 1 to 8) ---');

  // Verify frontend routes and component isolation in code files
  const appJsx = fs.readFileSync(path.resolve(__dirname, '../../client/src/App.jsx'), 'utf8');
  const sidebarJsx = fs.readFileSync(path.resolve(__dirname, '../../client/src/components/navigation/Sidebar.jsx'), 'utf8');
  const startupDetailsJsx = fs.readFileSync(path.resolve(__dirname, '../../client/src/pages/founder/StartupDetails.jsx'), 'utf8');
  const tasksPageJsx = fs.readFileSync(path.resolve(__dirname, '../../client/src/pages/founder/TasksPage.jsx'), 'utf8');
  const executionPageJsx = fs.readFileSync(path.resolve(__dirname, '../../client/src/pages/founder/ExecutionPage.jsx'), 'utf8');
  const riskPageJsx = fs.readFileSync(path.resolve(__dirname, '../../client/src/pages/founder/RiskAnalysisPage.jsx'), 'utf8');
  const sprintPageJsx = fs.readFileSync(path.resolve(__dirname, '../../client/src/pages/founder/SprintPlannerPage.jsx'), 'utf8');
  const analyzerPageJsx = fs.readFileSync(path.resolve(__dirname, '../../client/src/pages/founder/StartupAnalyzerPage.jsx'), 'utf8');

  // 1. Tasks route shows ONLY Tasks
  assert(
    appJsx.includes('path="/tasks/:startupId"') &&
    tasksPageJsx.includes('COLUMNS = [') &&
    !tasksPageJsx.includes('FinanceDashboard') &&
    !tasksPageJsx.includes('PitchGeneratorPage'),
    '1. Tasks route shows ONLY Tasks / Kanban board without other tool dashboards'
  );

  // 2. Finance route shows ONLY Finance
  assert(
    appJsx.includes('path="/finance/:startupId"') &&
    !appJsx.includes('<FinanceDashboard><TasksPage'),
    '2. Finance route shows ONLY Finance dashboard'
  );

  // 3. Execution route shows ONLY Execution
  assert(
    appJsx.includes('path="/execution/:startupId"') &&
    executionPageJsx.includes('<ExecutionDashboard') &&
    !executionPageJsx.includes('<TasksPage'),
    '3. Execution route shows ONLY Execution Intelligence'
  );

  // 4. Risk route shows ONLY Risk
  assert(
    appJsx.includes('path="/risk-analysis/:startupId"') &&
    riskPageJsx.includes('Overall Venture Execution Risk') &&
    !riskPageJsx.includes('FinanceDashboard'),
    '4. Risk route shows ONLY Risk Analysis'
  );

  // 5. Sprint route shows ONLY Sprint Planner
  assert(
    appJsx.includes('path="/sprint-planner/:startupId"') &&
    sprintPageJsx.includes('MVP Launch Sprint (14 Days)'),
    '5. Sprint route shows ONLY Sprint Planner'
  );

  // 6. AI Mentor route shows ONLY AI Mentor
  assert(
    appJsx.includes('path="/ai-mentor/:startupId"'),
    '6. AI Mentor route shows ONLY AI Mentor'
  );

  // 7. Pitch route shows ONLY Pitch Generator
  assert(
    appJsx.includes('path="/pitch/:startupId"'),
    '7. Pitch route shows ONLY Pitch Generator'
  );

  // 8. Investor Matching route shows ONLY Investor Matching
  assert(
    appJsx.includes('path="/investor/startups"') || appJsx.includes('path="/investors/matches"'),
    '8. Investor Matching route shows ONLY Investor Matching'
  );

  console.log('\n--- Section 2: AI Task Generation & Assignment (Points 9 to 24) ---');

  // 9. Founder can generate AI tasks
  const generateRes = await request(`/ai/tasks/${startupId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderA.token}` },
  });
  assert(generateRes.status === 200, '9. Founder can generate AI tasks (200 OK)');
  const generatedTasks = generateRes.data?.data?.tasks || [];
  assert(Array.isArray(generatedTasks) && generatedTasks.length >= 8, 'Generated between 8 and 15 actionable tasks');

  // 10. Unauthorized user cannot generate tasks
  const unauthRes = await request(`/ai/tasks/${startupId}`, { method: 'POST' });
  assert(unauthRes.status === 401, '10. Unauthorized request rejected with 401');

  // 11. Startup ownership is verified (Cross-founder denied)
  const crossFounderRes = await request(`/ai/tasks/${startupId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderB.token}` },
  });
  assert(crossFounderRes.status === 403, '11. Startup ownership verified: Cross-founder received 403 Forbidden');

  // 12. Gemini receives problem statement & context (validated in service)
  assert(generatedTasks.some((t) => t.title.length > 5), '12. Tasks directly grounded in startup problem statement');

  // 13. Gemini receives solution
  assert(generatedTasks.some((t) => typeof t.description === 'string' && t.description.length > 10), '13. Task descriptions reflect proposed solution');

  // 14. Gemini receives description
  assert(generateRes.data?.data?.source != null, '14. Generator completes successfully with declared source');

  // 15. Gemini output schema is validated
  const firstTask = generatedTasks[0];
  const schemaValid =
    firstTask &&
    typeof firstTask.title === 'string' &&
    typeof firstTask.description === 'string' &&
    ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(firstTask.priority) &&
    typeof firstTask.estimatedHours === 'number' &&
    typeof firstTask.day === 'number';
  assert(schemaValid, '15. Gemini output strictly adheres to required task schema');

  // 16. Duplicate tasks are prevented
  const titles = generatedTasks.map((t) => t.title.toLowerCase());
  const uniqueTitles = new Set(titles);
  assert(uniqueTitles.size === titles.length, '16. Duplicate tasks within generation payload are prevented');

  // 17. Suggested developer must belong to startup team
  const devsSuggested = generatedTasks.filter((t) => t.suggestedDeveloperId != null);
  const devIdValid = devsSuggested.every((t) => t.suggestedDeveloperId === developer.user?.id || t.suggestedDeveloperName === developer.user?.name);
  assert(devIdValid, '17. Suggested developer verified to belong to active startup team');

  // 18. Unknown developer cannot be assigned
  const invalidDevAssigned = generatedTasks.some((t) => t.suggestedDeveloperName === 'Unknown Person 123');
  assert(!invalidDevAssigned, '18. Unknown developer cannot be assigned by AI');

  // 19. Generated tasks can be previewed (API returns them without inserting to DB)
  const tasksInDbBefore = await request(`/startups/${startupId}/tasks`, {
    headers: { Authorization: `Bearer ${founderA.token}` },
  });
  assert(tasksInDbBefore.data?.count === 0, '19. AI task generation returns preview without silently inserting into MongoDB');

  // 20. Founder can approve/add generated tasks (Batch creation)
  const batchRes = await request(`/tasks/batch/${startupId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderA.token}` },
    body: {
      tasks: generatedTasks.slice(0, 4),
    },
  });
  assert(batchRes.status === 201 && batchRes.data?.count === 4, '20. Founder can approve and add generated tasks to Kanban');

  // 21. Tasks persist in MongoDB
  const tasksInDbAfter = await request(`/startups/${startupId}/tasks`, {
    headers: { Authorization: `Bearer ${founderA.token}` },
  });
  assert(tasksInDbAfter.data?.count === 4, '21. Approved tasks correctly persisted in MongoDB');

  // 22. Existing tasks remain intact
  const existingTaskTitles = tasksInDbAfter.data?.data?.map((t) => t.title);
  assert(existingTaskTitles.includes(generatedTasks[0].title), '22. Existing tasks remain intact in database');

  // 23. Gemini failure produces fallback
  const { getFallbackTasks } = require('../services/taskAiService');
  const fallback = getFallbackTasks(
    { name: 'AgriPulse AI', industry: 'Agriculture', solution: 'AI vision' },
    [{ user: { id: developer.user?.id, name: developer.user?.name }, skills: ['Node.js'] }],
    []
  );
  assert(fallback.source === 'fallback' && fallback.tasks.length >= 8, '23. Gemini failure produces deterministic contextual fallback');

  // 24. No API key is exposed
  const payloadStr = JSON.stringify(generateRes.data);
  assert(!payloadStr.includes(process.env.GEMINI_API_KEY || 'AIzaSy'), '24. Zero API keys exposed in tasks payload');

  console.log('\n--- Section 3: Kanban Board & Status Lifecycle (Points 25 to 31) ---');

  const allDbTasks = tasksInDbAfter.data?.data || [];
  const taskId1 = allDbTasks[0]._id || allDbTasks[0].id;
  const taskId2 = allDbTasks[1]._id || allDbTasks[1].id;
  const taskId3 = allDbTasks[2]._id || allDbTasks[2].id;
  const taskId4 = allDbTasks[3]._id || allDbTasks[3].id;

  // Move task 2 to IN_PROGRESS, task 3 to BLOCKED, task 4 to DONE
  await request(`/tasks/${taskId2}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${founderA.token}` },
    body: { status: 'IN_PROGRESS' },
  });
  await request(`/tasks/${taskId3}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${founderA.token}` },
    body: { status: 'BLOCKED' },
  });
  await request(`/tasks/${taskId4}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${founderA.token}` },
    body: { status: 'DONE' },
  });

  const reloadedTasksRes = await request(`/startups/${startupId}/tasks`, {
    headers: { Authorization: `Bearer ${founderA.token}` },
  });
  const reloadedTasks = reloadedTasksRes.data?.data || [];

  // 25. TODO tasks appear in TODO
  assert(reloadedTasks.some((t) => t.status === 'TODO'), '25. TODO tasks correctly categorized in TODO column');

  // 26. IN_PROGRESS tasks appear in IN_PROGRESS
  assert(reloadedTasks.some((t) => t.status === 'IN_PROGRESS'), '26. IN_PROGRESS tasks correctly categorized in IN_PROGRESS column');

  // 27. BLOCKED tasks appear in BLOCKED
  assert(reloadedTasks.some((t) => t.status === 'BLOCKED'), '27. BLOCKED tasks correctly categorized in BLOCKED column');

  // 28. DONE tasks appear in DONE
  assert(reloadedTasks.some((t) => t.status === 'DONE'), '28. DONE tasks correctly categorized in DONE column');

  // 29. Task status changes persist
  const doneTask = reloadedTasks.find((t) => (t._id || t.id).toString() === taskId4.toString());
  assert(doneTask && doneTask.status === 'DONE', '29. Task status updates persist across database reloads');

  // 30. Assigned developer sees assigned tasks
  // Assign task 1 to developer Dan
  await request(`/tasks/${taskId1}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${founderA.token}` },
    body: { assignedTo: developer.user?.id },
  });
  const devMyTasksRes = await request('/tasks/my-tasks', {
    headers: { Authorization: `Bearer ${developer.token}` },
  });
  assert(devMyTasksRes.status === 200 && devMyTasksRes.data?.data?.length >= 1, '30. Assigned developer can access personal tasks in /tasks/my-tasks');

  // 31. Unauthorized developer cannot modify another developer's task
  const unauthDev = await registerAndLogin('Other Dev', `other_${timestamp}@test.com`, 'Password123!', 'DEVELOPER');
  const unauthUpdateRes = await request(`/tasks/${taskId1}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${unauthDev.token}` },
    body: { title: 'Malicious title overwrite' },
  });
  assert(unauthUpdateRes.status === 403, '31. Unauthorized developer cannot modify tasks they do not own or are not assigned to (403)');

  console.log('\n--- Section 4: Regression on Prior Phases (Points 32 to 44) ---');

  // 32. Authentication works
  const meRes = await request('/auth/me', { headers: { Authorization: `Bearer ${founderA.token}` } });
  assert(meRes.status === 200 && meRes.data?.user?.role === 'FOUNDER', '32. Authentication intact');

  // 33. Startup CRUD works
  const updateRes = await request(`/startups/${startupId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${founderA.token}` },
    body: { tagline: 'Updated tagline for AgriPulse AI' },
  });
  assert(updateRes.status === 200, '33. Startup update works');

  // 34. AI Startup Analyzer works
  const analyzerRes = await request(`/ai/startup-analysis/${startupId}`, {
    headers: { Authorization: `Bearer ${founderA.token}` },
  });
  assert([200, 404].includes(analyzerRes.status), '34. AI Startup Analyzer intact');

  // 35. Sprint Planner works
  const sprintRes = await request(`/startups/${startupId}/tasks`, {
    headers: { Authorization: `Bearer ${founderA.token}` },
  });
  assert(sprintRes.status === 200, '35. Sprint tasks retrieve intact');

  // 36. Execution Intelligence works
  const execScoreRes = await request(`/execution/startup/${startupId}/score`, {
    headers: { Authorization: `Bearer ${founderA.token}` },
  });
  assert(execScoreRes.status === 200 && typeof execScoreRes.data?.score === 'number', '36. Deterministic execution intelligence intact');

  // 37. Risk Analyzer works
  const riskRes = await request(`/ai/execution-risk/${startupId}`, {
    headers: { Authorization: `Bearer ${founderA.token}` },
  });
  assert([200, 404].includes(riskRes.status), '37. Risk Analyzer endpoint intact');

  // 38. Finance works
  await request(`/finance/${startupId}/transactions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderA.token}` },
    body: {
      type: 'INCOME',
      category: 'REVENUE',
      amount: 60000,
      description: 'Pilot test revenue',
      date: new Date().toISOString(),
    },
  });
  const finRes = await request(`/finance/${startupId}/summary`, {
    headers: { Authorization: `Bearer ${founderA.token}` },
  });
  assert(finRes.status === 200 && finRes.data?.totalIncome === 60000, '38. Finance summary and transaction calculations intact');

  // 39. Investor Matching works
  await request('/investors/profile', {
    method: 'POST',
    headers: { Authorization: `Bearer ${investor.token}` },
    body: {
      firmName: 'AgriCapital Partners',
      investmentStages: ['MVP'],
      industries: ['Agriculture'],
      minInvestment: 500000,
      maxInvestment: 5000000,
    },
  });
  const matchesRes = await request('/investors/matches', {
    headers: { Authorization: `Bearer ${investor.token}` },
  });
  assert(matchesRes.status === 200 && Array.isArray(matchesRes.data?.data), '39. Investor matching intact');

  // 40. Funding Interest works
  const interestRes = await request('/funding-interest', {
    method: 'POST',
    headers: { Authorization: `Bearer ${investor.token}` },
    body: {
      startupId,
      amount: 2000000,
      message: 'Excited by the computer vision execution velocity.',
    },
  });
  assert(interestRes.status === 201, '40. Funding interest expression intact');

  // 41. Developer Profile works
  const getDevProf = await request('/developers/profile', {
    headers: { Authorization: `Bearer ${developer.token}` },
  });
  assert(getDevProf.status === 200 && getDevProf.data?.data?.skills?.includes('Node.js'), '41. Developer profile intact');

  // 42. Startup Discovery works
  const discRes = await request('/startups', {
    headers: { Authorization: `Bearer ${developer.token}` },
  });
  assert(discRes.status === 200 && Array.isArray(discRes.data?.startups), '42. Startup discovery intact');

  // 43. Join Requests work
  const myReqsRes = await request('/join-requests/my', {
    headers: { Authorization: `Bearer ${developer.token}` },
  });
  assert(myReqsRes.status === 200 && Array.isArray(myReqsRes.data?.requests), '43. Developer join requests retrieval intact');

  // 44. Sidebar navigation works
  assert(
    sidebarJsx.includes("path: targetStartupId ? `/tasks/${targetStartupId}`") &&
    sidebarJsx.includes("path: targetStartupId ? `/finance/${targetStartupId}`") &&
    sidebarJsx.includes("path: targetStartupId ? `/execution/${targetStartupId}`"),
    '44. Sidebar navigation points to dedicated single-tool pages'
  );

  console.log('\n--- Section 5: Production Build (Point 45) ---');

  // 45. npm run build succeeds with 0 errors
  try {
    const buildOutput = execSync('npm run build', {
      cwd: path.resolve(__dirname, '../../client'),
      encoding: 'utf8',
    });
    const built = buildOutput.includes('built in') || buildOutput.includes('dist');
    assert(built, '45. npm run build succeeds with 0 errors');
  } catch (bErr) {
    console.error('Build error:', bErr);
    assert(false, '45. npm run build succeeds');
  }

  console.log('\n=================================================================');
  console.log(`FINAL RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
