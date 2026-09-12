const http = require('http');

function checkEndpoint(url, label) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        console.log(`[${label}] Status: ${res.statusCode}`);
        if (data.length < 200) {
          console.log(`[${label}] Response:`, data);
        } else {
          console.log(`[${label}] Response length: ${data.length} bytes`);
        }
        resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 400 });
      });
    }).on('error', (err) => {
      console.error(`[${label}] Connection error:`, err.message);
      resolve({ status: 0, ok: false, error: err.message });
    });
  });
}

async function main() {
  console.log('--- Checking Site Health ---');
  const backend = await checkEndpoint('http://localhost:5000/api/health', 'Backend Health');
  const frontend = await checkEndpoint('http://localhost:5173/', 'Frontend Dev Server');
  
  if (backend.ok && frontend.ok) {
    console.log('\n✓ Both Backend (5000) and Frontend (5173) are LIVE and responding normally!');
  } else {
    console.error('\n❌ Health check failed.');
    process.exit(1);
  }
}

main();
