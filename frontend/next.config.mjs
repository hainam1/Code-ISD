/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5000';

    return {
      fallback: [
        {
          source: '/api/:path*',
          destination: `${backendBaseUrl}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
