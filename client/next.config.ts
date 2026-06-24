import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable gzip/brotli compression for smaller bundle sizes
  compress: true,

  // Optimize images
  images: {
    formats: ["image/avif", "image/webp"],
  },


  // Experimental performance features
  experimental: {
    // Enable optimized package imports to reduce bundle size
    optimizePackageImports: ["lucide-react", "framer-motion", "@react-oauth/google"],
  },
};

export default nextConfig;
