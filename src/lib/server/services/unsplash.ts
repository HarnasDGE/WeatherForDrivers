import type { PlaceImage } from '@/lib/shared/types';
import { API_BASE, requireSecret } from '../config';
import { fetchJson } from '../http';

/** Unsplash photo search (requires UNSPLASH_ACCESS_KEY). */

interface UnsplashSearchResponse {
  results: Array<{
    alt_description: string | null;
    description: string | null;
    urls: { regular: string };
    user: { name: string; links: { html: string } };
  }>;
}

/** First search result for the keyword (legacy `fetchImageLink`); null when none. */
export async function findPlaceImage(query: string): Promise<PlaceImage | null> {
  const url = new URL('/search/photos', API_BASE.unsplash);
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', '1');

  const res = await fetchJson<UnsplashSearchResponse>(url, {
    service: 'Unsplash',
    init: {
      headers: {
        Authorization: `Client-ID ${requireSecret('UNSPLASH_ACCESS_KEY')}`,
        'Accept-Version': 'v1',
      },
    },
  });

  const photo = res.results[0];
  if (!photo) return null;
  return {
    url: photo.urls.regular,
    alt: photo.alt_description ?? photo.description ?? null,
    authorName: photo.user.name,
    authorUrl: photo.user.links.html,
  };
}
