#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const command = args[0];
const subCommand = args[1];

// Absolute paths for global reliability
const scriptsDir = __dirname;
const rootDir = path.resolve(scriptsDir, '..');
const tsxPath = path.join(rootDir, 'node_modules', '.bin', 'tsx');

function runScript(scriptName, passthroughArgs) {
    const scriptPath = path.join(scriptsDir, scriptName);
    try {
        // Use the local tsx binary directly to avoid npx recursion mess
        // Wrap command in quotes for Windows compatibility
        const cmd = `"${process.execPath}" "${tsxPath}" "${scriptPath}" ${passthroughArgs.map(a => `"${a}"`).join(' ')}`;

        execSync(cmd, {
            stdio: 'inherit',
            env: { ...process.env, VECTABASE_CLI: 'true' },
            cwd: process.cwd()
        });
    } catch (e) {
        process.exit(1);
    }
}

const showHelp = () => {
    console.log(`
Vectabase CLI 🧬
The high-performance interface for your quantum database.

Usage:
  npx vectabase [command] [subcommand] [args]

Commands:
  functions deploy <projectId> <name> <file>    Deploy serverless logic to the edge
  db deploy <projectId> <file>                  Synchronize your schema and migrations
  vault set <projectId> <key> <value>           Securely store encrypted secrets
  
Example:
  npx vectabase functions deploy 5 "Search Engine" ./functions/search.ts
    `);
};

if (!command || command === 'help') {
    showHelp();
    process.exit(0);
}

switch (command) {
    case 'functions':
        if (subCommand === 'deploy') {
            runScript('vectabase_deploy.ts', args.slice(2));
        } else {
            showHelp();
        }
        break;
    case 'db':
        if (subCommand === 'deploy') {
            console.log("🚀 Initializing schema sync...");
            runScript('setup_test_db.ts', args.slice(2));
        } else {
            showHelp();
        }
        break;
    case 'vault':
        if (subCommand === 'set') {
            runScript('vectabase_vault.ts', args.slice(2));
        } else {
            showHelp();
        }
        break;
    default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
}
