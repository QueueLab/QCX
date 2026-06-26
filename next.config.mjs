import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  // The path to the service worker source file.
  swSrc: "app/sw.ts",
  // The path to the generated service worker file.
  swDest: "public/sw.js",
  // Disable service worker generation in development mode to avoid caching friction.
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for optimized Docker builds
  // Note: output: 'standalone' requires the generated sw.js to be served from the public root scope
  // which it is, as a static public asset.
  output: 'standalone',
  
  experimental: {
    serverActions: {
      allowedOrigins: ["http://localhost:3000", "https://planet.queue.cx"],
      bodySizeLimit: '200mb',
    },
  },
  transpilePackages: ['QCX', 'mapbox_mcp'], // Added to transpile local packages
};  

export default withSerwist(nextConfig);
