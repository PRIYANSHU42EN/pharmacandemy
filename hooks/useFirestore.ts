"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { auth } from "@/lib/firebase/config";
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
  const [courses, setCourses] = useState<Course[]>(dataCache.get('useCourses') || []);
  const [loading, setLoading] = useState(!dataCache.has('useCourses'));
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
          dataCache.set('useCourses', data);
          setError(null);
        }
      } catch (err: any) {
        console.error("[API] useCourses error:", err.message);
        if (mounted.current) setError(err);
      } finally {
        if (mounted.current) setLoading(false);
      }
    }
    fetchCourses();
    
    let timer: any = null;
    const channel = supabase
      .channel('public:courses')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(fetchCourses, 500);
      })
      .subscribe();

    return () => { 
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [refreshCount]);

  const refresh = useCallback(() => { 
    setRefreshCount(c => c + 1); 
    setLoading(true); 
  }, []);

  return useMemo(() => ({ 
    courses, 
    loading, 
    error, 
    refresh 
  }), [courses, loading, error, refresh]);
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

  const refresh = useCallback(() => { 
    setRefreshCount(c => c + 1); 
    setLoading(true); 
  }, []);

  return useMemo(() => ({ 
    course, 
    loading, 
    error, 
    refresh 
  }), [course, loading, error, refresh]);
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

  const refresh = useCallback(() => { 
    setRefreshCount(c => c + 1); 
    setLoading(true); 
  }, []);

  return useMemo(() => ({ 
    semesters, 
    loading, 
    error, 
    refresh 
  }), [semesters, loading, error, refresh]);
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

  return useMemo(() => ({ semester, loading, error }), [semester, loading, error]);
}

// ---------------------------------------------------------------------------
// useAllSubjects — fetch all subjects for search
// ---------------------------------------------------------------------------
export function useAllSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const mounted = useMountedRef();
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    async function fetchAllSubjects() {
      try {
        const res = await fetch('/api/subjects?courseId=all');
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

    let timer: any = null;
    const channel = supabase
      .channel('public:subjects:all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subjects' }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(fetchAllSubjects, 500);
      })
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [refreshCount]);

  return useMemo(() => ({ subjects, loading, error }), [subjects, loading, error]);
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
        console.error("[API] useSubjects error:", err.message);
        if (mounted.current) setError(err);
      } finally {
        if (mounted.current) setLoading(false);
      }
    }
    fetchSubjects();

    let timer: any = null;
    const channel = supabase
      .channel(`public:subjects:${courseId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'subjects',
        filter: courseId !== 'all' ? `course_id=eq.${courseId}` : undefined
      }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(fetchSubjects, 500);
      })
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [courseId, refreshCount]);

  const refresh = useCallback(() => { 
    setRefreshCount(c => c + 1); 
    setLoading(true); 
  }, []);

  return useMemo(() => ({ 
    subjects, 
    loading, 
    error, 
    refresh 
  }), [subjects, loading, error, refresh]);
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
        
        if (!response.ok) {
          if (response.status === 404) {
            console.warn(`[API] useSubject: Subject ${subjectId} not found`);
            if (mounted.current) {
              setSubject(null);
              setError(null);
            }
            return;
          }
          throw new Error(data.error || 'Failed to fetch subject');
        }
        
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

  const refresh = useCallback(() => { 
    setRefreshCount(c => c + 1); 
    setLoading(true); 
  }, []);

  return useMemo(() => ({ 
    subject, 
    loading, 
    error, 
    refresh 
  }), [subject, loading, error, refresh]);
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
        console.error("[API] useResources error:", err.message);
        if (mounted.current) setError(err);
      } finally {
        if (mounted.current) setLoading(false);
      }
    }

    fetchResources();

    let timer: any = null;
    const channel = supabase
      .channel(`public:resources:${subjectId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'resources',
        filter: `subject_id=eq.${subjectId}`
      }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(fetchResources, 500);
      })
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [subjectId, refreshCount]);

  const refresh = useCallback(() => { 
    setRefreshCount(c => c + 1); 
    setLoading(true); 
  }, []);

  return useMemo(() => ({ 
    resources, 
    loading, 
    error, 
    refresh 
  }), [resources, loading, error, refresh]);
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

  return useMemo(() => ({ resource, loading, error }), [resource, loading, error]);
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
    let isSubscribed = true;
    
    async function fetchStats() {
      try {
        const user = auth.currentUser;
        if (!user) return;
        
        const token = await user.getIdToken();
        const response = await fetch('/api/admin/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (isSubscribed && response.ok) {
          setStats({
            totalUsers: data.totalUsers || 0,
            premiumUsers: data.premiumUsers || 0,
            activeToday: data.activeToday || 0,
            totalResources: data.totalResources || 0,
            paymentCount: data.paymentCount || 0,
          });
        }
      } catch (err) {
        console.warn("[AdminStats] API error:", err);
      } finally {
        if (isSubscribed) setLoading(false);
      }
    }

    const unsubscribe = auth.onIdTokenChanged((user) => {
      if (user) {
        fetchStats();
      } else {
        setLoading(false);
      }
    });

    let timer: any = null;
    const channel = supabase.channel('admin-stats-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(fetchStats, 500);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(fetchStats, 500);
      })
      .subscribe();

    return () => {
      isSubscribed = false;
      if (timer) clearTimeout(timer);
      unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  return useMemo(() => ({ stats, loading }), [stats, loading]);
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
    let isSubscribed = true;

    async function fetchInitialData() {
      try {
        const user = auth.currentUser;
        if (!user) return;
        
        const token = await user.getIdToken();
        const response = await fetch('/api/admin/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (isSubscribed && response.ok) {
          setMetrics(prev => ({
            ...prev,
            activeNow: data.activeNow || 0,
            loginsToday: data.loginsToday || 0,
            viewsToday: data.viewsToday || 0,
            activeToday: data.activeToday || 0,
          }));
          if (data.events) {
            setEvents(data.events);
          }
        }
      } catch (err) {
        console.error("[Analytics] API error:", err);
      } finally {
        if (isSubscribed) setLoading(false);
      }
    }

    const unsubscribe = auth.onIdTokenChanged((user) => {
      if (user) {
        fetchInitialData();
      } else {
        setLoading(false);
      }
    });

    const channel = supabase.channel('realtime-analytics')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'analytics_events' }, (payload) => {
        const newEvent = payload.new;
        
        // Phase 7: Update only changed values, do not refetch
        setEvents(prev => {
          // Format the event to match the API structure
          const formattedEvent = {
            ...newEvent,
            userName: newEvent.metadata?.title ? `User on ${newEvent.metadata.title}` : "Active User",
            userEmail: "Live Activity"
          };
          return [formattedEvent, ...prev].slice(0, 50);
        });
        
        setMetrics(prev => {
          const updated = { ...prev };
          if (newEvent.event_type === 'login') updated.loginsToday++;
          if (newEvent.event_type === 'view') updated.viewsToday++;
          // For activeNow and activeToday, they are unique counts, so a naive increment might overcount if the user is already active.
          // However, for immediate visual feedback without a full DB scan, we assume activity is happening.
          return updated;
        });
      })
      .subscribe();

    return () => {
      isSubscribed = false;
      unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  return useMemo(() => ({ events, metrics, loading }), [events, metrics, loading]);
}

