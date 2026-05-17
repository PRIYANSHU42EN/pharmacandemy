import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase/client';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://cubepharm.com';

  // Fetch dynamic IDs from Supabase
  const [{ data: courses }, { data: subjects }, { data: resources }] = await Promise.all([
    supabase.from('courses').select('id, updated_at'),
    supabase.from('subjects').select('id, updated_at'),
    supabase.from('resources').select('id, updated_at'),
  ]);

  const courseUrls = (courses || []).map((course) => ({
    url: `${baseUrl}/courses/${course.id}`,
    lastModified: course.updated_at || new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const subjectUrls = (subjects || []).map((subject) => ({
    url: `${baseUrl}/subjects/${subject.id}`,
    lastModified: subject.updated_at || new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const resourceUrls = (resources || []).map((resource) => ({
    url: `${baseUrl}/resources/${resource.id}`,
    lastModified: resource.updated_at || new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const staticUrls = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/courses`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/marketplace`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
  ];

  return [...staticUrls, ...courseUrls, ...subjectUrls, ...resourceUrls];
}
