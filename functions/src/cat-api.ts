import { UnsplashPhoto, CatApiOptions } from './types';

export async function get(options: CatApiOptions): Promise<UnsplashPhoto> {
  const url = `https://api.unsplash.com/photos/random?query=cat&client_id=${options.clientId}`;
  console.log('url', url);

  const response: Response = await fetch(url);
  console.log('body');
  return response.json() as Promise<UnsplashPhoto>;
}
