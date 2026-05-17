import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/dashboard/',
        '/profile/',
        '/api/',
        '/my-chat/',
        '/urgent-help/tickets/',
        '/oauth/',
      ],
    },
    sitemap: 'https://cubepharm.com/sitemap.xml',
  };
}
