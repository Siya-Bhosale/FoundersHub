const http = require('http');
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const BASE_URL = 'http://localhost:5000/api';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('STARTUP ACCESS & ROLE-BASED CHAT ISOLATION SECURITY TEST MATRIX');
  console.log('================================================================\n');

  await connectDB();
  const TeamMembership = require('../models/TeamMembership');
  const Department = require('../models/Department');
  const Chat = require('../models/Chat');
  const Startup = require('../models/Startup');

  const stamp = Date.now();

  async function registerAndLogin(name, email, password, role) {
    const regRes = await request('POST', '/auth/register', { name, email, password, role });
    if (regRes.status !== 201) throw new Error(`Register failed: ${JSON.stringify(regRes.data)}`);
    const loginRes = await request('POST', '/auth/login', { email, password });
    if (loginRes.status !== 200 || !loginRes.data?.token) {
      throw new Error(`Login failed: ${JSON.stringify(loginRes.data)}`);
    }
    return {
      name,
      token: loginRes.data.token,
      userId: loginRes.data.user.id || loginRes.data.user._id,
    };
  }

  // ==========================================
  // SETUP: Founders, Developers, Startups
  // ==========================================
  console.log('0. Creating test actors...');
  const founderA = await registerAndLogin('Founder Alice', `alice_${stamp}@matrix.io`, 'pass123', 'FOUNDER');
  const founderB = await registerAndLogin('Founder Bob', `bob_${stamp}@matrix.io`, 'pass123', 'FOUNDER');
  const devA = await registerAndLogin('Developer Raj', `raj_${stamp}@matrix.io`, 'pass123', 'DEVELOPER');
  const devB = await registerAndLogin('Developer Sarah', `sarah_${stamp}@matrix.io`, 'pass123', 'DEVELOPER');

  console.log('   Creating Startup A (Alice), Startup B (Bob)...');
  const sResA = await request('POST', '/startups', {
    name: `AlphaTech ${stamp}`,
    tagline: 'Alpha AI Workflows',
    description: 'Autonomous multi-agent cloud execution',
    problemStatement: 'Inefficient agent pipeline orchestration.',
    solution: 'Distributed neural consensus graph.',
    industry: 'FINTECH',
    stage: 'MVP',
    fundingRequired: 1000000,
  }, founderA.token);
  const startupAId = sResA.data?.startup?._id || sResA.data?.startup?.id;

  const sResB = await request('POST', '/startups', {
    name: `BetaHealth ${stamp}`,
    tagline: 'Beta Health AI',
    description: 'Clinical automation workflows',
    problemStatement: 'Manual clinical trials scheduling.',
    solution: 'Federated clinical scheduling agent.',
    industry: 'HEALTHCARE',
    stage: 'MVP',
    fundingRequired: 2000000,
  }, founderB.token);
  const startupBId = sResB.data?.startup?._id || sResB.data?.startup?.id;

  // Retrieve departments for Startup A
  const deptsARes = await request('GET', `/departments/startup/${startupAId}`, null, founderA.token);
  const deptsA = deptsARes.data?.departments || [];
  const opsA = deptsA.find(d => d.name.toLowerCase() === 'operations');
  const devA_dept = deptsA.find(d => d.name.toLowerCase() === 'development');
  const mktgA = deptsA.find(d => d.name.toLowerCase() === 'marketing');

  if (!opsA || !devA_dept || !mktgA) {
    throw new Error('Default departments for Startup A not properly seeded');
  }
  const opsAId = opsA._id || opsA.id;
  const devDeptAId = devA_dept._id || devA_dept.id;
  const mktgAId = mktgA._id || mktgA.id;

  // Retrieve departments for Startup B
  const deptsBRes = await request('GET', `/departments/startup/${startupBId}`, null, founderB.token);
  const deptsB = deptsBRes.data?.departments || [];
  const devDeptB = deptsB.find(d => d.name.toLowerCase() === 'development');
  const devDeptBId = devDeptB._id || devDeptB.id;

  // Add Developer Raj to Startup A -> Operations
  await TeamMembership.create({
    startup: startupAId,
    user: devA.userId,
    department: opsAId,
    departmentRole: 'Operations Lead',
    status: 'ACTIVE',
  });

  // Add Developer Sarah to Startup A -> Development
  await TeamMembership.create({
    startup: startupAId,
    user: devB.userId,
    department: devDeptAId,
    departmentRole: 'Backend Engineer',
    status: 'ACTIVE',
  });

  console.log('   Actors and memberships initialized.\n');

  // ==========================================
  // CASE 1: Founder A logs in
  // ==========================================
  console.log('CASE 1: Founder A logs in -> Founder A startups visible, Founder B startups invisible');
  const founderAMyStartups = await request('GET', '/startups/my', null, founderA.token);
  if (founderAMyStartups.status !== 200) throw new Error(`Founder A GET /startups/my failed: ${founderAMyStartups.status}`);
  const aList = founderAMyStartups.data.startups || [];
  const aHasA = aList.some(s => (s._id || s.id) === startupAId);
  const aHasB = aList.some(s => (s._id || s.id) === startupBId);
  if (!aHasA || aHasB) {
    throw new Error(`Founder A startup list failed! Has A: ${aHasA}, Has B: ${aHasB}`);
  }
  console.log('   ✓ Founder A sees owned Startup A and does NOT see Founder B\'s Startup B.');

  // ==========================================
  // CASE 2: Developer A logs in
  // ==========================================
  console.log('\nCASE 2: Developer A logs in -> Active joined startups visible, other startups invisible');
  const devAMyStartups = await request('GET', '/startups/my', null, devA.token);
  if (devAMyStartups.status !== 200) throw new Error(`Dev A GET /startups/my failed: ${devAMyStartups.status}`);
  const devAList = devAMyStartups.data.startups || [];
  const devAHasA = devAList.some(s => (s._id || s.id) === startupAId);
  const devAHasB = devAList.some(s => (s._id || s.id) === startupBId);
  if (!devAHasA || devAHasB) {
    throw new Error(`Dev A startup list failed! Has A: ${devAHasA}, Has B: ${devAHasB}`);
  }
  const membershipInfo = devAMyStartups.data.memberships?.[startupAId];
  if (!membershipInfo || membershipInfo.departmentName?.toLowerCase() !== 'operations') {
    throw new Error(`Dev A membership info missing or department not Operations: ${JSON.stringify(membershipInfo)}`);
  }
  console.log('   ✓ Dev A sees joined Startup A with Operations department, and does NOT see unjoined Startup B.');

  // ==========================================
  // CASE 3: Developer A opens joined Startup A
  // ==========================================
  console.log('\nCASE 3: Developer A opens joined Startup A (200 OK)');
  const devAOpenA = await request('GET', `/startups/${startupAId}`, null, devA.token);
  if (devAOpenA.status !== 200) {
    throw new Error(`Expected 200 OK opening joined startup A, got ${devAOpenA.status}`);
  }
  console.log('   ✓ Developer A successfully opened joined Startup A (200 OK).');

  // Developer A accesses department-filtered tasks for Startup A
  const devATasks = await request('GET', `/tasks/startup/${startupAId}?view=all`, null, devA.token);
  if (devATasks.status !== 200) {
    throw new Error(`Expected 200 OK accessing Startup A tasks, got ${devATasks.status}`);
  }
  console.log('   ✓ Developer A successfully accessed Startup A workspace tasks (200 OK).');

  // ==========================================
  // CASE 4: Developer A opens Startup B where NOT a member
  // ==========================================
  console.log('\nCASE 4: Developer A attempts restricted access / tasks on Startup B (403 Forbidden)');
  const devATryBTasks = await request('GET', `/tasks/startup/${startupBId}?view=all`, null, devA.token);
  if (devATryBTasks.status !== 403) {
    throw new Error(`Expected 403 Forbidden for Dev A accessing Startup B tasks, got ${devATryBTasks.status}`);
  }
  console.log('   ✓ Developer A forbidden from unjoined Startup B tasks (403 Forbidden).');

  // Developer A tries founder-only action: PUT /api/startups/:startupAId
  const devATryUpdate = await request('PUT', `/startups/${startupAId}`, { name: 'Hacked Startup' }, devA.token);
  if (devATryUpdate.status === 403) {
    console.log('   ✓ Developer A attempting to edit startup is strictly 403 Forbidden (Founder only).');
  } else {
    throw new Error(`Expected 403 for Dev editing startup, got ${devATryUpdate.status}`);
  }

  // ==========================================
  // CASE 5: Developer A (Operations) Chat Listing
  // ==========================================
  console.log('\nCASE 5: Developer A in Operations -> GET /api/chats/my returns ONLY Operations Chat');
  const devAChatsRes = await request('GET', '/chats/my', null, devA.token);
  if (devAChatsRes.status !== 200) throw new Error(`GET /chats/my failed: ${devAChatsRes.status}`);
  const devAChats = devAChatsRes.data.chats || [];
  console.log(`   Dev A received ${devAChats.length} chat(s)`);
  if (devAChats.length !== 1) {
    throw new Error(`Expected exactly 1 chat for Dev A, got ${devAChats.length}: ${JSON.stringify(devAChats.map(c => c.name))}`);
  }
  const chatA = devAChats[0];
  if (!chatA.name.toLowerCase().includes('operations')) {
    throw new Error(`Expected Operations chat for Dev A, got: ${chatA.name}`);
  }
  console.log(`   ✓ Dev A sees: "${chatA.name}". Development Chat and Marketing Chat are completely invisible.`);

  // Find IDs of all three chats
  const allChatsStartupA = await Chat.find({ startup: startupAId });
  const opsChat = allChatsStartupA.find(c => c.department.toString() === opsAId.toString());
  const devChat = allChatsStartupA.find(c => c.department.toString() === devDeptAId.toString());
  const mktgChat = allChatsStartupA.find(c => c.department.toString() === mktgAId.toString());

  if (!opsChat || !devChat || !mktgChat) {
    throw new Error('Could not find all three department chats in DB for Startup A');
  }
  const opsChatId = opsChat._id.toString();
  const devChatId = devChat._id.toString();

  // ==========================================
  // CASE 6: Developer A manually requests Development Chat API
  // ==========================================
  console.log('\nCASE 6: Developer A manually requests Development Chat API -> 403 Forbidden');
  const devATryDevChat = await request('GET', `/chats/${devChatId}/messages`, null, devA.token);
  if (devATryDevChat.status === 403) {
    console.log('   ✓ Dev A manual GET to Development Chat messages rejected with 403 Forbidden.');
  } else {
    throw new Error(`Expected 403 Forbidden, got ${devATryDevChat.status}`);
  }

  // ==========================================
  // CASE 7: Developer A manually requests Operations Chat API
  // ==========================================
  console.log('\nCASE 7: Developer A manually requests Operations Chat API -> 200 OK');
  const devAOpsChatRes = await request('GET', `/chats/${opsChatId}/messages`, null, devA.token);
  if (devAOpsChatRes.status === 200) {
    console.log('   ✓ Dev A manual GET to Operations Chat messages authorized (200 OK).');
  } else {
    throw new Error(`Expected 200 OK, got ${devAOpsChatRes.status}`);
  }

  // ==========================================
  // CASE 8: Message Sending & Department Isolation
  // ==========================================
  console.log('\nCASE 8: Message Posting & Isolation');
  const postMsgRes = await request('POST', `/chats/${opsChatId}/messages`, {
    message: 'Operations pipeline update for sprint 1.'
  }, devA.token);
  if (postMsgRes.status !== 201) throw new Error(`Post message failed: ${postMsgRes.status}`);
  console.log('   ✓ Dev A posted message to Operations Chat.');

  // Dev B (Sarah in Development) must NOT receive it
  const devBReadOpsChat = await request('GET', `/chats/${opsChatId}/messages`, null, devB.token);
  if (devBReadOpsChat.status === 403) {
    console.log('   ✓ Dev B (Development) is forbidden from reading Operations Chat (403 Forbidden).');
  } else {
    throw new Error(`Expected 403 for Dev B reading Operations Chat, got ${devBReadOpsChat.status}`);
  }

  // ==========================================
  // CASE 9: Multiple Startups for Developer A
  // ==========================================
  console.log('\nCASE 9: Developer A belongs to Startup A -> Operations AND Startup B -> Development');
  // Add Developer A to Startup B Development department
  await TeamMembership.create({
    startup: startupBId,
    user: devA.userId,
    department: devDeptBId,
    departmentRole: 'Full Stack Engineer',
    status: 'ACTIVE',
  });

  // Check GET /api/startups/my for Dev A
  const devAMultiStartups = await request('GET', '/startups/my', null, devA.token);
  if (devAMultiStartups.status !== 200) throw new Error(`Failed to get multi startups: ${devAMultiStartups.status}`);
  const multiList = devAMultiStartups.data.startups || [];
  if (multiList.length !== 2) {
    throw new Error(`Expected 2 startups for Dev A, got ${multiList.length}`);
  }
  const multiMemberships = devAMultiStartups.data.memberships || {};
  console.log(`   ✓ Dev A now belongs to 2 startups:`);
  console.log(`     - ${multiList[0].name}: ${multiMemberships[multiList[0]._id]?.departmentName}`);
  console.log(`     - ${multiList[1].name}: ${multiMemberships[multiList[1]._id]?.departmentName}`);

  // Check GET /api/chats/my for Dev A with multiple startups
  const devAMultiChats = await request('GET', '/chats/my', null, devA.token);
  const multiChats = devAMultiChats.data.chats || [];
  if (multiChats.length !== 2) {
    throw new Error(`Expected 2 chats for Dev A (1 per joined startup), got ${multiChats.length}`);
  }
  console.log(`   ✓ Dev A GET /api/chats/my returns 1 authorized chat per startup:`);
  multiChats.forEach(c => console.log(`     - ${c.startup?.name || c.startup}: ${c.name}`));

  // Dev A accesses Startup B tasks -> now allowed!
  const devANewBTasks = await request('GET', `/tasks/startup/${startupBId}?view=all`, null, devA.token);
  if (devANewBTasks.status === 200) {
    console.log('   ✓ Dev A now has access to Startup B workspace tasks (200 OK).');
  } else {
    throw new Error(`Expected 200 for Dev A accessing Startup B tasks after joining, got ${devANewBTasks.status}`);
  }

  // ==========================================
  // CASE 10: Developer joins Startup C
  // ==========================================
  console.log('\nCASE 10: Developer joins Startup C -> Startup C and its chat appear');
  const sResC = await request('POST', '/startups', {
    name: `GammaLogistics ${stamp}`,
    tagline: 'Autonomous Supply Chain',
    description: 'Fleet orchestration AI',
    problemStatement: 'Port congestion bottlenecks.',
    solution: 'Dynamic container routing agent.',
    industry: 'LOGISTICS',
    stage: 'MVP',
    fundingRequired: 3000000,
  }, founderA.token);
  const startupCId = sResC.data?.startup?._id || sResC.data?.startup?.id;

  const deptsCRes = await request('GET', `/departments/startup/${startupCId}`, null, founderA.token);
  const mktgC = deptsCRes.data.departments.find(d => d.name.toLowerCase() === 'marketing');
  const mktgCId = mktgC._id || mktgC.id;

  // Dev A joins Startup C -> Marketing
  await TeamMembership.create({
    startup: startupCId,
    user: devA.userId,
    department: mktgCId,
    departmentRole: 'Marketing Strategist',
    status: 'ACTIVE',
  });

  const devAThreeStartups = await request('GET', '/startups/my', null, devA.token);
  if (devAThreeStartups.data.startups.length !== 3) {
    throw new Error(`Expected 3 startups for Dev A, got ${devAThreeStartups.data.startups.length}`);
  }
  const devAThreeChats = await request('GET', '/chats/my', null, devA.token);
  if (devAThreeChats.data.chats.length !== 3) {
    throw new Error(`Expected 3 chats for Dev A, got ${devAThreeChats.data.chats.length}`);
  }
  console.log(`   ✓ Startup C and its Marketing Chat immediately appear in Dev A's startups (count: 3) and chats (count: 3).`);

  // ==========================================
  // FOUNDER TEST MATRIX
  // ==========================================
  console.log('\nFOUNDER TEST MATRIX:');
  // Founder A sees all department chats for Startup A
  const founderAChats = await request('GET', `/chats/startup/${startupAId}`, null, founderA.token);
  if (founderAChats.status !== 200 || founderAChats.data.chats.length < 3) {
    throw new Error(`Founder A could not see all department chats for Startup A`);
  }
  console.log(`   ✓ Founder A sees all ${founderAChats.data.chats.length} department chats for Startup A.`);

  // Founder A attempts to update Startup B (owned by Founder B) -> 403 Forbidden
  const founderATryUpdateB = await request('PUT', `/startups/${startupBId}`, { name: 'Hostile Takeover' }, founderA.token);
  if (founderATryUpdateB.status === 403) {
    console.log('   ✓ Founder A cannot edit Founder B\'s Startup B (403 Forbidden).');
  } else {
    throw new Error(`Expected 403 for Founder A editing Startup B, got ${founderATryUpdateB.status}`);
  }

  console.log('\n================================================================');
  console.log('ALL 10 SECURITY MATRIX CASES & FOUNDER TESTS PASSED FLAWLESSLY!');
  console.log('================================================================\n');

  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n❌ SECURITY TEST MATRIX FAILED:', err);
  process.exit(1);
});
