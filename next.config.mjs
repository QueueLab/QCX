/** @type {import('next').NextConfig} */  
const nextConfig = {
  // Enable standalone output for optimized Docker builds
  output: 'standalone',
  
  experimental: {
    serverActions: {
      allowedOrigins: process.env.SERVER_ACTIONS_ALLOWED_ORIGINS 
        ? process.env.SERVER_ACTIONS_ALLOWED_ORIGINS.split(',')
        : ["http://localhost:3000", "https://planet.queue.cx", "https://qcx-qcx.vercel.app"],
      bodySizeLimit: '200mb',
    },
  },
  transpilePackages: ['QCX', 'mapbox_mcp'],
};  

export default nextConfig
