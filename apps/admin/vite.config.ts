import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  console.log("Backend:", env.VITE_BACKEND_URL)

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
      port: 5173,
      allowedHosts: [
        "nanithefuck.com",
        "free-porn-block.com",
        "localhost",
        "127.0.0.1"
      ]
    }
  }
})