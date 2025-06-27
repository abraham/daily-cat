import { UnsplashPhoto, CatApiOptions } from './types';

export function get(options: CatApiOptions): Promise<UnsplashPhoto> {
  const url = `https://api.unsplash.com/photos/random?query=cat&client_id=${options.clientId}`;
  console.log('url', url);

  return fetch(url).then((response: Response) => {
    console.log('body');
    return response.json() as Promise<UnsplashPhoto>;
  });
}
