import type { NextConfig } from "next";

// Map tiles are regenerated when zoom levels change, so cache them long but not immutably.
const STATIC_MAP_ASSET_CACHE_CONTROL =
  "public, max-age=604800, stale-while-revalidate=2592000";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.207.154.89", "10.212.242.91"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/dispenser-images/**",
      },
    ],
    // Dispenser image paths contain a random UUID and are never overwritten.
    minimumCacheTTL: 31536000,
  },
  experimental: {
    serverActions: {
      // Image uploads are sent as multipart FormData and can exceed default action limits.
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [
      {
        source: "/new_tiles/:path*",
        headers: [{ key: "Cache-Control", value: STATIC_MAP_ASSET_CACHE_CONTROL }],
      },
      {
        source: "/pin.png",
        headers: [{ key: "Cache-Control", value: STATIC_MAP_ASSET_CACHE_CONTROL }],
      },
    ];
  },
};

export default nextConfig;
