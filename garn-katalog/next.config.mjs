import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/garn',
  reactStrictMode: true,
  // Repo har lockfile både i rod og i garn-katalog — peg eksplicit på workspace-rod
  outputFileTracingRoot: path.join(__dirname, '..'),
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
}

export default nextConfig
