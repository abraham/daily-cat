import { describe, it, expect } from 'vitest';
import { unsplashClientId } from './secrets';

describe('secrets', () => {
  it('defines the Unsplash client ID secret', () => {
    expect(unsplashClientId.name).toBe('UNSPLASH_CLIENT_ID');
  });
});
