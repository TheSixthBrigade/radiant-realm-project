import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No basePath - app runs at root of db.vectabase.com
  
  // Allow the app to work behind a reverse proxy
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
