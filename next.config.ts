import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Use the generated client from node_modules (avoids stale Turbopack externals).
  serverExternalPackages: ["@prisma/client"],
};

export default withNextIntl(nextConfig);
