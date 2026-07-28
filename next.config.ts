import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Evitar que node:sqlite sea bundleado por Webpack — debe correr en Node.js nativo
  serverExternalPackages: [],

  // Exponer node:sqlite como externo para las API routes
  webpack: (config, { isServer }) => {
    if (isServer) {
      // node: built-ins no necesitan configuración especial en Next.js 14+
      // pero lo explicitamos para claridad
      config.externals = [...(config.externals || [])];
    }
    return config;
  },

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
