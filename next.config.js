/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
    esmExternals: 'loose'
  },
  transpilePackages: ['ol', 'rlayers']
}

module.exports = nextConfig;