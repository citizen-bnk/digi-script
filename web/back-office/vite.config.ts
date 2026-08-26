import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// BACK_OFFICE_BASE lets one Vercel deployment serve both apps: the mobile
// PWA at / and this portal at /admin/. Unset (local dev, or its own
// deployment) it serves from the root as normal. React Router picks the
// matching basename up from import.meta.env.BASE_URL, so the two can't
// drift apart.
export default defineConfig({
  base: process.env.BACK_OFFICE_BASE ?? '/',
  plugins: [react()],
  // Bind to all interfaces so the portal can be opened from another machine
  // on the network during review, the same as the mobile app's dev server.
  server: { host: true, port: 5174 },
  preview: { host: true, port: 4174 },
})
