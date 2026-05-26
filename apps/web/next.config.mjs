/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages ship raw TS/TSX and are transpiled by Next.
  transpilePackages: ['@pulsegrid/ui', '@pulsegrid/types', '@pulsegrid/schemas', '@pulsegrid/utils'],
  eslint: {
    // Lint is run as its own CI step; don't fail the production build on it.
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: ['echarts', 'echarts-for-react'],
  },
  webpack: (config) => {
    // Allow TypeScript-style `.js` import specifiers to resolve to `.ts(x)`,
    // matching the Bundler module resolution used across the workspace.
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
};

export default nextConfig;
