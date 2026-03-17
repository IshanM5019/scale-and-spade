/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Forward /api/v1/* to the FastAPI backend during development
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
