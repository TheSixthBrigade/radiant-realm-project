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
      if (process.env.NODE_ENV === 'production') return;

      // Start the Python obfuscator API
      const apiPath = path.resolve(__dirname, 'whitelisting_service/new_obfuscator/obfuscator_api.py');

      console.log('\n🔧 Starting Obfuscator API...');
      apiProcess = spawn('python', [apiPath], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
        cwd: path.resolve(__dirname, 'whitelisting_service/new_obfuscator')
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
      const botPath = path.resolve(__dirname, 'whitelisting_service');
      console.log('🤖 Starting Discord Bot...');
      botProcess = spawn('node', ['src/index.js'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
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
  // Build optimizations
  build: {
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
      },
    },
    // Code splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - separate heavy libraries
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-popover',
          ],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-charts': ['recharts'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable source maps for debugging (disable in production if needed)
    sourcemap: false,
    // Target modern browsers for smaller bundles
    target: 'es2020',
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js',
      'lucide-react',
    ],
  },
}));
