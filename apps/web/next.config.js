/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import { env } from "./src/env.js";
import { remotePathRewrites } from "./src/trpc/remote-paths.js";

/** @type {import("next").NextConfig} */
const config = {
  transpilePackages: [
    "@repo/api",
    "@repo/db",
    "@repo/domain",
    "@repo/validators",
  ],
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    if (!env.API_ORIGIN) return [];
    return {
      beforeFiles: remotePathRewrites(env.API_ORIGIN),
      afterFiles: [
        {
          source: "/api/remote/:path*",
          destination: `${env.API_ORIGIN}/api/:path*`,
        },
      ],
      fallback: [],
    };
  },
  async redirects() {
    return [
      {
        source: "/dashboard/hub",
        destination: "/dashboard/groups",
        permanent: true,
      },
    ];
  },
};

export default config;
