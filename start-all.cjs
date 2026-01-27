#!/usr/bin/env node
/**
 * Vectabase Unified Startup Script (CommonJS)
 * Optimized for VPS Production
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

    processes.push({ name, proc });
    return proc;
}

function cleanup() {
    log('MAIN', 'Shutting down all services...', colors.yellow);
    processes.forEach(({ name, proc }) => {
        proc.kill('SIGTERM');
    });
    process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

async function main() {
    const rootDir = __dirname;

    // 1. Start Website (Vite)
    // Inside the root workspace
    log('MAIN', 'Starting Website (Dashboard)...', colors.green);
    startProcess(
        'WEBSITE',
        'npm',
        ['run', 'dev'], // Port 8081 usually
        rootDir,
        colors.green
    );

    // 2. Start Backend API (Next.js or similar)
    // Assuming database/event-horizon-ui is the API
    const apiDir = path.join(rootDir, 'database', 'event-horizon-ui');
    if (fs.existsSync(apiDir)) {
        log('MAIN', 'Starting Backend API...', colors.cyan);
        startProcess(
            'API',
            'npm',
            ['run', 'start'], // Port 3000
            apiDir,
            colors.cyan
        );
    }
}

main().catch(err => {
    console.error('Startup error:', err);
    process.exit(1);
});
