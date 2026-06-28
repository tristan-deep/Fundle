#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.dirname(path.dirname(__filename));
const webDir = path.join(root, 'apps', 'web');

// Gameplay is fully client-side now (Supabase + local engine). Dev only needs
// the Next.js app; the daily puzzle is built separately via build_daily_puzzle.py.
const webModules = path.join(webDir, 'node_modules');
if (!fs.existsSync(webModules)) {
  console.error('\x1b[31m%s\x1b[0m', 'Setup not complete. Run: npm run setup');
  process.exit(1);
}

const webProc = spawn('npm', ['run', 'dev'], {
  cwd: webDir,
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

const cleanup = () => {
  webProc.kill();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
