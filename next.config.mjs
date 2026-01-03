/** @type {import('next').NextConfig} */  
const nextConfig = {
  // Enable standalone output for optimized Docker builds
  output: 'standalone',
  
  experimental: {
    serverActions: {
      allowedOrigins: ["http://localhost:3000", "https://planet.queue.cx"],
      bodySizeLimit: '200mb',
    },
  },
  transpilePackages: ['QCX', 'mapbox_mcp'], // Added to transpile local packages
};  

export default nextConfig
