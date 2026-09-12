const BASE_URL = 'http://localhost:5000/api';

async function apiRequest(endpoint, { method = 'GET', body = null, token = null } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `Request failed with ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function registerAndLogin(name, email, password, role) {
  await apiRequest('/auth/register', {
    method: 'POST',
    body: { name, email, password, role },
  });
  const loginRes = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  return {
    token: loginRes.token,
    user: loginRes.user,
  };
}

async function runDeveloperKanbanTests() {
  console.log('====================================================');
  console.log('STARTING DEVELOPER KANBAN END-TO-END FLOW TEST');
  console.log('====================================================\n');

  const timestamp = Date.now();

  try {
    // 1. Register Founder
    console.log('1. Registering & logging in Founder...');
    const founderEmail = `founder_kanban_${timestamp}@test.com`;
    const founderAuth = await registerAndLogin('Kanban Founder', founderEmail, 'Password123!', 'FOUNDER');
    const founderToken = founderAuth.token;
    const founderUserId = founderAuth.user.id || founderAuth.user._id;
    console.log(`✓ Founder authenticated: ${founderEmail} (ID: ${founderUserId})`);

    // 2. Register Developer A and Developer B
    console.log('\n2. Registering & logging in Developer A and Developer B...');
    const devAEmail = `devA_kanban_${timestamp}@test.com`;
    const devAAuth = await registerAndLogin('Developer Alice', devAEmail, 'Password123!', 'DEVELOPER');
    const devAToken = devAAuth.token;
    const devAUserId = devAAuth.user.id || devAAuth.user._id;

    const devBEmail = `devB_kanban_${timestamp}@test.com`;
    const devBAuth = await registerAndLogin('Developer Bob', devBEmail, 'Password123!', 'DEVELOPER');
    const devBToken = devBAuth.token;
    const devBUserId = devBAuth.user.id || devBAuth.user._id;

    console.log(`✓ Dev A authenticated: ${devAEmail} (ID: ${devAUserId})`);
    console.log(`✓ Dev B authenticated: ${devBEmail} (ID: ${devBUserId})`);

    // 3. Founder creates Startup A
    console.log('\n3. Founder creating Startup A...');
    const startupRes = await apiRequest('/startups', {
      method: 'POST',
      token: founderToken,
      body: {
        name: `Startup Alpha ${timestamp}`,
        tagline: 'High-performance team workflows',
        problemStatement: 'Managing distributed startup tasks is messy',
        solution: 'Unified single-source-of-truth Kanban',
        industry: 'B2B SaaS',
        stage: 'MVP',
        description: 'Building next-gen startup management software',
      },
    });
    const startupId = startupRes.startup._id || startupRes.startup.id;
    console.log(`✓ Startup A created: ID ${startupId}`);

    // Create an unrelated Startup B to test cross-startup isolation
    console.log('\n4. Creating Unrelated Startup B for cross-startup security testing...');
    const otherFounderAuth = await registerAndLogin(
      'Other Founder',
      `other_founder_${timestamp}@test.com`,
      'Password123!',
      'FOUNDER'
    );
    const startupBRes = await apiRequest('/startups', {
      method: 'POST',
      token: otherFounderAuth.token,
      body: {
        name: `Startup Beta ${timestamp}`,
        tagline: 'Isolated startup',
        problemStatement: 'Security testing',
        solution: 'Strict access control',
        industry: 'FinTech',
        stage: 'IDEA',
      },
    });
    const startupBId = startupBRes.startup._id || startupBRes.startup.id;
    console.log(`✓ Startup B created: ID ${startupBId}`);

    // 5. Developer A and Developer B join Startup A
    console.log('\n5. Dev A and Dev B requesting to join Startup A...');
    const reqARes = await apiRequest('/join-requests', {
      method: 'POST',
      token: devAToken,
      body: { startupId, message: 'Excited to build the MVP backend' },
    });
    const reqAId = reqARes.request._id || reqARes.request.id;

    const reqBRes = await apiRequest('/join-requests', {
      method: 'POST',
      token: devBToken,
      body: { startupId, message: 'Excited to build the frontend' },
    });
    const reqBId = reqBRes.request._id || reqBRes.request.id;

    // Founder accepts both requests
    console.log('Founder accepting join requests for Dev A and Dev B...');
    await apiRequest(`/join-requests/${reqAId}/accept`, {
      method: 'PUT',
      token: founderToken,
    });
    await apiRequest(`/join-requests/${reqBId}/accept`, {
      method: 'PUT',
      token: founderToken,
    });
    console.log('✓ Dev A and Dev B are now ACTIVE team members on Startup A');

    // 6. Founder creates tasks
    console.log('\n6. Founder creating tasks:');
    // Task 1 -> assigned to Dev A
    const t1Res = await apiRequest(`/startups/${startupId}/tasks`, {
      method: 'POST',
      token: founderToken,
      body: {
        title: 'Task 1: Build Authentication API',
        description: 'Implement JWT auth and middleware',
        priority: 'HIGH',
        status: 'TODO',
        day: 1,
        estimatedHours: 4,
        assignedTo: devAUserId,
      },
    });
    const task1 = t1Res.task || t1Res.data;
    console.log(`✓ Task 1 created: "${task1.title}" (assignedTo: ${task1.assignedTo?._id || task1.assignedTo})`);

    // Task 2 -> assigned to Dev B
    const t2Res = await apiRequest(`/startups/${startupId}/tasks`, {
      method: 'POST',
      token: founderToken,
      body: {
        title: 'Task 2: Design Landing Page UI',
        description: 'Build responsive landing components',
        priority: 'MEDIUM',
        status: 'TODO',
        day: 2,
        estimatedHours: 6,
        assignedTo: devBUserId,
      },
    });
    const task2 = t2Res.task || t2Res.data;
    console.log(`✓ Task 2 created: "${task2.title}" (assignedTo: ${task2.assignedTo?._id || task2.assignedTo})`);

    // Task 3 -> Unassigned
    const t3Res = await apiRequest(`/startups/${startupId}/tasks`, {
      method: 'POST',
      token: founderToken,
      body: {
        title: 'Task 3: Setup CI/CD Deployment',
        description: 'Configure automated pipeline',
        priority: 'LOW',
        status: 'TODO',
        day: 3,
        estimatedHours: 3,
        assignedTo: null,
      },
    });
    const task3 = t3Res.task || t3Res.data;
    console.log(`✓ Task 3 created: "${task3.title}" (assignedTo: ${task3.assignedTo || 'Unassigned'})`);

    // 7. Test Founder Kanban view
    console.log('\n7. Testing Founder Kanban view (GET /api/startups/:startupId/tasks)...');
    const founderTasksRes = await apiRequest(`/startups/${startupId}/tasks`, {
      token: founderToken,
    });
    const founderTasks = founderTasksRes.tasks || founderTasksRes.data || [];
    console.log(`✓ Founder sees ${founderTasks.length} tasks (expected: 3)`);
    if (founderTasks.length !== 3) {
      throw new Error(`Founder expected 3 tasks, received ${founderTasks.length}`);
    }

    // 8. Test Developer A Kanban view
    console.log('\n8. Testing Developer A Kanban view (GET /api/startups/:startupId/tasks)...');
    const devATasksRes = await apiRequest(`/startups/${startupId}/tasks`, {
      token: devAToken,
    });
    const devATasks = devATasksRes.tasks || devATasksRes.data || [];
    console.log(`✓ Dev A sees ${devATasks.length} tasks (expected: 1)`);
    if (devATasks.length !== 1) {
      throw new Error(`Dev A expected exactly 1 task, received ${devATasks.length}`);
    }
    const devATaskId = (devATasks[0]._id || devATasks[0].id).toString();
    const expectedT1Id = (task1._id || task1.id).toString();
    if (devATaskId !== expectedT1Id) {
      throw new Error(`Dev A received task ID ${devATaskId}, expected Task 1 (${expectedT1Id})`);
    }
    console.log(`✓ Dev A sees ONLY Task 1 ("${devATasks[0].title}")`);

    // 9. Test Developer B Kanban view
    console.log('\n9. Testing Developer B Kanban view (GET /api/startups/:startupId/tasks)...');
    const devBTasksRes = await apiRequest(`/startups/${startupId}/tasks`, {
      token: devBToken,
    });
    const devBTasks = devBTasksRes.tasks || devBTasksRes.data || [];
    console.log(`✓ Dev B sees ${devBTasks.length} tasks (expected: 1)`);
    if (devBTasks.length !== 1) {
      throw new Error(`Dev B expected exactly 1 task, received ${devBTasks.length}`);
    }
    const devBTaskId = (devBTasks[0]._id || devBTasks[0].id).toString();
    const expectedT2Id = (task2._id || task2.id).toString();
    if (devBTaskId !== expectedT2Id) {
      throw new Error(`Dev B received task ID ${devBTaskId}, expected Task 2 (${expectedT2Id})`);
    }
    console.log(`✓ Dev B sees ONLY Task 2 ("${devBTasks[0].title}")`);

    // 10. Developer A moves Task 1 from TODO to IN_PROGRESS
    console.log('\n10. Dev A moves Task 1: TODO -> IN_PROGRESS...');
    const updateT1Res = await apiRequest(`/tasks/${task1._id || task1.id}`, {
      method: 'PUT',
      token: devAToken,
      body: { status: 'IN_PROGRESS' },
    });
    const updatedT1 = updateT1Res.task || updateT1Res.data;
    console.log(`✓ Task 1 updated by Dev A. Status is now: ${updatedT1.status}`);
    if (updatedT1.status !== 'IN_PROGRESS') {
      throw new Error(`Expected status IN_PROGRESS, received ${updatedT1.status}`);
    }

    // 11. Founder Kanban confirms status changed on the SAME document
    console.log('\n11. Founder fetches Kanban to confirm Task 1 is now IN_PROGRESS on same document...');
    const founderRefreshRes = await apiRequest(`/startups/${startupId}/tasks`, {
      token: founderToken,
    });
    const founderRefreshedTasks = founderRefreshRes.tasks || founderRefreshRes.data;
    const refreshedT1 = founderRefreshedTasks.find(
      (t) => (t._id || t.id).toString() === expectedT1Id
    );
    console.log(`✓ Founder sees Task 1 status: ${refreshedT1?.status}`);
    if (refreshedT1?.status !== 'IN_PROGRESS') {
      throw new Error(`Founder expected Task 1 to be IN_PROGRESS, got ${refreshedT1?.status}`);
    }

    // 12. Security Test: Developer A attempts to update Developer B's task (Task 2)
    console.log('\n12. Testing Developer permission boundary: Dev A attempts to update Dev B Task 2...');
    try {
      await apiRequest(`/tasks/${task2._id || task2.id}`, {
        method: 'PUT',
        token: devAToken,
        body: { status: 'DONE' },
      });
      throw new Error('SECURITY VIOLATION: Dev A was able to update Dev B assigned task!');
    } catch (err) {
      if (err.status === 403) {
        console.log(`✓ Dev A rejected with 403 Forbidden when trying to update Dev B task (Expected)`);
      } else {
        throw err;
      }
    }

    // 13. Security Test: Cross-startup isolation: Dev A attempts to view Startup B tasks
    console.log('\n13. Testing Cross-Startup isolation: Dev A attempts GET /api/startups/:startupBId/tasks...');
    try {
      await apiRequest(`/startups/${startupBId}/tasks`, {
        token: devAToken,
      });
      throw new Error('SECURITY VIOLATION: Dev A was able to access Startup B tasks!');
    } catch (err) {
      if (err.status === 403) {
        console.log(`✓ Dev A rejected with 403 Forbidden when trying to access Startup B (Expected)`);
      } else {
        throw err;
      }
    }

    // 14. Founder reassigns Task 3 to Developer A
    console.log('\n14. Founder reassigns Task 3 to Developer A...');
    const reassignRes = await apiRequest(`/tasks/${task3._id || task3.id}`, {
      method: 'PUT',
      token: founderToken,
      body: { assignedTo: devAUserId },
    });
    const reassignedT3 = reassignRes.task || reassignRes.data;
    console.log(`✓ Task 3 reassigned: assignedTo = ${reassignedT3?.assignedTo?._id || reassignedT3?.assignedTo}`);

    // Dev A checks Kanban again -> should now see 2 tasks (Task 1 and Task 3)
    const devATasksAfter = await apiRequest(`/startups/${startupId}/tasks`, {
      token: devAToken,
    });
    const devATasksAfterList = devATasksAfter.tasks || devATasksAfter.data;
    console.log(`✓ Dev A now sees ${devATasksAfterList.length} tasks (Task 1 and Task 3)`);
    if (devATasksAfterList.length !== 2) {
      throw new Error(`Dev A expected 2 tasks after assignment, received ${devATasksAfterList.length}`);
    }

    // Dev B still sees only Task 2
    const devBTasksAfter = await apiRequest(`/startups/${startupId}/tasks`, {
      token: devBToken,
    });
    const devBTasksAfterList = devBTasksAfter.tasks || devBTasksAfter.data;
    console.log(`✓ Dev B still sees ${devBTasksAfterList.length} tasks (Task 2 only)`);
    if (devBTasksAfterList.length !== 1) {
      throw new Error(`Dev B expected 1 task, received ${devBTasksAfterList.length}`);
    }

    // 15. Dev A calls GET /api/tasks/my-tasks
    console.log('\n15. Dev A calls GET /api/tasks/my-tasks...');
    const myTasksRes = await apiRequest('/tasks/my-tasks', {
      token: devAToken,
    });
    console.log(`✓ Dev A personal dashboard returns ${myTasksRes.count} tasks (expected: 2)`);
    if (myTasksRes.count !== 2) {
      throw new Error(`Dev A expected 2 personal tasks, received ${myTasksRes.count}`);
    }

    console.log('\n====================================================');
    console.log('ALL DEVELOPER KANBAN TESTS PASSED PERFECTLY!');
    console.log('====================================================\n');
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message, error.data || '');
    process.exit(1);
  }
}

runDeveloperKanbanTests();
