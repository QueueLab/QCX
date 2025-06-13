/** @type {import('next').NextConfig} */  
const nextConfig = {  
  experimental: {  
    serverActions: {  
      allowedOrigins: ["localhost:3000", "https://planet.queue.cx/"]  
    },  
  },  
  transpilePackages: ['QCX', 'mapbox_mcp'], // Added to transpile local packages

  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}), // Spread existing fallbacks
        fs: false,
        // consider adding other common fallbacks if new errors appear after fixing 'fs'
        // path: require.resolve("path-browserify"), // or false
        // crypto: require.resolve("crypto-browserify"), // or false
      };
    }

    // Return the modified config
    return config;
  },
};  

export default nextConfig