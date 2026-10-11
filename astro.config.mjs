// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
    // Route geometries posted to /api/route-weather can be a few hundred KB.
    bodySizeLimit: 5 * 1024 * 1024,
  }),
  integrations: [react()],
});
