/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['pdfjs-dist', 'canvas', 'tesseract.js'],
  },
};

export default nextConfig;