export function useAdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    async function loadUsers(user: any) {
      try {
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
            premiumExpiry: u.premium_expires_at,
            createdAt: u.created_at,
            updatedAt: u.updated_at
          }));
          setUsers(mapped);
          setError(null);
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

    const unsubscribe = auth.onIdTokenChanged((user) => {
      if (user) {
        loadUsers(user);
      } else {
        setLoading(false);
      }
    });

    const channel = supabase.channel('admin-users-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        if (auth.currentUser) loadUsers(auth.currentUser);
      })
      .subscribe();

    return () => {
      isSubscribed = false;
      unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  return { users, loading, error };
}

// ---------------------------------------------------------------------------
// ADMIN HOOKS - Bypasses Public Cache & Filters
// ---------------------------------------------------------------------------

export function useAdminCourses() {
  const [courses, setCourses] = useState<Course[]>(dataCache.get('admin:courses:all') || []);
  const [loading, setLoading] = useState(!dataCache.has('admin:courses:all'));
  const [error, setError] = useState<Error | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const mounted = useMountedRef();

  useEffect(() => {
    let isSubscribed = true;

    async function fetchAdminCourses(user: any) {
      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/admin/content?table=courses', {
          headers: { 'Authorization': `Bearer ${idToken}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch admin courses');
        const mapped = data.map((c: any) => ({
          ...c,
          isActive: c.is_active,
          createdAt: c.created_at,
          updatedAt: c.updated_at
        }));
        if (isSubscribed && mounted.current) {
          setCourses(mapped);
          dataCache.set('admin:courses:all', mapped);
          setError(null);
        }
      } catch (err: any) {
        if (isSubscribed && mounted.current) setError(err);
      } finally {
        if (isSubscribed && mounted.current) setLoading(false);
      }
    }

    const unsubscribe = auth.onIdTokenChanged((user) => {
      if (user) {
        fetchAdminCourses(user);
      } else {
        setLoading(false);
      }
    });
    
    let timer: any = null;
    const channel = supabase
      .channel('admin:courses')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          if (auth.currentUser) fetchAdminCourses(auth.currentUser);
        }, 500);
      })
      .subscribe();

    return () => {
      isSubscribed = false;
      if (timer) clearTimeout(timer);
      unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [refreshCount]);

  const refresh = useCallback(() => { 
    setRefreshCount(c => c + 1); 
    setLoading(true); 
  }, []);

  return useMemo(() => ({ 
    courses, 
    loading, 
    error, 
    refresh 
  }), [courses, loading, error, refresh]);
}

export function useAdminSubjects(courseId?: string) {
  const cacheKey = `admin:subjects:${courseId || 'all'}`;
  const [subjects, setSubjects] = useState<Subject[]>(dataCache.get(cacheKey) || []);
  const [loading, setLoading] = useState(!dataCache.has(cacheKey));
  const [error, setError] = useState<Error | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const mounted = useMountedRef();

  useEffect(() => {
    let isSubscribed = true;

    async function fetchAdminSubjects(user: any) {
      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/admin/content?table=subjects', {
          headers: { 'Authorization': `Bearer ${idToken}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch admin subjects');
        
        let filtered = data;
        if (courseId) {
          filtered = data.filter((s: any) => s.course_id === courseId);
        }
        
        const mapped = filtered.map((s: any) => ({
          ...s,
          courseId: s.course_id,
          semesterNumber: s.semester_number,
          isPremium: s.is_premium,
          createdAt: s.created_at,
          updatedAt: s.updated_at
        }));
        if (isSubscribed && mounted.current) {
          setSubjects(mapped);
          dataCache.set(cacheKey, mapped);
          setError(null);
        }
      } catch (err: any) {
        if (isSubscribed && mounted.current) setError(err);
      } finally {
        if (isSubscribed && mounted.current) setLoading(false);
      }
    }

    const unsubscribe = auth.onIdTokenChanged((user) => {
      if (user) {
        fetchAdminSubjects(user);
      } else {
        setLoading(false);
      }
    });
    
    let timer: any = null;
    const channel = supabase
      .channel('admin:subjects')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subjects' }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          if (auth.currentUser) fetchAdminSubjects(auth.currentUser);
        }, 500);
      })
      .subscribe();

    return () => {
      isSubscribed = false;
      if (timer) clearTimeout(timer);
      unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [courseId, refreshCount]);

  const refresh = useCallback(() => { 
    setRefreshCount(c => c + 1); 
    setLoading(true); 
  }, []);

  return useMemo(() => ({ 
    subjects, 
    loading, 
    error, 
    refresh 
  }), [subjects, loading, error, refresh]);
}

