import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /**
   * `output: 'standalone'` produit un serveur Node minimal, compatible avec
   * un hébergement de type Railway ou conteneur. Inutile sur Vercel, où la
   * plateforme pilote le déploiement — mais inoffensif.
   */
  output: 'standalone',

  /**
   * Variables d'environnement exposées côté navigateur.
   *
   * Volontairement la plus courte possible : au-delà d'une URL d'API, aucun
   * secret ne doit jamais être exposé au client, car tout ce qui porte le
   * préfixe `NEXT_PUBLIC_` est compilé dans un bundle public.
   * Les clés d'API appartiennent au backend.
   */
  env: {},

  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default nextConfig;