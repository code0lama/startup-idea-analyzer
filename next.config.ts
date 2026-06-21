import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin uses Node built-ins and dynamic requires; keep it external to
  // the server bundle so Turbopack doesn't try to bundle its optional native deps.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