export function useAdminResources(subjectId?: string) {
  const cacheKey = `admin:resources:${subjectId || 'all'}`;
  const [resources, setResources] = useState<Resource[]>(dataCache.get(cacheKey) || []);
  const [loading, setLoading] = useState(!dataCache.has(cacheKey));
  const [error, setError] = useState<Error | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const mounted = useMountedRef();

  useEffect(() => {
    let isSubscribed = true;

    async function fetchAdminResources(user: any) {
      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/admin/content?table=resources', {
          headers: { 'Authorization': `Bearer ${idToken}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch admin resources');
        
        let filtered = data;
        if (subjectId) {
          filtered = data.filter((r: any) => r.subject_id === subjectId);
        }
        
        const mapped = filtered.map((r: any) => ({
          ...r,
          courseId: r.course_id,
          subjectId: r.subject_id,
          isPremium: r.is_premium,
          isDeleted: r.is_deleted,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        }));
        if (isSubscribed && mounted.current) {
          setResources(mapped);
          dataCache.set(cacheKey, mapped);
          setError(null);
        }
      } catch (err: any) {
        if (isSubscribed && mounted.current) setError(err);
      } finally {
        if (isSubscribed && mounted.current) setLoading(false);
      }
    }

    const unsubscribe = auth.onIdTokenChanged((user) => {
      if (user) {
        fetchAdminResources(user);
      } else {
        setLoading(false);
      }
    });
    
    let timer: any = null;
    const channel = supabase
      .channel('admin:resources')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          if (auth.currentUser) fetchAdminResources(auth.currentUser);
        }, 500);
      })
      .subscribe();

    return () => {
      isSubscribed = false;
      if (timer) clearTimeout(timer);
      unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [subjectId, refreshCount]);

  const refresh = useCallback(() => { 
    setRefreshCount(c => c + 1); 
    setLoading(true); 
  }, []);

  return useMemo(() => ({ 
    resources, 
    loading, 
    error, 
    refresh 
  }), [resources, loading, error, refresh]);
}
