import { describe, it, expect, vi } from 'vitest';

vi.mock('./platform/firebase', () => ({
  getApp: vi.fn(() => ({})),
}));

vi.mock('firebase-admin/firestore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('firebase-admin/firestore')>()),
  getFirestore: vi.fn(() => ({})),
}));

describe('functions entry point', () => {
  // Firebase deploys a renamed function as a delete plus a create.
  it('exports exactly the deployed functions', async () => {
    const functions = await import('./index.js');

    expect(Object.keys(functions).sort()).toEqual([
      'cat',
      'importPhotosScheduled',
      'onDayRecordCreated',
      'processAvailablePhotosScheduled',
      'pruneTokensScheduled',
      'recordPhotoIdOnDayWrite',
      'sendNotificationsScheduled',
      'sitemap',
      'topics',
    ]);
  });
});
