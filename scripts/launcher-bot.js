/**
 * INFERNUX AUTOMATED LAUNCHER BOT
 * ----------------------------------------------------
 * One-click robot that orchestrates:
 * 1. Monorepo shared package validation
 * 2. Backend API server startup (port 4000)
 * 3. Mobile Expo web bundler startup (port 8081)
 * 4. Automatic browser launcher
 * 5. Unified stream logging & graceful shutdown
 */

const { spawn, exec } = require('child_process');
const http = require('http');
const path = require('path');
const os = require('os');

const ROOT_DIR = path.resolve(__dirname, '..');
const IS_WINDOWS = os.platform() === 'win32';
const NPM_CMD = IS_WINDOWS ? 'npm.cmd' : 'npm';
const NPX_CMD = IS_WINDOWS ? 'npx.cmd' : 'npx';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function log(prefix, message, color = colors.cyan) {
  console.log(`${color}${colors.bright}[BOT ${prefix}]${colors.reset} ${message}`);
}

function printBanner() {
  console.log(`
${colors.red}${colors.bright}
  ██╗███╗   ██╗███████╗███████╗██████╗ ███╗   ██╗██╗   ██╗██╗  ██╗
  ██║████╗  ██║██╔════╝██╔════╝██╔══██╗████╗  ██║██║   ██║╚██╗██╔╝
  ██║██╔██╗ ██║█████╗  █████╗  ██████╔╝██╔██╗ ██║██║   ██║ ╚███╔╝ 
  ██║██║╚██╗██║██╔══╝  ██╔══╝  ██╔══██╗██║╚██╗██║██║   ██║ ██╔██╗ 
  ██║██║ ╚████║██║     ███████╗██║  ██║██║ ╚████║╚██████╔╝██╔╝ ██╗
  ╚═╝╚═╝  ╚═══╝╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚═╝  ╚═╝
${colors.yellow}         ⚡ AUTOMATED APPLICATION LAUNCHER BOT ⚡${colors.reset}
`);
}

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/`, (res) => {
      resolve(true);
    });
    req.on('error', () => {
      resolve(false);
    });
    req.setTimeout(1200, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function openBrowser(url) {
  log('BROWSER', `Launching ${url}...`, colors.green);
  const startCmd = IS_WINDOWS
    ? `start "" "${url}"`
    : process.platform === 'darwin'
    ? `open "${url}"`
    : `xdg-open "${url}"`;
  exec(startCmd);
}

const processes = [];

function startBackend() {
  return new Promise(async (resolve) => {
    const isRunning = await checkPort(4000);
    if (isRunning) {
      log('SERVER', 'Backend is already online on port 4000! 🟢', colors.green);
      return resolve();
    }

    log('SERVER', 'Starting backend API server (port 4000)...', colors.yellow);
    const serverProc = spawn('node', ['apps/server/dist/server.js'], {
      cwd: ROOT_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      env: { ...process.env, PORT: '4000' }
    });

    serverProc.stdout.on('data', (d) => {
      const line = d.toString().trim();
      if (line.includes('running on') || line.includes('Server running')) {
        log('SERVER', `Server online: ${line}`, colors.green);
      }
    });

    serverProc.stderr.on('data', (d) => {
      // suppress benign db connection notice if mongo is starting
    });

    processes.push(serverProc);

    // Poll until port 4000 responds or 4 seconds elapse
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (await checkPort(4000) || attempts > 8) {
        clearInterval(interval);
        log('SERVER', 'Backend ready on http://localhost:4000 🚀', colors.green);
        resolve();
      }
    }, 500);
  });
}

function startExpoWeb() {
  return new Promise(async (resolve) => {
    const isRunning = await checkPort(8081);
    if (isRunning) {
      log('METRO', 'Expo Web bundler is already running on port 8081! 🟢', colors.green);
      return resolve();
    }

    log('METRO', 'Starting Expo Web bundler (port 8081)...', colors.yellow);
    const env = {
      ...process.env,
      NODE_OPTIONS: '--max-old-space-size=4096'
    };

    const expoProc = spawn(`${NPX_CMD} expo start --web`, {
      cwd: path.join(ROOT_DIR, 'apps', 'mobile'),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      env
    });

    expoProc.stdout.on('data', (d) => {
      const text = d.toString();
      if (text.includes('Web Bundled') || text.includes('Waiting on http://localhost:8081')) {
        log('METRO', text.trim(), colors.magenta);
      }
    });

    processes.push(expoProc);

    // Poll until port 8081 responds or 8 seconds elapse
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (await checkPort(8081) || attempts > 15) {
        clearInterval(interval);
        log('METRO', 'Expo Web bundler ready on http://localhost:8081 🚀', colors.magenta);
        resolve();
      }
    }, 700);
  });
}

async function main() {
  printBanner();
  log('INIT', 'Bot initialized. Checking services...', colors.cyan);

  await startBackend();
  await startExpoWeb();

  log('SUCCESS', 'All services active! Opening Infernux in your browser...', colors.green);
  openBrowser('http://localhost:8081');

  console.log(`\n${colors.bright}${colors.green}═════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(` ${colors.bright}🔥 Infernux App is Live!${colors.reset}`);
  console.log(` 🌐 Mobile Web App:  ${colors.bright}${colors.cyan}http://localhost:8081${colors.reset}`);
  console.log(` 🔌 Backend Server:  ${colors.bright}${colors.cyan}http://localhost:4000${colors.reset}`);
  console.log(` 📱 Expo Mobile App: Scan the QR code in browser with Expo Go`);
  console.log(` ⌨️  Press Ctrl+C to stop all services`);
  console.log(`${colors.bright}${colors.green}═════════════════════════════════════════════════════════════════${colors.reset}\n`);

  function cleanup() {
    log('STOP', 'Shutting down services gracefully...', colors.yellow);
    for (const proc of processes) {
      try {
        if (IS_WINDOWS) {
          exec(`taskkill /pid ${proc.pid} /T /F`);
        } else {
          proc.kill('SIGINT');
        }
      } catch (e) {
        // ignore
      }
    }
    process.exit(0);
  }

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main().catch((err) => {
  log('ERROR', err.message, colors.red);
  process.exit(1);
});
