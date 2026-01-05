import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { spawn } from "child_process";

// Plugin to start the obfuscator API and Discord bot when dev server starts
function obfuscatorApiPlugin() {
  let apiProcess: ReturnType<typeof spawn> | null = null;
  let botProcess: ReturnType<typeof spawn> | null = null;
  
  return {
    name: 'obfuscator-api',
    configureServer() {
      // Start the Python obfuscator API
      const apiPath = path.resolve(__dirname, 'whitelsiting service/new_obfuscator/obfuscator_api.py');
      
      console.log('\n🔧 Starting Obfuscator API...');
      apiProcess = spawn('python', [apiPath], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
        cwd: path.resolve(__dirname, 'whitelsiting service/new_obfuscator')
      });
      
      apiProcess.stdout?.on('data', (data: Buffer) => {
        const msg = data.toString().trim();
        if (msg) console.log(`[Obfuscator API] ${msg}`);
      });
      
      apiProcess.stderr?.on('data', (data: Buffer) => {
        const msg = data.toString().trim();
        if (msg) console.log(`[Obfuscator API] ${msg}`);
      });
      
      apiProcess.on('error', (err) => {
        console.log(`[Obfuscator API] Failed to start: ${err.message}`);
      });
      
      apiProcess.on('close', (code) => {
        if (code !== null && code !== 0) {
          console.log(`[Obfuscator API] Exited with code ${code}`);
        }
      });

      // Start the Discord bot
      const botPath = path.resolve(__dirname, 'whitelsiting service');
      console.log('🤖 Starting Discord Bot...');
      botProcess = spawn('node', ['src/index.js'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
        cwd: botPath
      });
      
      botProcess.stdout?.on('data', (data: Buffer) => {
        const msg = data.toString().trim();
        if (msg) console.log(`[Discord Bot] ${msg}`);
      });
      
      botProcess.stderr?.on('data', (data: Buffer) => {
        const msg = data.toString().trim();
        if (msg) console.log(`[Discord Bot] ${msg}`);
      });
      
      botProcess.on('error', (err) => {
        console.log(`[Discord Bot] Failed to start: ${err.message}`);
      });
      
      botProcess.on('close', (code) => {
        if (code !== null && code !== 0) {
          console.log(`[Discord Bot] Exited with code ${code}`);
        }
      });
      
      // Cleanup on server close
      process.on('SIGINT', () => {
        if (apiProcess) apiProcess.kill();
        if (botProcess) botProcess.kill();
        process.exit();
      });
      
      process.on('SIGTERM', () => {
        if (apiProcess) apiProcess.kill();
        if (botProcess) botProcess.kill();
        process.exit();
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), obfuscatorApiPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
