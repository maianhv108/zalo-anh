/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@sales-zalo/shared'],
  // Fix lỗi "multiple modules with names that only differ in casing" trên Windows
  webpack: (config) => {
    config.resolve.symlinks = false;
    config.cache = false;
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:4000/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
