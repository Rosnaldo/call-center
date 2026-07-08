import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  console.log(
    "VITE_ envs:",
    Object.fromEntries(
      Object.entries(env).filter(([key]) => key.startsWith("VITE_"))
    )
  )

  const basePath = env.VITE_BASE_PATH || '/'

  const redirectToBase = {
    name: 'redirect-to-base',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (basePath !== '/' && req.url === '/') {
          res.writeHead(302, { Location: basePath })
          res.end()
          return
        }
        next()
      })
    }
  }

  return {
    base: env.VITE_CONFIG_BASE,
    plugins: [react(), tailwindcss(), redirectToBase],
    cacheDir: 'node_modules/.vite_cache',
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: true,
      port: 5174,
      allowedHosts: [
        "nanithefuck.com.br",
        "free-porn-block.com",
        "localhost",
        "127.0.0.1"
      ],
      // VITE_HMR_CLIENT_PORT (only set inside the dev docker container) tells
      // the HMR client to open its WebSocket on nginx's public port instead of
      // Vite's internal container port, which the browser can't reach directly.
      hmr: env.VITE_HMR_CLIENT_PORT
        ? { clientPort: Number(env.VITE_HMR_CLIENT_PORT) }
        : undefined,
    }
  }
})