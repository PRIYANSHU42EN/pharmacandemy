"use client";

import { useState, useEffect, useRef } from "react";
// import { supabase } from "@/lib/supabase/client"; // DISABLED for security proxy
import { db } from "@/lib/firebase/config";
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  limit, 
  onSnapshot, 
  doc, 
  updateDoc 
} from "firebase/firestore";
import type { Course, Semester, Subject, Resource, UserProfile } from "@/types";

// ---------------------------------------------------------------------------
// Shared global cache to prevent redundant initial fetches & loaders
// ---------------------------------------------------------------------------
const dataCache = new Map<string, any>();

// ---------------------------------------------------------------------------
// Shared helper: prevent state updates after unmount
// ---------------------------------------------------------------------------
function useMountedRef() {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  return mounted;
}

// ---------------------------------------------------------------------------
// useCourses — real-time listener for active courses (MIGRATED TO SUPABASE)
// ---------------------------------------------------------------------------
export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [refreshCount, setRefreshCount] = useState(0);
  const mounted = useMountedRef();

  useEffect(() => {
    async function fetchCourses() {
      try {
        // Initial fetch from cached API
        const response = await fetch('/api/courses');
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error || 'Failed to fetch courses');
        
        if (mounted.current) {
          setCourses(data);
          setError(null);
        }
      } catch (err: any) {
        console.warn("[Cache] useCourses API fail, falling back to Supabase:", err.message);
        // Fallback to direct Supabase
        try {
          const { data, error } = await supabase
            .from('courses')
            .select('*')
            .eq('is_active', true)
            .order('order', { ascending: true });
          
          if (error) throw error;
          
          if (mounted.current) {
            const mapped = (data || []).map(c => ({
              id: c.id,
              name: c.name,
              code: c.code,
              description: c.description,
              order: c.order,
              isActive: c.is_active,
              createdAt: c.created_at,
              updatedAt: c.updated_at
            }));

            setCourses(mapped as any);
            setError(null);
          }
        } catch (fallbackErr: any) {
          if (mounted.current) setError(fallbackErr);
        }
      } finally {
        if (mounted.current) setLoading(false);
      }
    }
    fetchCourses();

    // Real-time disabled in Secure Proxy Mode
    // const channel = supabase
    //   .channel('courses-changes')
    //   .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, () => {
    //     fetchCourses();
    //   })
    //   .subscribe();

    // return () => { channel.unsubscribe(); };
  }, [refreshCount]);

  return { courses, loading, error, refresh: () => { setRefreshCount(c => c + 1); setLoading(true); } };
}

// ---------------------------------------------------------------------------
// useCourse — real-time listener for a single course
// ---------------------------------------------------------------------------
export function useCourse(courseId: string) {
  const cacheKey = `useCourse_${courseId}`;
  const [course, setCourse] = useState<Course | null>(dataCache.get(cacheKey) || null);
  const [loading, setLoading] = useState(!dataCache.has(cacheKey));
  const [error, setError] = useState<Error | null>(null);
  const mounted = useMountedRef();

  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    async function fetchCourse() {
      try {
        const response = await fetch(`/api/courses?id=${courseId}`);
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error || 'Failed to fetch course');
        
        if (mounted.current) {
          setCourse(data);
          dataCache.set(cacheKey, data);
          setError(null);
        }
      } catch (err: any) {
        console.error("[API] useCourse error:", err.message);
        if (mounted.current) setError(err);
      } finally {
        if (mounted.current) setLoading(false);
      }
    }
    fetchCourse();
  }, [courseId, refreshCount]);

  return { course, loading, error, refresh: () => { setRefreshCount(c => c + 1); setLoading(true); } };
}

