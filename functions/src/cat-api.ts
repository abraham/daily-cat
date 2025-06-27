import { UnsplashPhoto, CatApiOptions } from './types';

export async function get(options: CatApiOptions): Promise<UnsplashPhoto> {
  const url = `https://api.unsplash.com/photos/random?query=cat`;
  const response: Response = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${options.clientId}`,
    },
  });

  console.log('body');
  return response.json() as Promise<UnsplashPhoto>;
}
