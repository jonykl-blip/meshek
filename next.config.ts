import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig = async (phase: string): Promise<NextConfig> => {
  const withSerwist = (await import("@serwist/next")).default({
    swSrc: "app/sw.ts",
    swDest: "public/sw.js",
    disable: phase === PHASE_DEVELOPMENT_SERVER,
  });

  return withSerwist(withNextIntl({}));
};

export default nextConfig;
