/** @type {import('next').NextConfig} */
const isDesktop = process.env.BUILD_MODE === 'desktop';

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Enable static export for Tauri desktop app
  output: isDesktop ? 'export' : undefined,
  // Disable image optimization for static export
  images: {
    unoptimized: isDesktop,
  },
  // Disable trailing slash to match Tauri expectations
  trailingSlash: isDesktop,
};

export default nextConfig;
