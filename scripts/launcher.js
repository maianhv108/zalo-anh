const { spawn, exec } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = 'd:\\sales-zalo-project-docs';
const LOG_FILE = path.join(PROJECT_ROOT, 'server-autostart.log');

// Bổ sung PATH hệ thống để nhận diện node, pnpm, git, postgresql
process.env.PATH =
  'C:\\Program Files\\nodejs;C:\\Users\\ASUS\\AppData\\Roaming\\npm;C:\\Program Files\\Git\\cmd;C:\\Program Files\\PostgreSQL\\16\\bin;' +
  (process.env.PATH || '');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.appendFileSync(LOG_FILE, line);
  } catch (e) {
    // ignore
  }
  console.log(msg);
}

function checkPort(port, path = '/') {
  return new Promise((resolve) => {
    const req = http.get(
      {
        hostname: '127.0.0.1',
        port: port,
        path: path,
        timeout: 2000,
      },
      (res) => {
        resolve(true);
      },
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForPort(port, maxTries = 30, interval = 1000) {
  for (let i = 0; i < maxTries; i++) {
    const isUp = await checkPort(port);
    if (isUp) return true;
    await new Promise((r) => setTimeout(r, interval));
  }
  return false;
}

async function main() {
  const shouldOpenBrowser = process.argv.includes('--open');
  log(`Starting Zalo CRM services launcher (openBrowser: ${shouldOpenBrowser})...`);

  // 1. Kiểm tra & Khởi động Backend API (Port 4000)
  const apiUp = await checkPort(4000, '/api/docs');
  if (apiUp) {
    log('Backend API is already running on port 4000.');
  } else {
    log('Starting Backend API...');
    const apiProc = spawn(
      'cmd.exe',
      ['/c', 'pnpm.cmd --filter @sales-zalo/api start:prod'],
      {
        cwd: PROJECT_ROOT,
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
        env: {
          ...process.env,
          PORT: '4000',
          NODE_ENV: 'production',
        },
      },
    );
    apiProc.unref();
  }

  // 2. Kiểm tra & Khởi động Frontend Web (Port 3000)
  const webUp = await checkPort(3000, '/');
  if (webUp) {
    log('Frontend Web is already running on port 3000.');
  } else {
    log('Starting Frontend Web...');
    const webProc = spawn(
      'cmd.exe',
      ['/c', 'pnpm.cmd --filter @sales-zalo/web start'],
      {
        cwd: PROJECT_ROOT,
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
        env: {
          ...process.env,
          PORT: '3000',
          NODE_ENV: 'production',
        },
      },
    );
    webProc.unref();
  }

  // 3. Nếu người dùng bấm mở qua icon Desktop (--open), chờ web sẵn sàng rồi bật trình duyệt
  if (shouldOpenBrowser) {
    log('Waiting for webapp to be ready before opening browser...');
    const ready = await waitForPort(3000, 20, 1000);
    if (ready) {
      log('Webapp ready! Opening browser at http://localhost:3000');
      exec('start http://localhost:3000');
    } else {
      log('Timeout waiting for webapp on port 3000, opening browser anyway...');
      exec('start http://localhost:3000');
    }
  }

  log('Launcher finished successfully.');
}

main().catch((err) => {
  log(`Error in launcher: ${err.message}`);
});
