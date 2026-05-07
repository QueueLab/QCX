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
  
  // turbopack root at top level in v16
  turbopack: {
    root: '.',
  },
  
  // reactCompiler and cacheComponents moved to top level in v16
  reactCompiler: true,
  cacheComponents: true,
  
  transpilePackages: ['QCX', 'mapbox_mcp'], // Added to transpile local packages
};  

export default nextConfig
