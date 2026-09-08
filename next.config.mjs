/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const inferenceService =
      process.env.NEXT_PUBLIC_INFERENCE_BASE_URL || "http://localhost:8001";

    return [
      {
        source: "/api/inference/:path*",
        destination: `${inferenceService}/:path*`,
      },
    ];
  },
};

export default nextConfig;
