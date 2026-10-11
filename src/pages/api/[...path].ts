import { handle } from '@/lib/server/api';
import { notFound } from '@/lib/server/errors';

/** JSON 404 for unknown /api/* paths (instead of Astro's HTML 404 page). */
export const ALL = handle(({ params }) => {
  throw notFound(`Unknown API endpoint: /api/${params.path ?? ''}`);
});
