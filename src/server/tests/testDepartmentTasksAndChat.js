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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  console.log('================================================================');
  console.log('STARTING DEPARTMENT TASKS & PRIVATE GROUP CHAT INTEGRATION TESTS');
  console.log('================================================================\n');

  await connectDB();

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

  // 1. Create Founder & Startup A
  console.log('1. Creating Founder and Startup A (FlowPay AI Sprint)...');
  const founder = await registerAndLogin('Founder Alice', `founder_${stamp}@flowpay.ai`, 'password123', 'FOUNDER');
  const founderToken = founder.token;

  const sResA = await request('POST', '/startups', {
    name: `FlowPay AI Sprint ${stamp}`,
    tagline: 'AI sprint payment workflows',
    description: 'Enterprise AI sprint payment settlement',
    problemStatement: 'Siloed sprint payments make milestone disbursements slow and error-prone.',
    solution: 'Automated AI milestone settlement smart contracts.',
    industry: 'FINTECH',
    stage: 'MVP',
    fundingRequired: 5000000,
  }, founderToken);
  const startupAId = sResA.data?.startup?._id || sResA.data?.startup?.id;
  if (!startupAId) throw new Error(`Startup A creation failed: ${JSON.stringify(sResA.data)}`);

  // 2. Fetch/seed departments in Startup A
  console.log('2. Fetching departments for Startup A...');
  const deptRes = await request('GET', `/departments/startup/${startupAId}`, null, founderToken);
  const depts = deptRes.data?.departments || [];
  const operationsDept = depts.find((d) => d.name.toLowerCase() === 'operations');
  const developmentDept = depts.find((d) => d.name.toLowerCase() === 'development');
  const marketingDept = depts.find((d) => d.name.toLowerCase() === 'marketing');

  if (!operationsDept || !developmentDept || !marketingDept) {
    throw new Error('Default departments Operations, Development, Marketing not found');
  }

  const opsId = operationsDept._id || operationsDept.id;
  const devDeptId = developmentDept._id || developmentDept.id;
  const mktgId = marketingDept._id || marketingDept.id;
  console.log(`   Departments found: Operations (${opsId}), Development (${devDeptId}), Marketing (${mktgId})`);

  // 3. Register developers A, B, C, D, E, F
  console.log('3. Registering Developers A, B, C, D, E, F...');
  const devA = await registerAndLogin('Raj (Dev A)', `dev_a_${stamp}@flowpay.ai`, 'password123', 'DEVELOPER');
  const devB = await registerAndLogin('Amit (Dev B)', `dev_b_${stamp}@flowpay.ai`, 'password123', 'DEVELOPER');
  const devC = await registerAndLogin('John (Dev C)', `dev_c_${stamp}@flowpay.ai`, 'password123', 'DEVELOPER');
  const devD = await registerAndLogin('Sarah (Dev D)', `dev_d_${stamp}@flowpay.ai`, 'password123', 'DEVELOPER');
  const devE = await registerAndLogin('Priya (Dev E)', `dev_e_${stamp}@flowpay.ai`, 'password123', 'DEVELOPER');
  const devF = await registerAndLogin('Late-Joiner (Dev F)', `dev_f_${stamp}@flowpay.ai`, 'password123', 'DEVELOPER');

  // Add members to Startup A departments
  console.log('4. Adding members to departments in Startup A:');
  console.log('   - Dev A (Raj) -> Operations');
  console.log('   - Dev B (Amit) -> Operations');
  console.log('   - Dev C (John) -> Development');
  console.log('   - Dev D (Sarah) -> Development');
  console.log('   - Dev E (Priya) -> Marketing');

  // Use team controller / join request or direct TeamMembership
  const TeamMembership = require('../models/TeamMembership');
  const memA = await TeamMembership.create({ startup: startupAId, user: devA.userId, department: opsId, departmentRole: 'Operations Engineer', status: 'ACTIVE' });
  const memB = await TeamMembership.create({ startup: startupAId, user: devB.userId, department: opsId, departmentRole: 'Operations Analyst', status: 'ACTIVE' });
  const memC = await TeamMembership.create({ startup: startupAId, user: devC.userId, department: devDeptId, departmentRole: 'Backend Engineer', status: 'ACTIVE' });
  const memD = await TeamMembership.create({ startup: startupAId, user: devD.userId, department: devDeptId, departmentRole: 'Frontend Engineer', status: 'ACTIVE' });
  const memE = await TeamMembership.create({ startup: startupAId, user: devE.userId, department: mktgId, departmentRole: 'Growth Lead', status: 'ACTIVE' });

  // 5. Test Task Creation & Cross-Department Inconsistency Rejection (PART 6)
  console.log('\n5. Testing Task Creation & Assignment Validation:');
  // Task 1 -> Raj -> Operations
  const t1Res = await request('POST', `/tasks/startup/${startupAId}`, {
    title: 'Task 1: Operations Process Map',
    department: opsId,
    assignedTo: devA.userId,
    priority: 'HIGH',
  }, founderToken);
  if (t1Res.status !== 201) throw new Error(`Task 1 creation failed: ${JSON.stringify(t1Res.data)}`);
  const task1Id = t1Res.data?.data?._id;

  // Task 2 -> Amit -> Operations
  const t2Res = await request('POST', `/tasks/startup/${startupAId}`, {
    title: 'Task 2: Logistics Pipeline Review',
    department: opsId,
    assignedTo: devB.userId,
  }, founderToken);
  if (t2Res.status !== 201) throw new Error(`Task 2 creation failed: ${JSON.stringify(t2Res.data)}`);
  const task2Id = t2Res.data?.data?._id;

  // Task 3 -> John -> Development
  const t3Res = await request('POST', `/tasks/startup/${startupAId}`, {
    title: 'Task 3: Build Payment Gateway API',
    department: devDeptId,
    assignedTo: devC.userId,
  }, founderToken);
  if (t3Res.status !== 201) throw new Error(`Task 3 creation failed: ${JSON.stringify(t3Res.data)}`);
  const task3Id = t3Res.data?.data?._id;

  // Task 4 -> Sarah -> Development
  const t4Res = await request('POST', `/tasks/startup/${startupAId}`, {
    title: 'Task 4: React UI Settlement Component',
    department: devDeptId,
    assignedTo: devD.userId,
  }, founderToken);
  if (t4Res.status !== 201) throw new Error(`Task 4 creation failed: ${JSON.stringify(t4Res.data)}`);
  const task4Id = t4Res.data?.data?._id;

  // Task 5 -> Priya -> Marketing
  const t5Res = await request('POST', `/tasks/startup/${startupAId}`, {
    title: 'Task 5: Launch Campaign Playbook',
    department: mktgId,
    assignedTo: devE.userId,
  }, founderToken);
  if (t5Res.status !== 201) throw new Error(`Task 5 creation failed: ${JSON.stringify(t5Res.data)}`);
  const task5Id = t5Res.data?.data?._id;

  // Task 6 -> Unassigned in Operations
  const t6Res = await request('POST', `/tasks/startup/${startupAId}`, {
    title: 'Task 6: Unassigned Operations Inventory',
    department: opsId,
    assignedTo: null,
  }, founderToken);
  if (t6Res.status !== 201) throw new Error(`Task 6 creation failed: ${JSON.stringify(t6Res.data)}`);
  const task6Id = t6Res.data?.data?._id;

  // Inconsistent assignment rejection test: Operations Department + John (Development)
  const rejectRes = await request('POST', `/tasks/startup/${startupAId}`, {
    title: 'Task Inconsistent: Should Be Rejected',
    department: opsId,
    assignedTo: devC.userId, // John belongs to Development!
  }, founderToken);
  if (rejectRes.status === 400) {
    console.log('   ✓ Inconsistent task assignment properly REJECTED (400 Bad Request):', rejectRes.data.message);
  } else {
    throw new Error(`Expected 400 for inconsistent assignment but got ${rejectRes.status}`);
  }

  // 6. Test Task Visibility Rules for Dev A (Operations)
  console.log('\n6. Testing Task Visibility for Developer A (Operations):');
  // MY TASKS: should only see Task 1 (assigned to Dev A)
  const devAMyRes = await request('GET', `/tasks/startup/${startupAId}?view=my`, null, devA.token);
  const devAMyTasks = devAMyRes.data?.tasks || [];
  console.log(`   Dev A MY TASKS count: ${devAMyTasks.length} (expected 1: Task 1)`);
  if (devAMyTasks.length !== 1 || devAMyTasks[0]._id !== task1Id) {
    throw new Error(`Dev A MY TASKS incorrect. Expected only Task 1, got: ${JSON.stringify(devAMyTasks.map((t) => t.title))}`);
  }
  console.log('   ✓ Dev A MY TASKS correctly returns only Task 1.');

  // ALL TASKS: should see Task 1, Task 2, Task 6 (all Operations tasks). MUST NOT see Task 3, 4, 5!
  const devAAllRes = await request('GET', `/tasks/startup/${startupAId}?view=all`, null, devA.token);
  const devAAllTasks = devAAllRes.data?.tasks || [];
  const devAAllTitles = devAAllTasks.map((t) => t.title);
  console.log(`   Dev A ALL TASKS count: ${devAAllTasks.length} (expected 3: Task 1, Task 2, Task 6)`);
  console.log('   Titles:', devAAllTitles);

  if (devAAllTasks.length !== 3) {
    throw new Error(`Dev A ALL TASKS count mismatch: expected 3, got ${devAAllTasks.length}`);
  }
  const hasDev3 = devAAllTasks.some((t) => t._id === task3Id);
  const hasDev4 = devAAllTasks.some((t) => t._id === task4Id);
  const hasDev5 = devAAllTasks.some((t) => t._id === task5Id);
  if (hasDev3 || hasDev4 || hasDev5) {
    throw new Error('SECURITY BREACH: Dev A saw tasks from Development or Marketing!');
  }
  console.log('   ✓ Dev A ALL TASKS strictly returns Operations tasks (Task 1, 2, 6) with 0 data leakage.');

  // Cross-department URL tamper test: Dev A tries ?view=all&departmentId=DEVELOPMENT
  console.log('\n7. Testing Cross-Department URL Tamper Protection:');
  const tamperRes = await request('GET', `/tasks/startup/${startupAId}?view=all&departmentId=${devDeptId}`, null, devA.token);
  if (tamperRes.status === 403) {
    console.log('   ✓ Dev A query with Development departmentId correctly blocked: 403 Forbidden.');
  } else {
    throw new Error(`Expected 403 Forbidden on tamper attempt, got ${tamperRes.status}`);
  }

  // 8. Test Task Visibility for Dev C (Development) and Dev E (Marketing)
  console.log('\n8. Testing Task Visibility for Dev C (Development) and Dev E (Marketing):');
  const devCMyRes = await request('GET', `/tasks/startup/${startupAId}?view=my`, null, devC.token);
  if (devCMyRes.data.tasks.length !== 1 || devCMyRes.data.tasks[0]._id !== task3Id) {
    throw new Error('Dev C MY TASKS incorrect');
  }
  console.log('   ✓ Dev C MY TASKS returns Task 3.');

  const devCAllRes = await request('GET', `/tasks/startup/${startupAId}?view=all`, null, devC.token);
  const devCAllTasks = devCAllRes.data.tasks;
  if (devCAllTasks.length !== 2 || !devCAllTasks.some((t) => t._id === task3Id) || !devCAllTasks.some((t) => t._id === task4Id)) {
    throw new Error(`Dev C ALL TASKS incorrect: expected Task 3 and Task 4, got ${devCAllTasks.length}`);
  }
  console.log('   ✓ Dev C ALL TASKS returns Task 3 and Task 4 (0 Operations or Marketing tasks).');

  const devEMyRes = await request('GET', `/tasks/startup/${startupAId}?view=my`, null, devE.token);
  const devEAllRes = await request('GET', `/tasks/startup/${startupAId}?view=all`, null, devE.token);
  if (devEMyRes.data.tasks.length !== 1 || devEAllRes.data.tasks.length !== 1 || devEMyRes.data.tasks[0]._id !== task5Id) {
    throw new Error('Dev E tasks visibility incorrect');
  }
  console.log('   ✓ Dev E MY TASKS and ALL TASKS return only Task 5.');

  // 9. Late-Joining Developer (PART 8 & 32)
  console.log('\n9. Testing Late-Joining Developer (Dev F) in Operations:');
  await TeamMembership.create({ startup: startupAId, user: devF.userId, department: opsId, departmentRole: 'Junior Ops', status: 'ACTIVE' });
  const devFMyRes = await request('GET', `/tasks/startup/${startupAId}?view=my`, null, devF.token);
  if (devFMyRes.data.tasks.length !== 0) throw new Error('Dev F should have 0 MY TASKS initially');
  console.log('   ✓ Late-joiner Dev F MY TASKS is 0.');

  const devFAllRes = await request('GET', `/tasks/startup/${startupAId}?view=all`, null, devF.token);
  const devFAllTasks = devFAllRes.data.tasks;
  if (devFAllTasks.length !== 3 || !devFAllTasks.some((t) => t._id === task1Id) || !devFAllTasks.some((t) => t._id === task2Id) || !devFAllTasks.some((t) => t._id === task6Id)) {
    throw new Error('Late-joiner Dev F should see all historical Operations tasks');
  }
  console.log('   ✓ Late-joiner Dev F sees all historical Operations tasks (Task 1, 2, 6) under ALL TASKS.');

  // 10. Private Department Group Chat Isolation & Access Control (PART 14-25, 31)
  console.log('\n10. Testing Private Department Group Chat Access:');
  // Fetch chats for Dev A -> should only see 1 chat (Operations Team Chat)
  const devAChatsRes = await request('GET', `/chats/startup/${startupAId}`, null, devA.token);
  const devAChats = devAChatsRes.data.chats || [];
  console.log(`   Dev A chat list count: ${devAChats.length} (expected 1: Operations Team Chat)`);
  if (devAChats.length !== 1 || devAChats[0].department?.name !== 'Operations') {
    throw new Error(`Dev A chat list violated isolation: ${JSON.stringify(devAChats)}`);
  }
  const opsChatId = devAChats[0]._id;
  console.log(`   ✓ Dev A sees ONLY Operations Team Chat (ID: ${opsChatId}).`);

  // Fetch chats for Founder -> should see all department chats
  const founderChatsRes = await request('GET', `/chats/startup/${startupAId}`, null, founderToken);
  const founderChats = founderChatsRes.data.chats || [];
  console.log(`   Founder chat list count: ${founderChats.length} (expected all startup departments)`);
  if (founderChats.length < 3) throw new Error('Founder should see all department chats');
  console.log('   ✓ Founder has visibility of all startup department chats.');

  const devDeptChat = founderChats.find((c) => c.department?.name === 'Development');
  const devChatId = devDeptChat?._id;

  // Cross-department Chat Access Security:
  // Dev A (Operations) tries to access Development chat messages -> MUST BE 403 Forbidden!
  console.log('\n11. Testing Cross-Department Chat Access Security:');
  const devATryingDevChat = await request('GET', `/chats/${devChatId}/messages`, null, devA.token);
  if (devATryingDevChat.status === 403) {
    console.log('   ✓ Dev A (Operations) attempting to read Development Chat is 403 Forbidden.');
  } else {
    throw new Error(`Expected 403 Forbidden for Dev A reading Dev chat, got ${devATryingDevChat.status}`);
  }

  // Dev A tries to post to Development Chat -> MUST BE 403 Forbidden!
  const devATryingPostDevChat = await request('POST', `/chats/${devChatId}/messages`, { message: 'Intrusion attempt' }, devA.token);
  if (devATryingPostDevChat.status === 403) {
    console.log('   ✓ Dev A (Operations) attempting to post to Development Chat is 403 Forbidden.');
  } else {
    throw new Error(`Expected 403 Forbidden for Dev A posting to Dev chat, got ${devATryingPostDevChat.status}`);
  }

  // 12. Message Posting & History Persistence
  console.log('\n12. Testing Message Posting & Persistence in Operations Chat:');
  const msg1Res = await request('POST', `/chats/${opsChatId}/messages`, { message: 'We should finish the deployment task today.' }, devA.token);
  if (msg1Res.status !== 201) throw new Error(`Failed to post message: ${JSON.stringify(msg1Res.data)}`);
  console.log('   ✓ Dev A posted message to Operations Chat.');

  const msg2Res = await request('POST', `/chats/${opsChatId}/messages`, { message: "I'll handle the API testing." }, devB.token);
  if (msg2Res.status !== 201) throw new Error(`Failed to post message: ${JSON.stringify(msg2Res.data)}`);
  console.log('   ✓ Dev B posted message to Operations Chat.');

  // Read Operations Chat Messages as Dev A
  const opsMsgsRes = await request('GET', `/chats/${opsChatId}/messages`, null, devA.token);
  const opsMsgs = opsMsgsRes.data?.messages || [];
  if (opsMsgs.length !== 2) throw new Error(`Expected 2 messages in Operations chat, got ${opsMsgs.length}`);
  console.log(`   ✓ Retrieved ${opsMsgs.length} messages in Operations Chat in chronological order.`);

  // Late-joiner Dev F reads Operations Chat
  const devFReadOps = await request('GET', `/chats/${opsChatId}/messages`, null, devF.token);
  if (devFReadOps.status !== 200 || devFReadOps.data.messages.length !== 2) {
    throw new Error('Late-joiner Dev F could not read historical Operations chat');
  }
  console.log('   ✓ Late-joiner Dev F successfully accesses complete Operations Chat history.');

  // 13. Member Moved Between Departments (PART 9 & 26)
  console.log('\n13. Testing Moving Member (Dev A) from Operations -> Development:');
  // Move Dev A to Development department
  memA.department = devDeptId;
  await memA.save();
  console.log('   Updated Dev A membership department to Development.');

  // Dev A's task visibility should now be Development tasks
  const devAMovedMy = await request('GET', `/tasks/startup/${startupAId}?view=my`, null, devA.token);
  if (devAMovedMy.data.tasks.length !== 1 || devAMovedMy.data.tasks[0]._id !== task1Id) {
    throw new Error('Dev A should still see Task 1 assigned to him in MY TASKS');
  }
  console.log('   ✓ Dev A MY TASKS retains Task 1 (assigned to him).');

  const devAMovedAll = await request('GET', `/tasks/startup/${startupAId}?view=all`, null, devA.token);
  const movedAllTasks = devAMovedAll.data.tasks;
  console.log(`   Dev A ALL TASKS after moving: count = ${movedAllTasks.length}`);
  if (movedAllTasks.length !== 2 || !movedAllTasks.some((t) => t._id === task3Id) || !movedAllTasks.some((t) => t._id === task4Id)) {
    throw new Error(`Dev A ALL TASKS should now be Development tasks (Task 3, 4). Got: ${JSON.stringify(movedAllTasks.map((t) => t.title))}`);
  }
  console.log('   ✓ Dev A ALL TASKS immediately switched to Development department tasks (Task 3, Task 4)!');

  // Dev A's chat access should change
  const devATryingOldOpsChat = await request('GET', `/chats/${opsChatId}/messages`, null, devA.token);
  if (devATryingOldOpsChat.status === 403) {
    console.log('   ✓ Dev A immediately lost access to Operations Chat: 403 Forbidden.');
  } else {
    throw new Error(`Expected 403 for Dev A accessing old Operations chat, got ${devATryingOldOpsChat.status}`);
  }

  const devANewDevChat = await request('GET', `/chats/${devChatId}/messages`, null, devA.token);
  if (devANewDevChat.status === 200) {
    console.log('   ✓ Dev A immediately gained access to Development Chat: 200 OK.');
  } else {
    throw new Error(`Expected 200 for Dev A accessing new Development chat, got ${devANewDevChat.status}`);
  }

  // 14. Cross-Startup Isolation (PART 33)
  console.log('\n14. Testing Cross-Startup Isolation (Startup A vs Startup B):');
  const sResB = await request('POST', '/startups', {
    name: `HealthSync AI ${stamp}`,
    tagline: 'Healthcare automation',
    description: 'HIPAA compliant health workflows',
    problemStatement: 'Manual health records synchronization introduces latency in critical patient care.',
    solution: 'Real-time FHIR compliant distributed edge synchronization engine.',
    industry: 'HEALTHCARE',
    stage: 'MVP',
    fundingRequired: 2000000,
  }, founderToken);
  const startupBId = sResB.data?.startup?._id || sResB.data?.startup?.id;

  // Dev A (member of Startup A) tries to access Startup B tasks -> 403
  const crossStartupTasks = await request('GET', `/tasks/startup/${startupBId}?view=all`, null, devA.token);
  if (crossStartupTasks.status === 403) {
    console.log('   ✓ Dev A attempting to access Startup B tasks: 403 Forbidden.');
  } else {
    throw new Error(`Expected 403 for cross-startup tasks access, got ${crossStartupTasks.status}`);
  }

  // Dev A tries to access Startup B chats -> 403
  const crossStartupChats = await request('GET', `/chats/startup/${startupBId}`, null, devA.token);
  if (crossStartupChats.status === 403) {
    console.log('   ✓ Dev A attempting to access Startup B chats: 403 Forbidden.');
  } else {
    throw new Error(`Expected 403 for cross-startup chats access, got ${crossStartupChats.status}`);
  }

  console.log('\n================================================================');
  console.log('ALL INTEGRATION & SECURITY TESTS PASSED PERFECTLY!');
  console.log('================================================================\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
