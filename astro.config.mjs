// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import vercel from '@astrojs/vercel';

// Vercel sets VERCEL=1 during its builds; elsewhere we build a standalone Node server.
const adapter = process.env.VERCEL
  ? vercel()
  : node({
      mode: 'standalone',
      // Route geometries posted to /api/route-weather can be a few hundred KB.
      bodySizeLimit: 5 * 1024 * 1024,
    });

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter,
  integrations: [react()],
});
