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
};

export default nextConfig;
