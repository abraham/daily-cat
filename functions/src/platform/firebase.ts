import { App, getApps, initializeApp } from 'firebase-admin/app';

export function getApp(): App {
  return getApps()[0] ?? initializeApp();
}
