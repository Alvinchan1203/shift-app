import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  staleTimes: {
    dynamic: 30,
    static: 300,
  },
};

export default nextConfig;
