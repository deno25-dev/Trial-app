import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    return {
      // 1. Align the server settings with Tauri
      server: {
        port: 5173,      // Matches tauri.conf.json
        strictPort: true, // Forces Vite to fail if 5173 is occupied, preventing a 404 in Tauri
        host: '0.0.0.0',
      },
      
      plugins: [react()],
      
      // 2. Keep your existing API definitions
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      
      // 3. Keep your path aliases
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },

      // 4. Ensure clear build output for Tauri
      build: {
        outDir: 'dist',
        emptyOutDir: true,
      }
    };
});