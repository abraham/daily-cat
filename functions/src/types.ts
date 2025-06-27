// Unsplash API response types
export interface UnsplashPhoto {
  id: string;
  created_at: string;
  updated_at: string;
  width: number;
  height: number;
  color: string;
  slug: string | null;
  downloads: number;
  likes: number;
  views: number;
  liked_by_user: boolean;
  exif: {
    make?: string;
    model?: string;
    exposure_time?: string;
    aperture?: string;
    focal_length?: string;
    iso?: number;
  };
  location: {
    title?: string;
    name?: string;
    city?: string;
    country?: string;
    position?: {
      latitude: number;
      longitude: number;
    };
  };
  current_user_collections: any[];
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  categories: Array<{
    id: number;
    title: string;
    photo_count: number;
    links: {
      self: string;
      photos: string;
    };
  }>;
  links: {
    self: string;
    html: string;
    download: string;
    download_location: string;
  };
  user: {
    id: string;
    updated_at: string;
    username: string;
    name: string;
    first_name: string;
    last_name: string;
    portfolio_url: string | null;
    bio: string;
    location: string | null;
    total_likes: number;
    total_photos: number;
    total_collections: number;
    profile_image: {
      small: string;
      medium: string;
      large: string;
    };
    links: {
      self: string;
      html: string;
      photos: string;
      likes: string;
      portfolio: string;
      following: string;
      followers: string;
    };
  };
}

export interface CatApiOptions {
  clientId: string;
}