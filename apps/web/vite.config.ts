import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  console.log(
    'VITE_ envs:',
    Object.fromEntries(
      Object.entries(process.env).filter(([key]) => key.startsWith('VITE_'))
    )
  );

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: [
        { find: '@/src', replacement: path.resolve(__dirname, './src') },
        { find: '@', replacement: path.resolve(__dirname, '.') },
      ],
    },
    server: {
      // Bind on all interfaces so the Vite dev server is reachable from the
      // nginx container (and its browser-facing WebSocket proxy) in docker-compose.dev.yml.
      host: true,
      // Vite blocks requests whose Host header isn't in this list (DNS-rebinding
      // protection) — nginx forwards the original Host, so it must be allowed here.
      allowedHosts: [
        "nanithefuck.com.br",
        "free-porn-block.com",
        "localhost",
        "127.0.0.1"
      ],
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      // VITE_HMR_CLIENT_PORT (only set inside the dev docker container) tells the
      // HMR client to open its WebSocket on nginx's public port instead of Vite's
      // internal container port, which the browser can't reach directly.
      hmr: process.env.DISABLE_HMR === 'true'
        ? false
        : process.env.VITE_HMR_CLIENT_PORT
          ? { clientPort: Number(process.env.VITE_HMR_CLIENT_PORT) }
          : true,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    test: {
      environment: 'happy-dom',
      globals: true,
      pool: 'threads',
      threads: {
        singleThread: true,
      },
      setupFiles: ['./src/__tests__/setup.ts'],
      env: {
        VITE_ENV: 'test',
      },
    },
  };
});
