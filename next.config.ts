import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.207.154.89", "10.212.242.91"],
  experimental: {
    serverActions: {
      // Image uploads are sent as multipart FormData and can exceed default action limits.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
