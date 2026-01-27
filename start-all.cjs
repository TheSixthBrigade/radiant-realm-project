#!/usr/bin/env node
/**
 * Vectabase Unified Startup Script (CommonJS)
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
    const botDir = path.join(rootDir, 'whitelisting_service'); // Fixed path (underscore, no typo)

    // 1. Start Discord Bot (Node.js)
    const botIndexFile = path.join(botDir, 'src', 'index.js');

    if (fs.existsSync(botIndexFile)) {
        log('MAIN', 'Starting Discord Bot (Node.js)...', colors.magenta);
        startProcess(
            'DISCORD-BOT',
            'node',
            ['--experimental-specifier-resolution=node', 'src/index.js'],
            botDir,
            colors.magenta
        );
    } else {
        log('MAIN', 'Discord bot not found at ' + botIndexFile + ', skipping...', colors.yellow);
    }

    // 2. Start Website (Vite)
    log('MAIN', 'Starting Website...', colors.green);
    startProcess(
        'WEBSITE',
        'npm',
        ['run', 'dev'],
        rootDir,
        colors.green
    );
}

main().catch(err => {
    console.error('Startup error:', err);
    process.exit(1);
});
