import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // @libsql/client usa módulos nativos, no debe ser bundleado
  serverExternalPackages: ['@libsql/client'],
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
