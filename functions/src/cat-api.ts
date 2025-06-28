import { UnsplashPhoto, CatApiOptions } from './types';

export async function list(options: CatApiOptions): Promise<UnsplashPhoto[]> {
  const url = `https://api.unsplash.com/photos/random?query=cat&count=30`;
  const response: Response = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${options.clientId}`,
    },
  });

  console.log('body');
  const results = (await response.json()) as UnsplashPhoto[];
  // Fallback in case the API returns a single photo
  return results;
}
