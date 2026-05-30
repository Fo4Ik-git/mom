import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Use the generated client from node_modules (avoids stale Turbopack externals).
  serverExternalPackages: ["@prisma/client", "prisma", "pino", "rotating-file-stream"],
  // Phone / LAN during dev (Next.js blocks /_next/* from other hosts by default).
  allowedDevOrigins: ["192.168.1.166", "192.168.*"],
  // Docker production image (see Dockerfile)
  distDir: "build",
  output: "standalone",
  poweredByHeader: false,
  compress: true,
};

export default withNextIntl(nextConfig);
