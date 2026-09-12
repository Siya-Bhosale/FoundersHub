const http = require('http');

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

async function runDevTests() {
  const ts = Date.now();
  console.log('=== PHASE 5 STEP 1: DEVELOPER PROFILE BACKEND TESTS ===\n');

  // 1. Setup Users
  console.log('1. Setting up accounts (Developer, Founder, Investor)...');
  const devReg = await request('http://localhost:5000/api/auth/register', { method: 'POST' }, {
    name: 'Alex Rivera',
    email: 'dev_alex_' + ts + '@test.com',
    password: 'Password123!',
    role: 'DEVELOPER',
  });
  const devLogin = await request('http://localhost:5000/api/auth/login', { method: 'POST' }, {
    email: 'dev_alex_' + ts + '@test.com',
    password: 'Password123!',
  });
  const devToken = devLogin.data.token;

  const founderReg = await request('http://localhost:5000/api/auth/register', { method: 'POST' }, {
    name: 'Sarah Founder',
    email: 'founder_sarah_' + ts + '@test.com',
    password: 'Password123!',
    role: 'FOUNDER',
  });
  const founderLogin = await request('http://localhost:5000/api/auth/login', { method: 'POST' }, {
    email: 'founder_sarah_' + ts + '@test.com',
    password: 'Password123!',
  });
  const founderToken = founderLogin.data.token;

  const invReg = await request('http://localhost:5000/api/auth/register', { method: 'POST' }, {
    name: 'Irene Investor',
    email: 'inv_irene_' + ts + '@test.com',
    password: 'Password123!',
    role: 'INVESTOR',
  });
  const invLogin = await request('http://localhost:5000/api/auth/login', { method: 'POST' }, {
    email: 'inv_irene_' + ts + '@test.com',
    password: 'Password123!',
  });
  const invToken = invLogin.data.token;
  console.log('✓ Accounts created successfully.\n');

  // 2. Unauthenticated check (expect 401)
  console.log('2. Testing unauthenticated profile request (expect 401)...');
  const unauthRes = await request('http://localhost:5000/api/developers/profile', { method: 'GET' });
  console.log('Status:', unauthRes.status);
  if (unauthRes.status !== 401) throw new Error('Unauthenticated request should be 401');
  console.log('✓ 401 returned for unauthenticated request.\n');

  // 3. Role protection: Founder & Investor attempting to create profile (expect 403)
  console.log('3. Testing Founder and Investor role guards (expect 403)...');
  const founderCreate = await request('http://localhost:5000/api/developers/profile', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + founderToken },
  }, { bio: 'Founder trying dev profile' });
  console.log('Founder POST status (expect 403):', founderCreate.status);
  if (founderCreate.status !== 403) throw new Error('Founder should receive 403');

  const invCreate = await request('http://localhost:5000/api/developers/profile', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + invToken },
  }, { bio: 'Investor trying dev profile' });
  console.log('Investor POST status (expect 403):', invCreate.status);
  if (invCreate.status !== 403) throw new Error('Investor should receive 403');
  console.log('✓ Role guards verified.\n');

  // 4. Initial GET own profile before creation (expect 404)
  console.log('4. Initial GET own profile before creation (expect 404)...');
  const preGet = await request('http://localhost:5000/api/developers/profile', {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + devToken },
  });
  console.log('Pre-creation GET status:', preGet.status, preGet.data.message);
  if (preGet.status !== 404) throw new Error('Expected 404 before profile is created');
  console.log('✓ 404 verified for empty profile.\n');

  // 5. Validation check: Invalid availability enum
  console.log('5. Testing invalid availability validation...');
  const invalidAvailRes = await request('http://localhost:5000/api/developers/profile', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + devToken },
  }, {
    bio: 'Fullstack engineer',
    availability: 'MAYBE_LATER',
  });
  console.log('Invalid availability status (expect 400):', invalidAvailRes.status);
  if (invalidAvailRes.status !== 400) throw new Error('Expected 400 for invalid availability');
  console.log('✓ Invalid availability rejected with 400.\n');

  // 6. Developer creates profile successfully
  console.log('6. Developer creates profile (POST /api/developers/profile)...');
  const createRes = await request('http://localhost:5000/api/developers/profile', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + devToken },
  }, {
    bio: 'Fullstack developer specializing in React, Node.js, and AI workflows.',
    skills: ['React', 'Node.js', 'TypeScript', 'MongoDB', 'Tailwind CSS'],
    experience: '3-5 years building production SaaS',
    github: 'https://github.com/alexrivera',
    linkedin: 'https://linkedin.com/in/alexrivera',
    portfolio: 'https://alexrivera.dev',
    availability: 'AVAILABLE',
  });
  console.log('Create profile status:', createRes.status);
  console.log('Created bio:', createRes.data.data?.bio);
  console.log('Created skills count:', createRes.data.data?.skills?.length);
  console.log('User name in response:', createRes.data.data?.user?.name);
  const profileId = createRes.data.data?.id;
  if (createRes.status !== 201) throw new Error('Failed to create profile');
  console.log('✓ Profile created successfully.\n');

  // 7. Prevent duplicate profile creation (expect 400)
  console.log('7. Testing duplicate profile creation rejection...');
  const dupRes = await request('http://localhost:5000/api/developers/profile', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + devToken },
  }, { bio: 'Duplicate attempt' });
  console.log('Duplicate status (expect 400):', dupRes.status, dupRes.data.message);
  if (dupRes.status !== 400) throw new Error('Duplicate profile creation should be rejected with 400');
  console.log('✓ Duplicate profile rejected.\n');

  // 8. GET own profile (GET /api/developers/profile)
  console.log('8. Developer retrieves own profile (GET /api/developers/profile)...');
  const getRes = await request('http://localhost:5000/api/developers/profile', {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + devToken },
  });
  console.log('Get profile status:', getRes.status);
  console.log('Retrieved skills:', getRes.data.data?.skills);
  console.log('Retrieved availability:', getRes.data.data?.availability);
  if (getRes.status !== 200) throw new Error('Failed to get profile');
  console.log('✓ Profile retrieved successfully.\n');

  // 9. Update profile (PUT /api/developers/profile)
  console.log('9. Developer updates own profile (PUT /api/developers/profile)...');
  const updateRes = await request('http://localhost:5000/api/developers/profile', {
    method: 'PUT',
    headers: { Authorization: 'Bearer ' + devToken },
  }, {
    skills: ['React', 'Node.js', 'TypeScript', 'MongoDB', 'Tailwind CSS', 'GraphQL'],
    availability: 'PART_TIME',
  });
  console.log('Update status:', updateRes.status);
  console.log('Updated skills count:', updateRes.data.data?.skills?.length);
  console.log('Updated availability:', updateRes.data.data?.availability);
  if (updateRes.status !== 200 || updateRes.data.data?.availability !== 'PART_TIME') {
    throw new Error('Update profile failed');
  }
  console.log('✓ Profile updated successfully.\n');

  // 10. Public view of developer profile (GET /api/developers/:id)
  console.log('10. Public view of developer profile by Founder...');
  const publicRes = await request('http://localhost:5000/api/developers/' + profileId, {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + founderToken },
  });
  console.log('Public profile status:', publicRes.status);
  console.log('Public profile dev name:', publicRes.data.data?.user?.name);
  if (publicRes.status !== 200) throw new Error('Failed to view public profile');
  console.log('✓ Public profile access verified.\n');

  // 11. Security Check: ensure passwordHash is never leaked
  console.log('11. Security Check: Verifying passwordHash is never exposed in any payload...');
  const combinedPayloads = JSON.stringify(createRes) + JSON.stringify(getRes) + JSON.stringify(updateRes) + JSON.stringify(publicRes);
  if (combinedPayloads.includes('passwordHash') || combinedPayloads.includes('Password123!')) {
    throw new Error('SECURITY VIOLATION: passwordHash or raw password detected in response!');
  }
  console.log('✓ Security verified: Zero password secrets exposed.\n');

  // 12. Delete profile (DELETE /api/developers/profile)
  console.log('12. Developer deletes profile...');
  const delRes = await request('http://localhost:5000/api/developers/profile', {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + devToken },
  });
  console.log('Delete status:', delRes.status, delRes.data.message);
  if (delRes.status !== 200) throw new Error('Failed to delete profile');

  const afterDelGet = await request('http://localhost:5000/api/developers/profile', {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + devToken },
  });
  console.log('GET after delete status (expect 404):', afterDelGet.status);
  if (afterDelGet.status !== 404) throw new Error('Profile should be 404 after deletion');
  console.log('✓ Profile deletion verified.\n');

  console.log('====================================================');
  console.log('>>> ALL 12 DEVELOPER PROFILE BACKEND TESTS PASSED! <<<');
  console.log('====================================================');
}

runDevTests().catch((err) => {
  console.error('Test run error:', err);
  process.exit(1);
});
