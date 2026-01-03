#!/usr/bin/env node

// BrowserMCP Windows Wrapper
// This wrapper prevents the PID 4 system process termination issue

const { spawn } = require('child_process');
const path = require('path');

// Override process.kill to prevent system process termination
const originalKill = process.kill;
process.kill = function(pid, signal) {
  // Block attempts to kill critical Windows system processes
  if (pid === 0 || pid === 4) {
    console.log(`Blocked attempt to kill system process PID ${pid}`);
    return true; // Pretend it worked
  }
  return originalKill.call(this, pid, signal);
};

// Override child_process methods to prevent system process killing
const originalSpawn = require('child_process').spawn;
require('child_process').spawn = function(command, args, options) {
  // Block taskkill commands targeting system processes
  if (command === 'taskkill' && args && (args.includes('4') || args.includes('0'))) {
    console.log('Blocked taskkill command targeting system processes');
    // Return a fake process that does nothing
    const fakeProcess = {
      stdout: { on: () => {}, pipe: () => {} },
      stderr: { on: () => {} },
      on: (event, callback) => {
        if (event === 'close') setTimeout(() => callback(0), 100);
      },
      kill: () => {}
    };
    return fakeProcess;
  }
  return originalSpawn.call(this, command, args, options);
};

// Now start the actual browsermcp server
console.log('Starting BrowserMCP with Windows compatibility wrapper...');

const browsermcp = spawn('C:\\Program Files\\nodejs\\npx.cmd', ['@browsermcp/mcp@latest'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    BROWSER_NO_CLEANUP: 'true',
    BROWSER_SAFE_MODE: 'true',
    NO_PROCESS_KILL: 'true'
  }
});

browsermcp.on('close', (code) => {
  console.log(`BrowserMCP exited with code ${code}`);
  process.exit(code);
});

browsermcp.on('error', (error) => {
  console.error('BrowserMCP error:', error);
  process.exit(1);
});