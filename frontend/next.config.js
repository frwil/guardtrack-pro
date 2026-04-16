/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  // Optimisation des packages pour réduire la taille du bundle
  experimental: {
    optimizePackageImports: [
      '@tensorflow/tfjs',
      '@tensorflow-models/coco-ssd',
      '@tensorflow-models/mobilenet',
      '@fortawesome/fontawesome-svg-core',
      '@fortawesome/free-solid-svg-icons',
      '@fortawesome/react-fontawesome',
    ],
  },
  
  // Rewrites pour l'API - Proxy pour éviter CORS
  async rewrites() {
    // URL de l'API en production (Northflank)
    const API_URL = process.env.NEXT_PUBLIC_API_URL?.startsWith('/') 
      ? 'https://p01--guardtrack-pro--96wvzhf85lqw.code.run/api'
      : (process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000/api');
    
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/:path*`,
      },
    ]
  },
  
  // Configuration Webpack pour TensorFlow.js
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Résoudre les modules Node.js pour le navigateur
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        perf_hooks: false,
        worker_threads: false,
      };
      
      // Ignorer les warnings de taille pour TensorFlow
      config.performance = {
        ...config.performance,
        maxAssetSize: 10000000, // 10 MB
        maxEntrypointSize: 10000000, // 10 MB
      };
    }
    
    // Exclure TensorFlow du SSR pour éviter les erreurs
    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        '@tensorflow/tfjs',
        '@tensorflow-models/coco-ssd',
        '@tensorflow-models/mobilenet',
      ];
    }
    
    return config;
  },
  
  reactStrictMode: true,
  
  // Configuration des images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Headers pour les Service Workers et CORS
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;