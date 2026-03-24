import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
  // Tietoturvaheaderit asetetaan Nginx-konfiguraatiossa (static export
  // ei tue headers()-funktiota). Katso nginx-esimerkki projektin README:stä.
}

export default nextConfig
