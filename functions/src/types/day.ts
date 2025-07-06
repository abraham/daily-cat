import { Timestamp } from 'firebase-admin/firestore';
import { UnsplashPhoto } from './unsplash';

export interface DayRecord {
  id: string; // ISO date string (YYYY-MM-DD)
  photo: UnsplashPhoto | null;
  status: 'created' | 'processing' | 'completed';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface NewDayRecord extends DayRecord {
  photo: null;
  status: 'created';
}
export interface CompletedDayRecord extends DayRecord {
  photo: UnsplashPhoto;
  status: 'completed';
}
