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
  // Removed transpilePackages as it can cause module loading issues for local folders
};  

export default nextConfig
