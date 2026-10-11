import { handle, methodNotAllowed, jsonData, requiredString } from '@/lib/server/api';
import { notFound } from '@/lib/server/errors';
import { findPlaceImage } from '@/lib/server/services/unsplash';

/** GET /api/place-image?q -> { data: PlaceImage } | 404 when no image */
export const GET = handle(async ({ url }) => {
  const query = requiredString(url.searchParams, 'q', 100);
  const image = await findPlaceImage(query);
  if (!image) throw notFound(`No images found for "${query}".`);
  return jsonData(image, { cacheSeconds: 86_400 });
});

export const ALL = methodNotAllowed(['GET']);
