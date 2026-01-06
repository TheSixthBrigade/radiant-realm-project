import fs from 'fs/promises';
import path from 'path';

/**
 * File Writer Utility
 * Handles writing script content to the filesystem
 */

/**
 * Ensure a directory exists, create if it doesn't
 * @param {string} dir - Directory path
 */
export async function ensureDirectory(dir) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

/**
 * Write script content to a file
 * Overwrites existing files with the same name
 * @param {string} exportDir - Base export directory
 * @param {string} filename - Filename (should be sanitized)
 * @param {string} source - Script source code
 * @returns {Promise<string>} Full path to the written file
 */
export async function writeScript(exportDir, filename, source) {
  // Ensure export directory exists
  await ensureDirectory(exportDir);
  
  // Build full path
  const filePath = path.join(exportDir, filename);
  
  // Write file (overwrites if exists)
  await fs.writeFile(filePath, source, 'utf-8');
  
  return filePath;
}

/**
 * Read a script file
 * @param {string} filePath - Full path to the file
 * @returns {Promise<string>} File content
 */
export async function readScript(filePath) {
  return await fs.readFile(filePath, 'utf-8');
}

/**
 * Check if a file exists
 * @param {string} filePath - Full path to the file
 * @returns {Promise<boolean>} True if file exists
 */
export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export default {
  ensureDirectory,
  writeScript,
  readScript,
  fileExists
};
