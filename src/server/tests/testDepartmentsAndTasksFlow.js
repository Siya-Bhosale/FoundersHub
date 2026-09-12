const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const headers = options.headers || {};
  let body = options.body;

  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    body,
  });

  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  }

  if (!res.ok) {
    const err = new Error(data?.message || `HTTP ${res.status}: ${res.statusText}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return { status: res.status, data, headers: res.headers };
}

async function registerAndLogin(name, email, password, role) {
  await request('/auth/register', {
    method: 'POST',
    body: { name, email, password, role },
  });

  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: { email, password },
  });

  return {
    token: loginRes.data.token,
    user: loginRes.data.user,
    userId: loginRes.data.user.id || loginRes.data.user._id,
  };
}

async function runTests() {
  console.log('=== STARTING DEPARTMENT & TASKS WORKFLOW VERIFICATION ===\n');
  const timestamp = Date.now();

  try {
    // 1. REGISTER & LOGIN USERS
    console.log('1. Registering & logging in test users...');
    const founder = await registerAndLogin(
      `Founder Alpha_${timestamp}`,
      `founder_${timestamp}@example.com`,
      'Password123!',
      'FOUNDER'
    );
    const founderToken = founder.token;
    const founderId = founder.userId;

    const devA = await registerAndLogin(
      `Developer A_${timestamp}`,
      `deva_${timestamp}@example.com`,
      'Password123!',
      'DEVELOPER'
    );
    const devAToken = devA.token;
    const devAId = devA.userId;

    const devB = await registerAndLogin(
      `Developer B_${timestamp}`,
      `devb_${timestamp}@example.com`,
      'Password123!',
      'DEVELOPER'
    );
    const devBToken = devB.token;
    const devBId = devB.userId;

    const devC = await registerAndLogin(
      `Developer C_${timestamp}`,
      `devc_${timestamp}@example.com`,
      'Password123!',
      'DEVELOPER'
    );
    const devCToken = devC.token;
    const devCId = devC.userId;

    const devD = await registerAndLogin(
      `Developer D_${timestamp}`,
      `devd_${timestamp}@example.com`,
      'Password123!',
      'DEVELOPER'
    );
    const devDToken = devD.token;
    const devDId = devD.userId;

    const founderB = await registerAndLogin(
      `Founder Beta_${timestamp}`,
      `founder_beta_${timestamp}@example.com`,
      'Password123!',
      'FOUNDER'
    );
    const founderBToken = founderB.token;

    console.log('✓ All test users registered & logged in successfully.\n');

    // 2. CREATE STARTUP A
    console.log('2. Founder Alpha creates Startup A...');
    const startupRes = await request('/startups', {
      method: 'POST',
      headers: { Authorization: `Bearer ${founderToken}` },
      body: {
        name: `SprintLaunch_${timestamp}`,
        tagline: 'Autonomous AI Sprint Platform',
        industry: 'B2B SaaS',
        stage: 'MVP',
        description: 'Next gen platform for startup engineering execution.',
        problemStatement: 'Early stage startups struggle with task and department coordination.',
        solution: 'Automated sprint boards and departmental team rosters.',
      },
    });
    const startupId = startupRes.data.startup._id || startupRes.data.startup.id;
    console.log(`✓ Startup A created with ID: ${startupId}\n`);

    // 3. FETCH DEPARTMENTS (Auto-seeds defaults if 0 exist)
    console.log('3. Fetching startup departments (verifying auto-seeding of 9 default departments)...');
    const deptsRes = await request(`/departments/startup/${startupId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${founderToken}` },
    });
    let depts = deptsRes.data.departments;
    console.log(`✓ Retrieved ${depts.length} departments:`, depts.map((d) => d.name).join(', '));

    const technicalDept = depts.find((d) => d.name.toLowerCase() === 'technical');
    const developmentDept = depts.find((d) => d.name.toLowerCase() === 'development');
    const salesDept = depts.find((d) => d.name.toLowerCase() === 'sales');
    const productDept = depts.find((d) => d.name.toLowerCase() === 'product');
    const supportDept = depts.find((d) => d.name.toLowerCase() === 'customer support');

    if (!technicalDept || !developmentDept || !salesDept || !productDept || !supportDept) {
      throw new Error('Default departments (Technical, Development, Sales, Product, Customer Support) were not found.');
    }
    console.log('✓ Verified all required default departments exist.\n');

    // 4. FOUNDER CREATES A CUSTOM DYNAMIC DEPARTMENT
    console.log('4. Founder creates dynamic department "Product Research"...');
    const createDeptRes = await request(`/startups/${startupId}/departments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${founderToken}` },
      body: {
        name: 'Product Research',
        description: 'Deep user interviews, product discovery, and market validation',
      },
    });
    const customDept = createDeptRes.data.department;
    console.log(`✓ Dynamic department created: ${customDept.name}\n`);

    // 4b. VERIFY DEDICATED DEPARTMENT WORKSPACE ENDPOINT (Part 5)
    console.log('4b. Fetching dedicated department workspace details...');
    const deptDetailRes = await request(`/startups/${startupId}/departments/${customDept._id || customDept.id}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${founderToken}` },
    });
    console.log(`✓ Retrieved department workspace for: ${deptDetailRes.data.department.name} (Member count: ${deptDetailRes.data.department.memberCount})`);

    // 4c. TEST DELETE PROTECTIONS (Part 2)
    console.log('4c. Testing department deletion protections...');
    // Attempt to delete default department
    try {
      await request(`/startups/${startupId}/departments/${technicalDept._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${founderToken}` },
      });
      throw new Error('Default department should not be deletable!');
    } catch (err) {
      if (err.status === 400 && err.message.includes('Default departments cannot be deleted')) {
        console.log('✓ Default department deletion correctly blocked (400 Bad Request).');
      } else {
        throw err;
      }
    }

    // 5. DEVELOPER A CREATES PROFILE & UPLOADS RESUME
    console.log('5. Developer A creates profile with social links & uploads resume...');
    await request('/developers/profile', {
      method: 'POST',
      headers: { Authorization: `Bearer ${devAToken}` },
      body: {
        bio: 'Senior Backend Engineer specializing in Node.js and distributed databases.',
        skills: ['Node.js', 'Express', 'MongoDB', 'React'],
        experience: '4 years building high-throughput microservices',
        education: 'B.S. in Computer Science',
        github: 'https://github.com/developer-a',
        linkedin: 'https://linkedin.com/in/developer-a',
        portfolio: 'https://developer-a.dev',
        twitter: 'https://x.com/developer_a',
        otherSocial: 'https://medium.com/@developer_a',
      },
    });

    // Native FormData for resume upload
    const dummyBlob = new Blob(['%PDF-1.4 Dummy PDF content for automated test verification'], {
      type: 'application/pdf',
    });
    const form = new FormData();
    form.append('resume', dummyBlob, 'Raj_Shinde_Resume.pdf');

    const uploadRes = await request('/developers/resume', {
      method: 'POST',
      headers: { Authorization: `Bearer ${devAToken}` },
      body: form,
    });
    console.log('✓ Resume uploaded successfully:', uploadRes.data.data.resumeOriginalName);

    // 6. DEVELOPER A APPLIES TO STARTUP A
    console.log('\n6. Developer A applies to Startup A for "Technical" as "Backend Developer"...');
    const applyARes = await request(`/startups/${startupId}/join-requests`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${devAToken}` },
      body: {
        department: technicalDept._id,
        requestedRole: 'Backend Developer',
        message: 'I would like to contribute to backend development and API architecture.',
      },
    });
    const requestAId = applyARes.data.request.id || applyARes.data.request._id;
    console.log('✓ Developer A application submitted. Request ID:', requestAId);

    // 7. DEVELOPER B APPLIES FOR "Development" AS "Frontend Developer"
    console.log('7. Developer B applies for "Development" as "Frontend Developer"...');
    const applyBRes = await request(`/startups/${startupId}/join-requests`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${devBToken}` },
      body: {
        department: developmentDept._id,
        requestedRole: 'Frontend Developer',
        message: 'Excited to build clean React UI components.',
      },
    });
    const requestBId = applyBRes.data.request.id || applyBRes.data.request._id;

    // 8. DEVELOPER C APPLIES FOR "Sales" AS "Sales Executive"
    console.log('8. Developer C applies for "Sales" as "Sales Executive"...');
    const applyCRes = await request(`/startups/${startupId}/join-requests`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${devCToken}` },
      body: {
        department: salesDept._id,
        requestedRole: 'Sales Executive',
        message: 'Experienced in B2B enterprise outreach.',
      },
    });
    const requestCId = applyCRes.data.request.id || applyCRes.data.request._id;

    // 9. RESUME ACCESS SECURITY TEST (Feature 10)
    console.log('\n9. Testing Resume Access Security (Feature 10)...');
    // Founder Alpha (owner of Startup A where Dev A applied) CAN view Dev A's resume
    const founderViewRes = await request(`/developers/resume/${devAId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${founderToken}` },
    });
    if (founderViewRes.status === 200) {
      console.log('✓ Founder Alpha CAN view Developer A resume (Authorized).');
    }

    // Developer A viewing their own resume CAN view
    const devSelfViewRes = await request(`/developers/resume/${devAId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${devAToken}` },
    });
    if (devSelfViewRes.status === 200) {
      console.log('✓ Developer A CAN view their own resume (Authorized).');
    }

    // Founder Beta (unrelated startup) CANNOT view Dev A's resume -> Expected 403
    try {
      await request(`/developers/resume/${devAId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${founderBToken}` },
      });
      throw new Error('SECURITY VIOLATION: Unrelated Founder Beta was able to access Dev A resume!');
    } catch (secErr) {
      if (secErr.status === 403) {
        console.log('✓ Founder Beta CANNOT view Developer A resume (403 Forbidden - Correct).');
      } else {
        throw secErr;
      }
    }

    // Unauthenticated user CANNOT view -> Expected 401
    try {
      await request(`/developers/resume/${devAId}`, { method: 'GET' });
      throw new Error('SECURITY VIOLATION: Unauthenticated user was able to access Dev A resume!');
    } catch (unauthErr) {
      if (unauthErr.status === 401 || unauthErr.status === 403) {
        console.log('✓ Unauthenticated request blocked (401/403 - Correct).\n');
      } else {
        throw unauthErr;
      }
    }

    // 10. FOUNDER ACCEPTS APPLICATIONS
    console.log('10. Founder accepts applications for Developers A, B, and C...');
    await request(`/join-requests/${requestAId}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${founderToken}` },
    });
    await request(`/join-requests/${requestBId}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${founderToken}` },
    });
    await request(`/join-requests/${requestCId}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${founderToken}` },
    });
    console.log('✓ Developers A, B, and C accepted into their requested departments.\n');

    // 11. VERIFY FOUNDER TEAM VIEW
    console.log('11. Verifying startup team organized into departments...');
    const teamRes = await request(`/startups/${startupId}/team`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${founderToken}` },
    });
    const members = teamRes.data.members;
    console.log(`✓ Total team members retrieved: ${members.length}`);

    const memberA = members.find((m) => m.user._id === devAId || m.user.id === devAId);
    const memberB = members.find((m) => m.user._id === devBId || m.user.id === devBId);
    const memberC = members.find((m) => m.user._id === devCId || m.user.id === devCId);

    console.log(`Member A: ${memberA.user.name} -> Dept: ${memberA.department?.name}, Role: ${memberA.departmentRole}`);
    console.log(`Member B: ${memberB.user.name} -> Dept: ${memberB.department?.name}, Role: ${memberB.departmentRole}`);
    console.log(`Member C: ${memberC.user.name} -> Dept: ${memberC.department?.name}, Role: ${memberC.departmentRole}`);

    if (memberA.department?.name !== 'Technical' || memberA.departmentRole !== 'Backend Developer') {
      throw new Error('Member A department or role mismatch');
    }
    if (memberB.department?.name !== 'Development' || memberB.departmentRole !== 'Frontend Developer') {
      throw new Error('Member B department or role mismatch');
    }
    if (memberC.department?.name !== 'Sales' || memberC.departmentRole !== 'Sales Executive') {
      throw new Error('Member C department or role mismatch');
    }
    console.log('✓ All members verified under their respective startup departments.\n');

    // 11b. TEST CUSTOM DEPARTMENT DELETION SAFEGUARDS
    console.log('11b. Testing custom department deletion safeguards with active members...');
    // Create a temporary custom department
    const tempDeptRes = await request(`/startups/${startupId}/departments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${founderToken}` },
      body: { name: 'Growth Experiments' },
    });
    const tempDept = tempDeptRes.data.department;

    // Move Member C to Growth Experiments
    await request(`/startups/${startupId}/team/${memberC._id || memberC.id}/department`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${founderToken}` },
      body: { departmentId: tempDept._id || tempDept.id },
    });

    // Attempt to delete Growth Experiments while Member C is in it
    try {
      await request(`/startups/${startupId}/departments/${tempDept._id || tempDept.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${founderToken}` },
      });
      throw new Error('Department with active members should not be deletable!');
    } catch (err) {
      if (err.status === 400 && err.message.includes('This department has active members')) {
        console.log('✓ Deletion of department with active members correctly blocked (400 Bad Request).');
      } else {
        throw err;
      }
    }

    // Move Member C back to Sales
    await request(`/startups/${startupId}/team/${memberC._id || memberC.id}/department`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${founderToken}` },
      body: { departmentId: salesDept._id },
    });

    // Now delete Growth Experiments (0 members remaining) -> should succeed
    const deleteTempRes = await request(`/startups/${startupId}/departments/${tempDept._id || tempDept.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${founderToken}` },
    });
    console.log(`✓ Custom department without members deleted successfully: ${deleteTempRes.data.message}\n`);

    // 12. CREATE TASKS 1 to 5 (Feature 25 scenario)
    console.log('12. Creating 5 test tasks (Feature 25 scenario)...');
    // Task 1 -> Dev A
    const t1Res = await request(`/startups/${startupId}/tasks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${founderToken}` },
      body: { title: 'Task 1: Build Auth & Department APIs', assignedTo: devAId, status: 'TODO', priority: 'HIGH' },
    });
    const task1Id = t1Res.data.data._id || t1Res.data.task._id;

    // Task 2 -> Dev B
    await request(`/startups/${startupId}/tasks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${founderToken}` },
      body: { title: 'Task 2: Implement Department Team UI', assignedTo: devBId, status: 'TODO', priority: 'MEDIUM' },
    });

    // Task 3 -> Dev C
    await request(`/startups/${startupId}/tasks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${founderToken}` },
      body: { title: 'Task 3: Client Outreach Campaign', assignedTo: devCId, status: 'TODO', priority: 'MEDIUM' },
    });

    // Task 4 -> Unassigned
    await request(`/startups/${startupId}/tasks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${founderToken}` },
      body: { title: 'Task 4: Write End-to-End Test Suite', assignedTo: null, status: 'TODO', priority: 'LOW' },
    });

    // Task 5 -> Dev A
    await request(`/startups/${startupId}/tasks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${founderToken}` },
      body: { title: 'Task 5: Optimize MongoDB Indexes', assignedTo: devAId, status: 'TODO', priority: 'HIGH' },
    });

    console.log('✓ Created Tasks 1, 2, 3, 4, and 5.\n');

    // 13. TEST FOUNDER ALL TASKS VIEW
    console.log('13. Testing Founder tasks view...');
    const founderTasksRes = await request(`/startups/${startupId}/tasks`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${founderToken}` },
    });
    console.log(`✓ Founder sees ${founderTasksRes.data.count} tasks (Expected: 5).`);
    if (founderTasksRes.data.count !== 5) {
      throw new Error(`Expected 5 tasks for founder, got ${founderTasksRes.data.count}`);
    }

    // 14. TEST DEVELOPER A: MY TASKS VS ALL TASKS
    console.log('\n14. Testing Developer A: MY TASKS vs ALL TASKS...');
    const devAMyTasks = await request(`/startups/${startupId}/tasks?view=my`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${devAToken}` },
    });
    console.log(`✓ Developer A MY TASKS count: ${devAMyTasks.data.count} (Expected: 2 - Tasks 1 & 5).`);
    if (devAMyTasks.data.count !== 2) {
      throw new Error(`Expected Developer A to see 2 tasks in MY TASKS, got ${devAMyTasks.data.count}`);
    }

    const devAAllTasks = await request(`/startups/${startupId}/tasks?view=all`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${devAToken}` },
    });
    console.log(`✓ Developer A ALL TASKS count: ${devAAllTasks.data.count} (Expected: 2 Technical department tasks).`);
    if (devAAllTasks.data.count !== 2) {
      throw new Error(`Expected Developer A to see 2 tasks in ALL TASKS, got ${devAAllTasks.data.count}`);
    }

    // Check dynamic department derivation on tasks
    const sampleT1 = devAAllTasks.data.data.find((t) => t.title.includes('Task 1'));
    console.log(`Task 1 department: ${sampleT1.derivedDepartment?.name || sampleT1.department?.name}`);
    if ((sampleT1.derivedDepartment?.name || sampleT1.department?.name) !== 'Technical') {
      throw new Error('Task 1 derived department should be Technical');
    }
    console.log('✓ Dynamic department derivation from TeamMembership -> Department verified.\n');

    // 15. LATE-JOINING DEVELOPER D TEST (Feature 15 & 25)
    console.log('15. Testing Late-Joining Developer D (Feature 15 & 25)...');
    console.log('Developer D joins TODAY and is accepted into Technical...');
    const applyDRes = await request(`/startups/${startupId}/join-requests`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${devDToken}` },
      body: {
        department: technicalDept._id,
        requestedRole: 'DevOps Engineer',
        message: 'Joining today to manage CI/CD pipelines.',
      },
    });
    await request(`/join-requests/${applyDRes.data.request.id || applyDRes.data.request._id}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${founderToken}` },
    });

    // Developer D opens MY TASKS: should be 0
    const devDMyTasks = await request(`/startups/${startupId}/tasks?view=my`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${devDToken}` },
    });
    console.log(`✓ Developer D MY TASKS: ${devDMyTasks.data.count} tasks (Expected: 0).`);
    if (devDMyTasks.data.count !== 0) {
      throw new Error(`Developer D should have 0 assigned tasks, got ${devDMyTasks.data.count}`);
    }

    // Developer D opens ALL TASKS: MUST see all historical Technical department tasks (Tasks 1 & 5)!
    const devDAllTasks = await request(`/startups/${startupId}/tasks?view=all`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${devDToken}` },
    });
    console.log(`✓ Developer D ALL TASKS: ${devDAllTasks.data.count} tasks (Expected: 2 historical Technical tasks).`);
    if (devDAllTasks.data.count !== 2) {
      throw new Error(`Late-joining Developer D must see historical Technical department tasks, got ${devDAllTasks.data.count}`);
    }

    // 16. TASK STATUS SYNCHRONIZATION TEST (Feature 18)
    console.log('\n16. Testing Task Status Synchronization (Single Source of Truth)...');
    // Dev A moves Task 1 to IN_PROGRESS
    await request(`/tasks/${task1Id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${devAToken}` },
      body: { status: 'IN_PROGRESS' },
    });

    // Founder re-fetches tasks
    const founderCheckTasks = await request(`/startups/${startupId}/tasks`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${founderToken}` },
    });
    const updatedTask1 = founderCheckTasks.data.data.find((t) => (t._id || t.id) === task1Id);
    console.log(`✓ Task 1 status on Founder board: ${updatedTask1.status} (Expected: IN_PROGRESS).`);
    if (updatedTask1.status !== 'IN_PROGRESS') {
      throw new Error(`Expected task status IN_PROGRESS, got ${updatedTask1.status}`);
    }

    // 17. MOVE MEMBER BETWEEN DEPARTMENTS TEST (Feature 13)
    console.log('\n17. Testing Moving Member Between Departments (Feature 13)...');
    // Founder moves Developer A from Technical to Development
    const moveRes = await request(`/startups/${startupId}/team/${memberA._id || memberA.id}/department`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${founderToken}` },
      body: { departmentId: developmentDept._id },
    });
    console.log(`✓ Member A moved to: ${moveRes.data.membership?.department?.name} (Expected: Development).`);

    // Verify Developer A now sees Development tasks in ALL TASKS
    const devANewAllTasks = await request(`/startups/${startupId}/tasks?view=all`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${devAToken}` },
    });
    console.log(`✓ Developer A ALL TASKS after moving to Development: ${devANewAllTasks.data.count} tasks.`);
    if (devANewAllTasks.data.count < 1) {
      throw new Error('Expected Developer A to see Development tasks after moving');
    }

    console.log('\n======================================================');
    console.log('>>> ALL 17 INTEGRATION TEST SUITES PASSED FLAWLESSLY! <<<');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.data || err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

runTests();
