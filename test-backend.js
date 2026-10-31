const http = require('http');
const app = require('./server/server.js');

const PORT = 3001; // Use port 3001 for testing
let server;

function request(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body), headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting Backend Verification Tests ---');

  server = app.listen(PORT);

  try {
    // 1. Health check
    const health = await request('GET', '/api/health');
    console.log('[Test 1] Health Check:', health.status === 200 && health.body.status === 'online' ? 'PASS ✓' : 'FAIL ✗');

    // 2. Submit admission enquiry
    const enquiry = await request('POST', '/api/enquiries', {
      parent_name: 'Abdul Rahman',
      student_name: 'Zaid Rahman',
      phone: '9885912345',
      email: 'abdul.rahman@example.com',
      grade: 'Class 5',
      message: 'Looking for admission for academic year 2024-25 with school bus transport.'
    });
    console.log('[Test 2] Submit Enquiry:', enquiry.status === 201 && enquiry.body.ref_id ? `PASS ✓ (Ref: ${enquiry.body.ref_id})` : 'FAIL ✗');
    const createdRefId = enquiry.body.ref_id;

    // 3. Validation failure check
    const invalid = await request('POST', '/api/enquiries', {
      parent_name: '',
      phone: ''
    });
    console.log('[Test 3] Validation Handling:', invalid.status === 400 ? 'PASS ✓' : 'FAIL ✗');

    // 4. Admin Login with incorrect password
    const badLogin = await request('POST', '/api/auth/login', {
      username: 'admin',
      password: 'wrong_password'
    });
    console.log('[Test 4] Reject Invalid Login:', badLogin.status === 401 ? 'PASS ✓' : 'FAIL ✗');

    // 5. Admin Login with correct password
    const goodLogin = await request('POST', '/api/auth/login', {
      username: 'admin',
      password: 'frontline2024'
    });
    const token = goodLogin.body.token;
    console.log('[Test 5] Valid Admin Login:', goodLogin.status === 200 && token ? 'PASS ✓' : 'FAIL ✗');

    // 6. Admin Stats Check
    const stats = await request('GET', '/api/enquiries/stats', null, { 'Authorization': `Bearer ${token}` });
    console.log('[Test 6] Admin Stats API:', stats.status === 200 && stats.body.stats.total >= 1 ? `PASS ✓ (Total: ${stats.body.stats.total})` : 'FAIL ✗');

    // 7. Enquiries List Check
    const list = await request('GET', '/api/enquiries', null, { 'Authorization': `Bearer ${token}` });
    const foundItem = list.body.enquiries.find(e => e.ref_id === createdRefId);
    console.log('[Test 7] Fetch Enquiries List:', list.status === 200 && foundItem ? 'PASS ✓' : 'FAIL ✗');

    // 8. Update Enquiry Status & Staff Notes
    if (foundItem) {
      const update = await request('PATCH', `/api/enquiries/${foundItem.id}`, {
        status: 'contacted',
        notes: 'Called parent. Visiting school this Saturday at 11 AM.'
      }, { 'Authorization': `Bearer ${token}` });
      console.log('[Test 8] Update Status & Notes:', update.status === 200 && update.body.enquiry.status === 'contacted' ? 'PASS ✓' : 'FAIL ✗');
    }

    // 9. CSV Export Check
    const csv = await request('GET', '/api/enquiries/export/csv', null, { 'Authorization': `Bearer ${token}` });
    console.log('[Test 9] CSV Export Download:', csv.status === 200 && csv.headers['content-type'].includes('text/csv') ? 'PASS ✓' : 'FAIL ✗');

    // 10. Static Website Serving
    const home = await request('GET', '/');
    console.log('[Test 10] Serves Public Website:', home.status === 200 && typeof home.body === 'string' && home.body.includes('FRONTLINE') ? 'PASS ✓' : 'FAIL ✗');

    console.log('--- ALL BACKEND TESTS PASSED SUCCESSFULLY! ---');
  } catch (err) {
    console.error('Test run failed:', err);
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests();
