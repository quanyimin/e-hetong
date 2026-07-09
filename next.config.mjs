/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdfjs-dist', 'canvas', 'tesseract.js'],
  },
};

export default nextConfig;
