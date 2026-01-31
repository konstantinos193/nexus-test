import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const require = createRequire(import.meta.url)

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow dev server access from other devices (e.g. phone at 192.168.1.140)
  allowedDevOrigins: ['192.168.1.140'],
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
        protocol: 'https',
        hostname: 'placehold.net',
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
    optimizePackageImports: ['lucide-react'],
    // esmExternals: 'loose' removed – not supported by Turbopack. Use next dev --webpack / next build --webpack so @solana/web3.js CJS alias applies.
  },
  // Turbopack: root = this app (avoids wrong workspace root when multiple lockfiles exist)
  turbopack: {
    root: __dirname,
  },
  // Webpack configuration for better code splitting
  // Note: Next.js has excellent default code splitting, so we only enhance it
  // This will be used when running with --webpack flag
  webpack: (config, { isServer, dev }) => {
    // Do NOT alias @noble/hashes/utils to @noble/hashes (root).
    // @noble/hashes throws "root module cannot be imported: import submodules instead"
    // when the root is imported. Submodules like @noble/hashes/utils must resolve as-is.

    // Force @solana/web3.js to use the browser CJS build so its require('bn.js') works.
    // The ESM build does "import BN from 'bn.js'" which triggers ESM wrapping of bn.js,
    // and bn.js uses module.exports so it throws "ES Modules may not assign module.exports".
    config.resolve.alias = {
      ...config.resolve.alias,
      '@solana/web3.js': join(__dirname, 'node_modules/@solana/web3.js/lib/index.browser.cjs.js'),
    }

    // Explicit resolution for Next.js internals (avoids "Can't resolve next-flight-client-entry-loader" and "Cannot find module next/dist/pages/_error" on Windows / dev).
    try {
      config.resolve.alias['next/dist/pages/_error'] = require.resolve('next/dist/pages/_error')
    } catch (_) {}
    config.resolveLoader = config.resolveLoader || {}
    config.resolveLoader.alias = {
      ...config.resolveLoader.alias,
      ...(function () {
        try {
          return {
            'next-flight-client-entry-loader': require.resolve(
              'next/dist/build/webpack/loaders/next-flight-client-entry-loader.js'
            ),
          }
        } catch (_) {
          return {}
        }
      })(),
    }

    // Treat bn.js (and nested copy under @solana/web3.js) as CommonJS so module.exports is allowed.
    config.module.rules.push({
      test: /[\\/]node_modules[\\/](@solana[\\/]web3\.js[\\/]node_modules[\\/])?bn\.js[\\/]/,
      type: 'javascript/auto',
      resolve: { fullySpecified: false },
    })

    // Ignore warnings for noble/reown modules and Solana bn.js (CJS default export in ESM)
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /node_modules\/@reown\/appkit-controllers/,
      },
      {
        module: /node_modules\/@noble\/curves/,
      },
      {
        module: /node_modules\/@solana\/web3\.js/,
        message: /bn\.js.*default export/,
      },
    ]
    
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
              test: /[\\/]node_modules[\\/](@solana|@phantom)[\\/]/,
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
  // Do NOT add @solana/web3.js or @noble/curves: transpiling converts BigInt ** to Math.pow(), which throws.
  // Next.js 16 defaults to Turbopack; "yarn dev" / "yarn build" use --webpack so the @solana/web3.js CJS alias applies.
  transpilePackages: [
    '@solana/wallet-adapter-react',
    '@solana/wallet-adapter-base',
  ],
  // Production optimizations
  productionBrowserSourceMaps: false, // Disable source maps in production for smaller bundles
  poweredByHeader: false, // Remove X-Powered-By header for security
  // Optimize output
  output: 'standalone', // Creates optimized standalone build
}

export default nextConfig