// ---------------------------------------------------------------------------
// useSemesters — real-time listener for semesters within a course
// ---------------------------------------------------------------------------
export function useSemesters(courseId: string) {
  const cacheKey = `useSemesters_${courseId}`;
  const [semesters, setSemesters] = useState<Semester[]>(dataCache.get(cacheKey) || []);
  const [loading, setLoading] = useState(!dataCache.has(cacheKey));
  const [error, setError] = useState<Error | null>(null);
  const mounted = useMountedRef();

  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    async function fetchSemesters() {
      try {
        const response = await fetch(`/api/semesters?courseId=${courseId}`);
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error || 'Failed to fetch semesters');
        
        if (mounted.current) {
          setSemesters(data);
          dataCache.set(cacheKey, data);
          setError(null);
        }
      } catch (err: any) {
        console.error("[API] useSemesters error:", err.message);
        if (mounted.current) setError(err);
      } finally {
        if (mounted.current) setLoading(false);
      }
    }
    fetchSemesters();
    
    // Real-time disabled
  }, [courseId, refreshCount]);

  return { semesters, loading, error, refresh: () => { setRefreshCount(c => c + 1); setLoading(true); } };
}

// ---------------------------------------------------------------------------
// useSemester — real-time listener for a single semester
// ---------------------------------------------------------------------------
export function useSemester(semesterId: string) {
  const cacheKey = `useSemester_${semesterId}`;
  const [semester, setSemester] = useState<Semester | null>(dataCache.get(cacheKey) || null);
  const [loading, setLoading] = useState(!dataCache.has(cacheKey));
  const [error, setError] = useState<Error | null>(null);
  const mounted = useMountedRef();

  useEffect(() => {
    async function fetchSemester() {
      try {
        const response = await fetch(`/api/semesters?id=${semesterId}`);
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error || 'Failed to fetch semester');
        
        if (mounted.current) {
          setSemester(data);
          dataCache.set(cacheKey, data);
          setError(null);
        }
      } catch (err: any) {
        console.error("[API] useSemester error:", err.message);
        if (mounted.current) setError(err);
      } finally {
        if (mounted.current) setLoading(false);
      }
    }
    fetchSemester();
  }, [semesterId]);

  return { semester, loading, error };
}

// ---------------------------------------------------------------------------
// useAllSubjects — fetch all subjects for search
// ---------------------------------------------------------------------------
export function useAllSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchAllSubjects() {
      try {
        const response = await fetch('/api/subjects?all=true'); // Assume we add support for all=true or just fetch many
        // Actually, let's just fetch without courseId if we want all
        const resp = await fetch('/api/admin/content?table=subjects'); // Admin content API returns all
        // Or better, let's just fetch with a limit or something.
        // For now, let's just fetch from subjects API without courseId if we can.
        const res = await fetch('/api/subjects?courseId=all'); // We'll handle this in the API
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || 'Failed to fetch subjects');
        
        if (mounted.current) {
          setSubjects(data);
          setError(null);
        }
      } catch (err: any) {
        console.error("[API] useAllSubjects error:", err.message);
        if (mounted.current) setError(err);
      } finally {
        if (mounted.current) setLoading(false);
      }
    }
    fetchAllSubjects();
  }, []);

  return { subjects, loading, error };
}

