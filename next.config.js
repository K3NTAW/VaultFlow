/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Tauri requires specific output configuration
  output: 'export',
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
