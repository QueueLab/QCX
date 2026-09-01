import { mock } from 'bun:test';

mock.module('next/cache', () => ({
  revalidatePath: () => {},
}));

mock.module('next/headers', () => ({
  headers: async () => ({
    get: (key: string) => {
      if (key === 'x-forwarded-host') return 'proxy-host.com';
      if (key === 'x-forwarded-proto') return 'https';
      return null;
    },
  }),
}));

const { getRedirectUri } = await import('../lib/actions/skyfi');

console.log('Starting SkyFi plugin unit tests...');

// 1. The public request host must win even when NEXT_PUBLIC_APP_URL is stale.
process.env.NEXT_PUBLIC_APP_URL = 'https://custom-domain.com';
const redirectUriEnv = await getRedirectUri();
if (redirectUriEnv !== 'https://proxy-host.com/api/skyfi/callback') {
  throw new Error(`getRedirectUri request-host precedence failed. Expected 'https://proxy-host.com/api/skyfi/callback', got '${redirectUriEnv}'`);
}
console.log('✓ getRedirectUri prioritizing the public request host verified');

// 2. Test getRedirectUri fallback with proxy headers without NEXT_PUBLIC_APP_URL
delete process.env.NEXT_PUBLIC_APP_URL;
const redirectUriProxy = await getRedirectUri();
if (redirectUriProxy !== 'https://proxy-host.com/api/skyfi/callback') {
  throw new Error(`getRedirectUri proxy fallback failed. Expected 'https://proxy-host.com/api/skyfi/callback', got '${redirectUriProxy}'`);
}
console.log('✓ getRedirectUri proxy headers fallback verified');

console.log('All SkyFi plugin unit tests passed!');
