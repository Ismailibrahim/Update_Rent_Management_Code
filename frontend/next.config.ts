import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Production optimizations
  compress: true,
  
  // Disable powered-by header for security
  poweredByHeader: false,
  
  // Enable React strict mode
  reactStrictMode: true,
  
  // Performance optimizations
  swcMinify: true,
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Optimize build
  experimental: {
    optimizeCss: true,
  },
  
  // Ensure server binds to all interfaces (0.0.0.0)
  // This is handled by Next.js automatically, but explicit config helps
};

export default nextConfig;
