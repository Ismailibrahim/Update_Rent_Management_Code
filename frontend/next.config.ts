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
  
  // Ensure server binds to all interfaces (0.0.0.0)
  // This is handled by Next.js automatically, but explicit config helps
};

export default nextConfig;
