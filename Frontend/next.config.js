/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable production optimizations (swcMinify removed – default in Next.js 16)
  compress: true,
  // Add caching and performance headers
  async headers() {
    return [
      {
        // Cache static assets aggressively
        source: '/api/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache Next.js static files
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache fonts
        source: '/_next/static/media/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
  // Optimize images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '',
        pathname: '/**',
      },
    ],
    // Enable image optimization
    formats: ['image/avif', 'image/webp'],
    // Optimize image loading
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Enable SVG optimization
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Optimize JavaScript bundles
  experimental: {
    // Only optimize packages that are actually used
    // framer-motion removed as it's not used in source code
    optimizePackageImports: ['lucide-react'],
  },
  // Turbopack configuration (Next.js 16+ uses Turbopack by default)
  // Empty config to silence the warning - Turbopack handles code splitting automatically
  turbopack: {},
  // Webpack configuration for better code splitting
  // Note: Next.js has excellent default code splitting, so we only enhance it
  // This will be used when running with --webpack flag
  webpack: (config, { isServer, dev }) => {
    if (!isServer && !dev) {
      // Only optimize in production builds
      // Enhance Next.js's default splitChunks for better caching
      const existingCacheGroups = config.optimization?.splitChunks?.cacheGroups || {}
      
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization?.splitChunks,
          cacheGroups: {
            ...existingCacheGroups,
            // Web3 libraries in separate chunk (only load when needed)
            // This helps since Web3 libraries are heavy but not always used
            web3: {
              name: 'web3',
              test: /[\\/]node_modules[\\/](@?wagmi|viem|ethers|@web3modal|@phantom)[\\/]/,
              priority: 20,
              reuseExistingChunk: true,
              chunks: 'async', // Only load when needed (dynamic imports)
            },
          },
        },
      }
    }
    return config
  },
  // Compiler options - target modern browsers to reduce polyfills
  compiler: {
    // Remove console.log in production (optional, but helps with bundle size)
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // Keep errors and warnings
    } : false,
  },
  // Target modern browsers to reduce polyfills
  // This reduces the 13 KiB of legacy JavaScript
  transpilePackages: [],
  // Production optimizations
  productionBrowserSourceMaps: false, // Disable source maps in production for smaller bundles
  poweredByHeader: false, // Remove X-Powered-By header for security
  // Optimize output
  output: 'standalone', // Creates optimized standalone build
}

export default nextConfig
