import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Evitar que node:sqlite sea bundleado por Webpack — debe correr en Node.js nativo
  serverExternalPackages: ['node:sqlite'],
  turbopack: {},

  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
