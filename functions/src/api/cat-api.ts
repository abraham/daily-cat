import { logger } from 'firebase-functions';
import {
  CatApiOptions,
  UnsplashPhoto,
  UnsplashSearch,
} from '../types/unsplash';
import { NotFoundError, RateLimitedError } from '../types/errors';

export async function list({
  clientId,
  page,
}: CatApiOptions): Promise<UnsplashSearch> {
  const params = new URLSearchParams({
    query: 'cat',
    per_page: '100',
    order_by: 'relevant',
    page,
  });
  const url = `https://api.unsplash.com/search/photos?${params}`;
  const response = await unsplashFetch(url, clientId);

  return response.json() as Promise<UnsplashSearch>;
}

export async function get(
  options: Omit<CatApiOptions, 'page'>,
  photoId: string
): Promise<UnsplashPhoto> {
  const url = `https://api.unsplash.com/photos/${photoId}`;
  const response = await unsplashFetch(url, options.clientId);

  return response.json() as Promise<UnsplashPhoto>;
}

async function unsplashFetch(url: string, clientId: string): Promise<Response> {
  logger.log(`Fetching from Unsplash API: ${url}`);
  const response: Response = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${clientId}`,
    },
  });

  if (!response.ok) {
    logger.error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`
    );
    const text = await response.text();
    logger.error(text);

    if (response.status === 404) {
      throw new NotFoundError(text);
    }

    if (response.status === 403) {
      if (text.includes('Rate Limit Exceeded')) {
        throw new RateLimitedError(text);
      }
    }

    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`
    );
  }

  return response;
}
