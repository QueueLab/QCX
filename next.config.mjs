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
  transpilePackages: ['mapbox_mcp'], // Removed 'QCX' as it's the app itself
};  

export default nextConfig
