import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["mysql2", "node-cron"],
};

export default nextConfig;
