/**
 * Database Backup Script
 * Creates encrypted backups and manages retention
 */

import dotenv from 'dotenv';
import { createBackup, listBackups, cleanupOldBackups, verifyBackup } from '../server/services/backup.js';

dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'create';
  
  console.log('🗄️  Vectabase Database Backup Tool\n');
  
  switch (command) {
    case 'create':
      await runBackup();
      break;
      
    case 'list':
      await runList();
      break;
      
    case 'cleanup':
      await runCleanup();
      break;
      
    case 'verify':
      if (!args[1]) {
        console.error('Usage: node backup-database.js verify <backup-file>');
        process.exit(1);
      }
      await runVerify(args[1]);
      break;
      
    default:
      console.log('Usage: node backup-database.js [command]');
      console.log('');
      console.log('Commands:');
      console.log('  create   - Create a new backup (default)');
      console.log('  list     - List all backups');
      console.log('  cleanup  - Remove old backups based on retention policy');
      console.log('  verify   - Verify a backup file integrity');
  }
}

async function runBackup() {
  console.log('Creating database backup...\n');
  
  const result = await createBackup();
  
  if (result.success) {
    console.log('✅ Backup created successfully!');
    console.log(`   File: ${result.file}`);
    console.log(`   Size: ${formatBytes(result.size)}`);
    console.log(`   Encrypted: ${result.encrypted ? 'Yes' : 'No'}`);
  } else {
    console.error('❌ Backup failed:', result.error);
    process.exit(1);
  }
}

async function runList() {
  console.log('Available backups:\n');
  
  const backups = await listBackups();
  
  if (backups.length === 0) {
    console.log('No backups found.');
    return;
  }
  
  for (const backup of backups) {
    const age = Math.floor((Date.now() - backup.created) / (1000 * 60 * 60 * 24));
    console.log(`📦 ${backup.name}`);
    console.log(`   Size: ${formatBytes(backup.size)}`);
    console.log(`   Created: ${backup.created.toISOString()} (${age} days ago)`);
    console.log(`   Encrypted: ${backup.encrypted ? 'Yes' : 'No'}`);
    console.log('');
  }
  
  console.log(`Total: ${backups.length} backup(s)`);
}

async function runCleanup() {
  console.log('Cleaning up old backups...\n');
  
  const result = await cleanupOldBackups();
  
  if (result.success) {
    if (result.deleted.length > 0) {
      console.log(`✅ Deleted ${result.deleted.length} old backup(s):`);
      result.deleted.forEach(f => console.log(`   - ${f}`));
    } else {
      console.log('✅ No old backups to delete.');
    }
    console.log(`\nRetention policy: ${result.retentionDays} days`);
  } else {
    console.error('❌ Cleanup failed:', result.error);
    process.exit(1);
  }
}

async function runVerify(backupFile) {
  console.log(`Verifying backup: ${backupFile}\n`);
  
  const result = await verifyBackup(backupFile);
  
  if (result.valid) {
    console.log('✅ Backup is valid!');
    console.log(`   Size: ${formatBytes(result.size)}`);
    console.log(`   Created: ${result.created.toISOString()}`);
  } else {
    console.error('❌ Backup verification failed:', result.error);
    process.exit(1);
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

main().catch(console.error);
