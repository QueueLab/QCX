# PWA Documentation

QCX is configured as a Progressive Web App (PWA) using Serwist.

## Features
- **Installable**: Custom install prompt for desktop and mobile.
- **Offline Support**: Caches static assets and provides an offline fallback page.
- **Background Sync/Push Readiness**: Service worker is wired for future push and sync features.

## Local Development
By default, the service worker is **disabled** in development mode (`NODE_ENV === 'development'`) to avoid caching issues during iteration.

To test PWA features locally:
1. Build the application: `bun run build`
2. Start the production server: `bun run start`
3. Access the app via `localhost:3000`.

## Testing
- **Chrome DevTools**: Use the **Application** tab to inspect the Manifest, Service Worker, and Cache Storage.
- **Lighthouse**: Run a Lighthouse report to verify PWA installability and best practices.
- **Mobile**: Test on a physical Android device using Chrome's Remote Debugging or by deploying to a staging environment with HTTPS.

## Deployment Notes
- **HTTPS**: PWAs require a secure context (HTTPS), except for `localhost`.
- **Standalone Output**: The project uses `output: 'standalone'` in `next.config.mjs`. The generated `sw.js` is served from the `public` root, which is compatible with this output mode.
- **Manifest & Icons**: Ensure `public/manifest.json` (generated via `app/manifest.ts`) and icons in `public/icons/` are correctly served.

## Service Worker Strategy
- **CacheFirst**: Used for immutable static assets (JS, CSS, images, fonts).
- **NetworkFirst**: Used for navigation requests (with offline fallback to `/offline`) and non-mutating API calls.
- **Mutations**: POST/DELETE requests (e.g., `/api/chat`) are explicitly excluded from caching to ensure data integrity.
