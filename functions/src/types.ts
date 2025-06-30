// Unsplash API response types

// Base photo interface for search results (subset of full photo data)
export interface UnsplashSearchPhoto {
  id: string;
  slug: string | null;
  alternative_slugs: Record<string, string>;
  created_at: string;
  updated_at: string;
  promoted_at: string | null;
  width: number;
  height: number;
  color: string;
  blur_hash: string;
  description: string | null;
  alt_description: string | null;
  breadcrumbs: any[];
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
    small_s3: string;
  };
  links: {
    self: string;
    html: string;
    download: string;
    download_location: string;
  };
  likes: number;
  liked_by_user: boolean;
  current_user_collections: any[];
  sponsorship: any;
  topic_submissions: Record<string, any>;
  asset_type: string;
  user: {
    id: string;
    updated_at: string;
    username: string;
    name: string;
    first_name: string;
    last_name: string;
    twitter_username: string | null;
    portfolio_url: string | null;
    bio: string;
    location: string | null;
    links: {
      self: string;
      html: string;
      photos: string;
      likes: string;
      portfolio: string;
      following: string;
      followers: string;
    };
    profile_image: {
      small: string;
      medium: string;
      large: string;
    };
    instagram_username: string | null;
    total_collections: number;
    total_likes: number;
    total_photos: number;
    total_promoted_photos: number;
    total_illustrations: number;
    total_promoted_illustrations: number;
    accepted_tos: boolean;
    for_hire: boolean;
    social: {
      instagram_username: string | null;
      portfolio_url: string | null;
      twitter_username: string | null;
      paypal_email: string | null;
    };
  };
}

// Random photo interface (has some additional fields but not all)
export interface UnsplashRandomPhoto extends UnsplashSearchPhoto {
  exif: {
    make: string | null;
    model: string | null;
    name: string | null;
    exposure_time: string | null;
    aperture: string | null;
    focal_length: string | null;
    iso: number | null;
  };
  location: {
    name: string | null;
    city: string | null;
    country: string | null;
    position: {
      latitude: number | null;
      longitude: number | null;
    };
  };
  views: number;
  downloads: number;
}

// Full photo interface with all details (for individual photo endpoint)
export interface UnsplashPhoto extends UnsplashRandomPhoto {
  meta: {
    index: boolean;
  };
  public_domain: boolean;
  tags: Array<{
    type: string;
    title: string;
  }>;
  topics: any[];
}

export interface UnsplashSearch {
  total: number;
  total_pages: number;
  results: UnsplashSearchPhoto[];
}

export type UnsplashRandom = UnsplashRandomPhoto[];

export interface CatApiOptions {
  clientId: string;
}

export interface DayRecord {
  id: string; // ISO date string (YYYY-MM-DD)
  photo: UnsplashPhoto | null;
  status: 'created' | 'processing' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface NewDayRecord extends DayRecord {
  photo: null;
  status: 'created';
}
export interface CompletedDayRecord extends DayRecord {
  photo: UnsplashPhoto;
  status: 'completed';
}

export interface Config {
  minDate: string; // ISO date string (YYYY-MM-DD)
  importEnabled: boolean; // Whether to enable import functionality
}
