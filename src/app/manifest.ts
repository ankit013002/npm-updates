import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'npm tracker',
    short_name: 'npm tracker',
    description: 'Track npm package updates, semver drift, and release notes',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#090a0a',
    theme_color: '#090a0a',
    icons: [
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
