import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import { writeScript, readScript, fileExists } from './utils/fileWriter.js';
import { sanitizePath, generateFilename } from './utils/pathSanitizer.js';
import path from 'path';

const app = express();
const PORT = 3847;
const EXPORT_DIR = 'E:\\Files_To_Obfuscate';
const MAX_CHUNK_SIZE = 190000; // Leave room for Roblox's 200k limit

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', exportDir: EXPORT_DIR });
});

// Status endpoint with more details
app.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    exportDir: EXPORT_DIR,
    port: PORT,
    uptime: process.uptime()
  });
});

// Export endpoint
app.post('/export', async (req, res) => {
  const { name, path: scriptPath, source } = req.body;

  // Validate required fields
  if (!name || typeof name !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: name'
    });
  }

  if (!scriptPath || typeof scriptPath !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: path'
    });
  }

  if (source === undefined || source === null) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: source'
    });
  }

  try {
    const filename = generateFilename(scriptPath);
    const filePath = await writeScript(EXPORT_DIR, filename, source);
    
    console.log(`[Export] Saved: ${filePath}`);
    
    res.json({
      success: true,
      filePath: filePath
    });
  } catch (error) {
    console.error(`[Export] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Read endpoint - get secured script content (with chunking support)
app.get('/read/:filename', async (req, res) => {
  const { filename } = req.params;
  const decodedFilename = decodeURIComponent(filename);
  const baseName = decodedFilename.replace('.lua', '');
  
  try {
    const filePath = path.join(EXPORT_DIR, decodedFilename);
    
    if (!await fileExists(filePath)) {
      return res.json({
        success: false,
        error: 'File not found'
      });
    }
    
    const source = await readScript(filePath);
    
    console.log(`[Read] Read: ${filePath} (${source.length} chars)`);
    
    // Check if we need to chunk
    if (source.length > MAX_CHUNK_SIZE) {
      // Split into chunks
      const chunks = [];
      for (let i = 0; i < source.length; i += MAX_CHUNK_SIZE) {
        chunks.push(source.slice(i, i + MAX_CHUNK_SIZE));
      }
      
      console.log(`[Read] Script too large, splitting into ${chunks.length} chunks`);
      
      res.json({
        success: true,
        chunked: true,
        chunkCount: chunks.length,
        chunks: chunks
      });
    } else {
      res.json({
        success: true,
        chunked: false,
        source: source
      });
    }
  } catch (error) {
    console.error(`[Read] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server (localhost only)
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Script Export Server running on http://127.0.0.1:${PORT}`);
  console.log(`Export directory: ${EXPORT_DIR}`);
  console.log('Waiting for exports from Roblox Studio...');
});

export default app;
