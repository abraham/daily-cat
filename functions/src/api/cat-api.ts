import { logger } from 'firebase-functions';
import { CatApiOptions, UnsplashPhoto, UnsplashSearch } from '../types';

export async function list({
  clientId,
  page,
}: CatApiOptions): Promise<UnsplashSearch> {
  const params = new URLSearchParams({
    query: 'cat',
    per_page: '30',
    order_by: 'relevant',
    page,
  });
  const url = `https://api.unsplash.com/search/photos?${params}`;
  logger.log(`Fetching photos from Unsplash API: ${url}`);
  const response: Response = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${clientId}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch photos: ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<UnsplashSearch>;
}

export async function get(
  options: Omit<CatApiOptions, 'page'>,
  photoId: string
): Promise<UnsplashPhoto> {
  const url = `https://api.unsplash.com/photos/${photoId}`;
  const response: Response = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${options.clientId}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch photo ${photoId}: ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<UnsplashPhoto>;
}
