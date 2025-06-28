import { CatApiOptions, UnsplashRandom, UnsplashPhoto } from './types';

export async function list(options: CatApiOptions): Promise<UnsplashRandom> {
  const url = `https://api.unsplash.com/photos/random?query=cat&count=30`;
  const response: Response = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${options.clientId}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch random photos: ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<UnsplashRandom>;
}

export async function get(
  options: CatApiOptions,
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
