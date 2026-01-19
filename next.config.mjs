/** @type {import('next').NextConfig} */  
const nextConfig = {
  // Enable standalone output for optimized Docker builds
  output: 'standalone',
  
  experimental: {
    serverActions: {
      allowedOrigins: process.env.SERVER_ACTIONS_ALLOWED_ORIGINS 
        ? process.env.SERVER_ACTIONS_ALLOWED_ORIGINS.split(',')
        : ["http://localhost:3000", "https://planet.queue.cx"],
      bodySizeLimit: '200mb',
    },
  },
  transpilePackages: ['mapbox_mcp'], // Added to transpile local packages
};  

export default nextConfig