// ---------------------------------------------------------------------------
export function useSubjects(courseId: string) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const mounted = useMountedRef();

  useEffect(() => {
    if (!courseId) {
      setLoading(false);
      return;
    }
    async function fetchSubjects() {
      try {
        // Initial fetch from cached API
        const response = await fetch(`/api/subjects?courseId=${courseId}`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Failed to fetch subjects');

        if (mounted.current) {
          setSubjects(data);
          setError(null);
        }
      } catch (err: any) {
        console.warn("[Cache] useSubjects API fail, falling back to Supabase:", err.message);
        // Fallback to direct Supabase
        try {
          const { data, error } = await supabase
            .from('subjects')
            .select('*')
            .eq('course_id', courseId)
            .order('name', { ascending: true });
          
          if (error) throw error;
          
          if (mounted.current) {
            const mapped = (data || []).map(s => ({
              id: s.id,
              courseId: s.course_id,
              semesterNumber: s.semester_number,
              name: s.name,
              description: s.description,
              coverImageUrl: s.cover_image_url,
              isPremium: s.is_premium,
              resourceCount: s.resource_count,
              createdAt: s.created_at,
              updatedAt: s.updated_at
            }));

            setSubjects(mapped as any);
            setError(null);
          }
        } catch (fallbackErr: any) {
          if (mounted.current) setError(fallbackErr);
        }
      } finally {
        if (mounted.current) setLoading(false);
      }
    }
    fetchSubjects();

    const channel = supabase
      .channel(`subjects-${courseId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subjects', filter: `course_id=eq.${courseId}` }, () => {
        fetchSubjects();
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [courseId, refreshCount]);

  return { subjects, loading, error, refresh: () => { setRefreshCount(c => c + 1); setLoading(true); } };
}

// ---------------------------------------------------------------------------
// useSubject — real-time listener for a single subject
// ---------------------------------------------------------------------------
export function useSubject(subjectId: string) {
  const cacheKey = `useSubject_${subjectId}`;
  const [subject, setSubject] = useState<Subject | null>(dataCache.get(cacheKey) || null);
  const [loading, setLoading] = useState(!dataCache.has(cacheKey));
  const [error, setError] = useState<Error | null>(null);
  const mounted = useMountedRef();

  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    if (!subjectId) {
      setLoading(false);
      return;
    }
    async function fetchSubject() {
      try {
        const response = await fetch(`/api/subjects?id=${subjectId}`);
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error || 'Failed to fetch subject');
        
        if (mounted.current) {
          setSubject(data);
          dataCache.set(cacheKey, data);
          setError(null);
        }
      } catch (err: any) {
        console.error("[API] useSubject error:", err.message);
        if (mounted.current) setError(err);
      } finally {
        if (mounted.current) setLoading(false);
      }
    }
    fetchSubject();
  }, [subjectId, refreshCount]);

  return { subject, loading, error, refresh: () => { setRefreshCount(c => c + 1); setLoading(true); } };
}

// ---------------------------------------------------------------------------
// useResources — listener for resources within a subject (MIGRATED TO SUPABASE)
// ---------------------------------------------------------------------------
export function useResources(subjectId: string) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mounted = useMountedRef();

  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    if (!subjectId) {
      setLoading(false);
      return;
    }

    async function fetchResources() {
      try {
        // Initial fetch from cached API
        const response = await fetch(`/api/resources/list?subjectId=${subjectId}`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Failed to fetch resources');

        if (mounted.current) {
          setResources(data);
          setError(null);
        }
      } catch (err: any) {
        console.warn("[Cache] useResources API fail, falling back to Supabase:", err.message);
        // Fallback to direct Supabase
        try {
          const { data, error } = await supabase
            .from('resources')
            .select('*')
            .eq('subject_id', subjectId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          
          if (mounted.current) {
            const mapped = (data || []).map(r => ({
              id: r.id,
              title: r.title,
              description: r.description,
              type: r.type,
              url: r.url,
              subjectId: r.subject_id,
              courseId: r.course_id,
              isPremium: r.is_premium,
              previewImageUrl: r.preview_image_url,
              tags: r.tags || [],
              year: r.year,
              createdAt: r.created_at,
              updatedAt: r.updated_at
            }));

            setResources(mapped as any);
            setError(null);
          }
        } catch (fallbackErr: any) {
          if (mounted.current) setError(fallbackErr);
        }
      } finally {
        if (mounted.current) setLoading(false);
      }
    }

    fetchResources();

    fetchResources();

    // Real-time disabled
  }, [subjectId, refreshCount]);

  return { resources, loading, error, refresh: () => { setRefreshCount(c => c + 1); setLoading(true); } };
}

// ---------------------------------------------------------------------------
// useResource — real-time listener for a single resource document
// ---------------------------------------------------------------------------
export function useResource(resourceId: string) {
  const cacheKey = `useResource_${resourceId}`;
  const [resource, setResource] = useState<Resource | null>(dataCache.get(cacheKey) || null);
  const [loading, setLoading] = useState(!dataCache.has(cacheKey));
  const [error, setError] = useState<Error | null>(null);
  const mounted = useMountedRef();

  useEffect(() => {
    if (!resourceId) {
      setLoading(false);
      return;
    }

    async function fetchResource() {
      try {
        const response = await fetch(`/api/resources/list?id=${resourceId}`);
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error || 'Failed to fetch resource');
        
        if (mounted.current) {
          setResource(data);
          dataCache.set(cacheKey, data);
          setError(null);
        }
      } catch (err: any) {
        console.error("[API] useResource error:", err.message);
        if (mounted.current) setError(err);
      } finally {
        if (mounted.current) setLoading(false);
      }
    }

    fetchResource();
  }, [resourceId]);

  return { resource, loading, error };
}
// ---------------------------------------------------------------------------
// Admin Support Hooks (Steps 2-3)
// ---------------------------------------------------------------------------

/**
 * Real-time stats for admin dashboard
 */
export function useAdminStats() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    premiumUsers: 0,
    activeToday: 0,
    totalResources: 0,
    paymentCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const { auth } = await import("@/lib/firebase/config");
        const user = auth.currentUser;
        if (!user) return;
        
        const token = await user.getIdToken();
        const response = await fetch('/api/admin/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (response.ok) {
          setStats({
            totalUsers: data.totalUsers || 0,
            premiumUsers: data.premiumUsers || 0,
            activeToday: data.loginsToday || 0,
            totalResources: data.totalResources || 0,
            paymentCount: 0,
          });
        }
      } catch (err) {
        console.warn("[AdminStats] API error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();

    // Real-time updates disabled
    // const channel = supabase.channel('admin-stats-updates')
    //   .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, () => fetchStats())
    //   .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchStats())
    //   .subscribe();

    // return () => { supabase.removeChannel(channel); };
  }, []);

  return { stats, loading };
}

/**
 * Advanced real-time analytics for the dashboard
 */
export function useRealtimeAnalytics() {
  const [events, setEvents] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    activeNow: 0,
    viewsToday: 0,
    loginsToday: 0,
    topResources: [] as { id: string; count: number }[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInitialData() {
      try {
        const { auth } = await import("@/lib/firebase/config");
        const user = auth.currentUser;
        if (!user) return;
        
        const token = await user.getIdToken();
        const response = await fetch('/api/admin/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (response.ok) {
          setMetrics(prev => ({
            ...prev,
            activeNow: data.activeNow || 0,
            loginsToday: data.loginsToday || 0,
          }));
        }
      } catch (err) {
        console.error("[Analytics] API error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchInitialData();

    // Real-time disabled
    // const channel = supabase.channel('realtime-analytics')
    //   .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'analytics_events' }, (payload) => {
    //     ...
    //   })
    //   .subscribe();

    // return () => { channel.unsubscribe(); };
  }, []);

  return { events, metrics, loading };
}

export function useAdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    async function loadUsers() {
      try {
        const { auth } = await import("@/lib/firebase/config");
        const user = auth.currentUser;
        if (!user) return;

        const token = await user.getIdToken();
        const response = await fetch('/api/admin/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (isSubscribed && response.ok) {
          const mapped = data.map((u: any) => ({
            uid: u.id,
            email: u.email,
            displayName: u.name || u.email?.split('@')[0] || "User",
            role: u.role || 'user',
            isPremium: u.is_premium,
            createdAt: u.created_at,
            updatedAt: u.updated_at
          }));
          setUsers(mapped);
        } else if (!response.ok) {
          throw new Error(data.error || "Failed to fetch users");
        }
      } catch (err: any) {
        console.error("[AdminUsers] API load failed:", err);
        if (isSubscribed) setError(err);
      } finally {
        if (isSubscribed) setLoading(false);
      }
    }

    loadUsers();
    
    // Real-time disabled
  }, []);

  return { users, loading, error };
}
