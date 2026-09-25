const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
]

export default {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['firebase-admin'],
  async headers() {
    return [{ source: '/:path*', headers: [...securityHeaders, { key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }]
  }
}
