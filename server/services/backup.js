/**
 * Database Backup Service
 * Handles automated backups with encryption and retention
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const execAsync = promisify(exec);

const BACKUP_DIR = process.env.BACKUP_DIR || './backups';
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);

/**
 * Create a database backup
 * @param {Object} options - Backup options
 * @returns {Object} Backup result with file path
 */
export async function createBackup(options = {}) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `vectabase-backup-${timestamp}`;
  
  // Ensure backup directory exists
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  
  const dumpFile = path.join(BACKUP_DIR, `${backupName}.sql`);
  const encryptedFile = path.join(BACKUP_DIR, `${backupName}.sql.enc`);
  
  try {
    // Create pg_dump command
    const pgDumpCmd = buildPgDumpCommand(dumpFile);
    
    console.log(`Creating backup: ${backupName}`);
    await execAsync(pgDumpCmd);
    
    // Verify dump file exists and has content
    const stats = await fs.stat(dumpFile);
    if (stats.size === 0) {
      throw new Error('Backup file is empty');
    }
    
    // Encrypt the backup
    if (process.env.DB_ENCRYPTION_KEY) {
      await encryptFile(dumpFile, encryptedFile);
      await fs.unlink(dumpFile); // Remove unencrypted file
      
      console.log(`Backup encrypted: ${encryptedFile}`);
      
      return {
        success: true,
        file: encryptedFile,
        size: (await fs.stat(encryptedFile)).size,
        encrypted: true,
        timestamp: new Date().toISOString()
      };
    }
    
    return {
      success: true,
      file: dumpFile,
      size: stats.size,
      encrypted: false,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Backup failed:', error.message);
    
    // Cleanup partial files
    try {
      await fs.unlink(dumpFile).catch(() => {});
      await fs.unlink(encryptedFile).catch(() => {});
    } catch {}
    
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Restore a database backup
 * @param {string} backupFile - Path to backup file
 * @returns {Object} Restore result
 */
export async function restoreBackup(backupFile) {
  try {
    let sqlFile = backupFile;
    let tempFile = null;
    
    // Decrypt if encrypted
    if (backupFile.endsWith('.enc')) {
      tempFile = backupFile.replace('.enc', '.tmp');
      await decryptFile(backupFile, tempFile);
      sqlFile = tempFile;
    }
    
    // Build psql restore command
    const restoreCmd = buildPsqlCommand(sqlFile);
    
    console.log(`Restoring backup: ${backupFile}`);
    await execAsync(restoreCmd);
    
    // Cleanup temp file
    if (tempFile) {
      await fs.unlink(tempFile).catch(() => {});
    }
    
    return {
      success: true,
      file: backupFile,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Restore failed:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * List available backups
 * @returns {Array} List of backup files with metadata
 */
export async function listBackups() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    
    const files = await fs.readdir(BACKUP_DIR);
    const backups = [];
    
    for (const file of files) {
      if (file.startsWith('vectabase-backup-')) {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = await fs.stat(filePath);
        
        backups.push({
          name: file,
          path: filePath,
          size: stats.size,
          created: stats.birthtime,
          encrypted: file.endsWith('.enc')
        });
      }
    }
    
    // Sort by date, newest first
    backups.sort((a, b) => b.created - a.created);
    
    return backups;
    
  } catch (error) {
    console.error('List backups failed:', error.message);
    return [];
  }
}

/**
 * Clean up old backups based on retention policy
 * @returns {Object} Cleanup result
 */
export async function cleanupOldBackups() {
  try {
    const backups = await listBackups();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    
    const deleted = [];
    
    for (const backup of backups) {
      if (backup.created < cutoffDate) {
        await fs.unlink(backup.path);
        deleted.push(backup.name);
        console.log(`Deleted old backup: ${backup.name}`);
      }
    }
    
    return {
      success: true,
      deleted,
      retentionDays: RETENTION_DAYS
    };
    
  } catch (error) {
    console.error('Cleanup failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verify backup integrity
 * @param {string} backupFile - Path to backup file
 * @returns {Object} Verification result
 */
export async function verifyBackup(backupFile) {
  try {
    const stats = await fs.stat(backupFile);
    
    if (stats.size === 0) {
      return { valid: false, error: 'Backup file is empty' };
    }
    
    // For encrypted files, try to decrypt header
    if (backupFile.endsWith('.enc')) {
      const content = await fs.readFile(backupFile);
      if (content.length < 32) {
        return { valid: false, error: 'Encrypted file too small' };
      }
      
      // Verify we can read the IV and auth tag
      const iv = content.slice(0, 16);
      const authTag = content.slice(16, 32);
      
      if (iv.length !== 16 || authTag.length !== 16) {
        return { valid: false, error: 'Invalid encryption header' };
      }
    } else {
      // For SQL files, check for PostgreSQL dump header
      const content = await fs.readFile(backupFile, 'utf8');
      const firstLine = content.split('\n')[0];
      
      if (!firstLine.includes('PostgreSQL') && !firstLine.startsWith('--')) {
        return { valid: false, error: 'Not a valid PostgreSQL dump' };
      }
    }
    
    return {
      valid: true,
      size: stats.size,
      created: stats.birthtime
    };
    
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

// ==================== HELPER FUNCTIONS ====================

function buildPgDumpCommand(outputFile) {
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const database = process.env.DB_NAME || 'vectabase';
  const user = process.env.DB_USER || 'vectabase_admin';
  
  // Set PGPASSWORD environment variable for authentication
  const env = `set PGPASSWORD=${process.env.DB_PASSWORD} &&`;
  
  return `${env} pg_dump -h ${host} -p ${port} -U ${user} -d ${database} -F p -f "${outputFile}"`;
}

function buildPsqlCommand(inputFile) {
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const database = process.env.DB_NAME || 'vectabase';
  const user = process.env.DB_USER || 'vectabase_admin';
  
  const env = `set PGPASSWORD=${process.env.DB_PASSWORD} &&`;
  
  return `${env} psql -h ${host} -p ${port} -U ${user} -d ${database} -f "${inputFile}"`;
}

async function encryptFile(inputPath, outputPath) {
  const key = Buffer.from(process.env.DB_ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(16);
  
  const content = await fs.readFile(inputPath);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  const encrypted = Buffer.concat([cipher.update(content), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  // Format: IV (16 bytes) + AuthTag (16 bytes) + Encrypted data
  const output = Buffer.concat([iv, authTag, encrypted]);
  await fs.writeFile(outputPath, output);
}

async function decryptFile(inputPath, outputPath) {
  const key = Buffer.from(process.env.DB_ENCRYPTION_KEY, 'hex');
  const content = await fs.readFile(inputPath);
  
  const iv = content.slice(0, 16);
  const authTag = content.slice(16, 32);
  const encrypted = content.slice(32);
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  await fs.writeFile(outputPath, decrypted);
}

export default {
  createBackup,
  restoreBackup,
  listBackups,
  cleanupOldBackups,
  verifyBackup
};
