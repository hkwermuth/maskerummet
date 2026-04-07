/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/garn',
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
}

export default nextConfig
