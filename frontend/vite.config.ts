import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Treat .glb as static assets so they can be imported from src/
  assetsInclude: ['**/*.glb']
})
