import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Bind to all interfaces so the portal can be opened from another machine
  // on the network during review, the same as the mobile app's dev server.
  server: { host: true, port: 5174 },
  preview: { host: true, port: 4174 },
})
