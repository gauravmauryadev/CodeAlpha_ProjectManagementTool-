import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable gzip/brotli compression for smaller bundle sizes
  compress: true,

  // Optimize images
  images: {
    formats: ["image/avif", "image/webp"],
  },

  // Reduce JS bundle size by enabling SWC minification (default in Next 15, explicit for clarity)
  swcMinify: true,

  // Experimental performance features
  experimental: {
    // Enable optimized package imports to reduce bundle size
    optimizePackageImports: ["lucide-react", "framer-motion", "@react-oauth/google"],
  },
};

export default nextConfig;
