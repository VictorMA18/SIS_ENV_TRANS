import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from "vite-plugin-pwa"

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: any) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Logistic App",
        short_name: "logistic",
        description: "Descripción de Logistic",
        icons: [
          {
            src: "/images/logo.png",
            sizes: "150x150",
            type: "image/png"
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Proxy de desarrollo: redirige /api/ y /ws/ al servidor Django (puerto 8000)
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,           // habilitar proxy WebSocket
        changeOrigin: true,
      },
    },
  },
  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
  build: {
    manifest: "manifest.json"
  }
})
