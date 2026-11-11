import type { NextConfig } from 'next'

// Headers that do not change per request. The Content-Security-Policy, which
// needs a fresh nonce each time, is set in proxy.ts.
const config: NextConfig = {
  // A self-contained server for the container (Dockerfile), without node_modules.
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=(), payment=(), usb=(), publickey-credentials-get=(self), publickey-credentials-create=(self)',
          },
        ],
      },
    ]
  },
}

export default config
