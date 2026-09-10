import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["mysql2", "node-cron", "archiver"],
  reactStrictMode: true,
  allowedDevOrigins: ["10.88.1.*"],
};

export default nextConfig;
