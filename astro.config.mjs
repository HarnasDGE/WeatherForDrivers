// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import vercel from '@astrojs/vercel';

const isVercel = Boolean(process.env.VERCEL);

/**
 * @astrojs/vercel's serverless entrypoint imports constants from the adapter's index,
 * which drags in a build-time-only `import "rolldown"` (edge middleware bundler).
 * On Vercel the function then crashes at startup: rolldown's native binding is not traced
 * into the bundle. Nothing at runtime uses rolldown, so resolve it to an empty module.
 * @returns {import('vite').Plugin}
 */
function stubRolldownInServerBundle() {
  const STUB_ID = '\0rolldown-stub';
  return {
    name: 'stub-rolldown-in-server-bundle',
    apply: 'build',
    enforce: 'pre',
    resolveId(id) {
      return id === 'rolldown' ? STUB_ID : null;
    },
    load(id) {
      return id === STUB_ID ? 'export const rolldown = () => { throw new Error("rolldown is build-time only"); };' : null;
    },
  };
}

// Vercel sets VERCEL=1 during its builds; elsewhere we build a standalone Node server.
const adapter = isVercel
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
  vite: {
    plugins: isVercel ? [stubRolldownInServerBundle()] : [],
  },
});
