import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  reactCompiler: true,
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/events",
        permanent: false,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "statics.pancake.vn",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
