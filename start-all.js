#!/usr/bin/env node
/**
 * Vectabase Unified Startup Script
 * 
 * Starts all services together:
 * - Website (Vite dev server on port 8081)
 * - Obfuscator API (Python Flask on port 5050)
 * - Discord Bot (whitelist service)
 * 
 * Usage: node start-all.js
 * Or: npm run start:all
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(service, message, color = colors.reset) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${color}[${timestamp}] [${service}]${colors.reset} ${message}`);
}

// Track running processes
const processes = [];

function startProcess(name, command, args, cwd, color) {
  log(name, `Starting: ${command} ${args.join(' ')}`, color);
  
  const proc = spawn(command, args, {
    cwd: cwd,
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '1' }
  });
  
  proc.stdout?.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      if (line.trim()) log(name, line, color);
    });
  });
  
  proc.stderr?.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      if (line.trim()) log(name, line, colors.red);
    });
  });
  
  proc.on('error', (err) => {
    log(name, `Error: ${err.message}`, colors.red);
  });
  
  proc.on('exit', (code) => {
    log(name, `Exited with code ${code}`, code === 0 ? color : colors.red);
  });
  
  processes.push({ name, proc });
  return proc;
}

// Cleanup on exit
function cleanup() {
  log('MAIN', 'Shutting down all services...', colors.yellow);
  processes.forEach(({ name, proc }) => {
    log('MAIN', `Stopping ${name}...`, colors.yellow);
    proc.kill('SIGTERM');
  });
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Main startup
async function main() {
  console.log('\n');
  console.log(colors.green + '═'.repeat(50) + colors.reset);
  console.log(colors.green + '  VECTABASE - Starting All Services' + colors.reset);
  console.log(colors.green + '═'.repeat(50) + colors.reset);
  console.log('\n');

  const rootDir = __dirname;
  const obfuscatorDir = path.join(rootDir, 'whitelsiting service', 'new_obfuscator');
  const botDir = path.join(rootDir, 'whitelsiting service');

  // 1. Start Obfuscator API (Python)
  if (fs.existsSync(path.join(obfuscatorDir, 'obfuscator_api.py'))) {
    log('MAIN', 'Starting Obfuscator API...', colors.cyan);
    startProcess(
      'OBFUSCATOR',
      'python',
      ['obfuscator_api.py'],
      obfuscatorDir,
      colors.cyan
    );
  } else {
    log('MAIN', 'Obfuscator API not found, skipping...', colors.yellow);
  }

  // 2. Start Discord Bot (Node.js)
  const botIndexFile = path.join(botDir, 'src', 'index.js');
  
  if (fs.existsSync(botIndexFile)) {
    log('MAIN', 'Starting Discord Bot (Node.js)...', colors.magenta);
    // Wait a bit for obfuscator to start first
    await new Promise(r => setTimeout(r, 1000));
    startProcess(
      'DISCORD-BOT',
      'node',
      ['src/index.js'],
      botDir,
      colors.magenta
    );
  } else {
    log('MAIN', 'Discord bot not found at ' + botIndexFile + ', skipping...', colors.yellow);
  }

  // 3. Start Website (Vite)
  log('MAIN', 'Starting Website...', colors.green);
  await new Promise(r => setTimeout(r, 500));
  startProcess(
    'WEBSITE',
    'npm',
    ['run', 'dev'],
    rootDir,
    colors.green
  );

  console.log('\n');
  console.log(colors.green + '═'.repeat(50) + colors.reset);
  console.log(colors.green + '  All services started!' + colors.reset);
  console.log(colors.green + '═'.repeat(50) + colors.reset);
  console.log('\n');
  console.log(`  ${colors.green}Website:${colors.reset}      http://localhost:8081`);
  console.log(`  ${colors.cyan}Obfuscator:${colors.reset}   http://localhost:5050`);
  console.log(`  ${colors.magenta}Discord Bot:${colors.reset}  Running in background`);
  console.log('\n');
  console.log(`  Press ${colors.yellow}Ctrl+C${colors.reset} to stop all services`);
  console.log('\n');
}

main().catch(err => {
  console.error('Startup error:', err);
  process.exit(1);
});
