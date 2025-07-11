/** @type {import('next').NextConfig} */  
const nextConfig = {  
  experimental: {  
    serverActions: {  
      allowedOrigins: ["localhost:3000", "https://planet.queue.cx/"]  
    },  
  },  
  transpilePackages: ['QCX', 'mapbox_mcp'], // Added to transpile local packages
};  

export default nextConfig