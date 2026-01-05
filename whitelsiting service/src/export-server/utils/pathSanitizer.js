/**
 * Path Sanitizer Utility
 * Handles sanitization of script paths for Windows filesystem compatibility
 */

// Characters invalid in Windows filenames
const INVALID_CHARS = /[\\/:*?"<>|]/g;

/**
 * Sanitize a string for use as a filename
 * Replaces invalid Windows filename characters with underscores
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizePath(str) {
  if (!str || typeof str !== 'string') {
    return '';
  }
  return str.replace(INVALID_CHARS, '_');
}

/**
 * Generate a filename from a script path
 * Converts dot-separated paths to underscore-separated filenames
 * e.g., "ServerScriptService.Folder.Script" -> "ServerScriptService_Folder_Script.lua"
 * @param {string} scriptPath - Dot-separated script path
 * @returns {string} Safe filename with .lua extension
 */
export function generateFilename(scriptPath) {
  if (!scriptPath || typeof scriptPath !== 'string') {
    return 'unnamed_script.lua';
  }

  // Replace dots with underscores (path separator)
  let filename = scriptPath.replace(/\./g, '_');
  
  // Sanitize any remaining invalid characters
  filename = sanitizePath(filename);
  
  // Remove leading/trailing underscores
  filename = filename.replace(/^_+|_+$/g, '');
  
  // Ensure we have a valid filename
  if (!filename) {
    return 'unnamed_script.lua';
  }
  
  // Add .lua extension if not present
  if (!filename.endsWith('.lua')) {
    filename += '.lua';
  }
  
  return filename;
}

export default {
  sanitizePath,
  generateFilename
};
