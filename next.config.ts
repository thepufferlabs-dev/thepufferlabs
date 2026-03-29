import type { NextConfig } from "next";

const repoName = process.env.NEXT_PUBLIC_REPO_NAME || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath: repoName ? `/${repoName}` : "",
  assetPrefix: repoName ? `/${repoName}/` : "",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
