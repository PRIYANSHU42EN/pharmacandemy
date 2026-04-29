"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
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
      } catch (err: any) {
        console.error("[Supabase] useCourses error:", err.message);
        if (mounted.current) setError(err);
      } finally {
        if (mounted.current) setLoading(false);
      }
    }
    fetchCourses();

    const channel = supabase
      .channel('courses-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, () => {
        fetchCourses();
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
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
    if (!courseId) {
      setLoading(false);
      return;
    }
    async function fetchCourse() {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single();
        
        if (error) throw error;
        
        if (mounted.current) {
          const mapped = {
            id: data.id,
            name: data.name,
            code: data.code,
            description: data.description,
            order: data.order,
            isActive: data.is_active,
            createdAt: data.created_at,
            updatedAt: data.updated_at
          };

          setCourse(mapped as any);
          dataCache.set(cacheKey, mapped);
          setError(null);
        }
      } catch (err: any) {
        console.error("[Supabase] useCourse error:", err.message);
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
    if (!courseId) {
      setSemesters([]);
      setLoading(false);
      return;
    }
    async function fetchSemesters() {
      try {
        const { data, error } = await supabase
          .from('semesters')
          .select('*')
          .eq('course_id', courseId)
          .eq('is_active', true)
          .order('number', { ascending: true });
        
        if (error) throw error;
        
        if (mounted.current) {
          const mapped = (data || []).map(s => ({
            id: s.id,
            courseId: s.course_id,
            number: s.number,
            name: s.name,
            isActive: s.is_active,
            createdAt: s.created_at,
            updatedAt: s.updated_at
          }));

          setSemesters(mapped as any);
          dataCache.set(cacheKey, mapped);
          setError(null);
        }
      } catch (err: any) {
        console.error("[Supabase] useSemesters error:", err.message);
        if (mounted.current) setError(err);
      } finally {
        if (mounted.current) setLoading(false);
      }
    }
    fetchSemesters();
    
    const channel = supabase
      .channel(`semesters-${courseId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'semesters', filter: `course_id=eq.${courseId}` }, () => {
        fetchSemesters();
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
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
    if (!semesterId) {
      setLoading(false);
      return;
    }
    async function fetchSemester() {
      try {
        const { data, error } = await supabase
          .from('semesters')
          .select('*')
          .eq('id', semesterId)
          .single();
        
        if (error) throw error;
        
        const mapped = {
          id: data.id,
          courseId: data.course_id,
          number: data.number,
          name: data.name,
          isActive: data.is_active,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };

        setSemester(mapped as any);
      } catch (err: any) {
        console.error("[Supabase] useSemester error:", err);
        setError(err);
      } finally {
        setLoading(false);
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
        const { data, error } = await supabase
          .from('subjects')
          .select('*')
          .order('name', { ascending: true })
          .limit(200);
        
        if (error) throw error;
        
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
      } catch (err: any) {
        console.error("[Supabase] useAllSubjects error:", err);
        setError(err);
      } finally {
        setLoading(false);
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
      } catch (err: any) {
        console.error("[Supabase] useSubjects error:", err.message);
        if (mounted.current) setError(err);
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
        const { data, error } = await supabase
          .from('subjects')
          .select('*')
          .eq('id', subjectId)
          .single();
        
        if (error) throw error;
        
        if (mounted.current) {
          const mapped = {
            id: data.id,
            courseId: data.course_id,
            semesterNumber: data.semester_number,
            name: data.name,
            description: data.description,
            coverImageUrl: data.cover_image_url,
            isPremium: data.is_premium,
            resourceCount: data.resource_count,
            createdAt: data.created_at,
            updatedAt: data.updated_at
          };

          setSubject(mapped as any);
          dataCache.set(cacheKey, mapped);
          setError(null);
        }
      } catch (err: any) {
        console.error("[Supabase] useSubject error:", err.message);
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

  useEffect(() => {
    if (!subjectId) {
      setLoading(false);
      return;
    }

    const resourcesRef = collection(db, "resources");
    const q = query(
      resourcesRef,
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!mounted.current) return;
      
      const mapped = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(r => r.subjectId === subjectId && !r.isDeleted);
        
      setResources(mapped);
      setLoading(false);
    }, (err) => {
      console.error("[Firestore] useResources error:", err);
      if (mounted.current) {
        setError(err);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [subjectId]);

  return { resources, loading, error };
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

    const docRef = doc(db, "resources", resourceId);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (!mounted.current) return;

      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.isDeleted) {
          setResource(null);
        } else {
          const mapped = { id: snapshot.id, ...data } as Resource;
          setResource(mapped);
          dataCache.set(cacheKey, mapped);
        }
      } else {
        setResource(null);
      }
      setLoading(false);
    }, (err) => {
      console.error("[Firestore] useResource error:", err);
      if (mounted.current) {
        setError(err);
        setLoading(false);
      }
    });

    return () => unsubscribe();
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
        const usersRef = collection(db, "users");
        const usersSnap = await getDocs(query(usersRef));
        const allUsers = usersSnap.docs.map(d => d.data());
        
        const userCount = allUsers.length;
        const premiumCount = allUsers.filter(u => u.isPremium).length;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString();
        const activeToday = allUsers.filter(u => u.updatedAt >= todayStr).length;

        const { count: resourceCount } = await supabase.from('resources').select('*', { count: 'exact', head: true }).eq('is_deleted', false);
        const { count: paymentCount } = await supabase.from('payments').select('*', { count: 'exact', head: true });

        setStats({
          totalUsers: userCount || 0,
          premiumUsers: premiumCount || 0,
          activeToday: activeToday || 0,
          totalResources: resourceCount || 0,
          paymentCount: paymentCount || 0,
        });
      } catch (err) {
        console.warn("[AdminStats] Firestore error, falling back to Supabase:", err);
        const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
        const { count: resourceCount } = await supabase.from('resources').select('*', { count: 'exact', head: true }).eq('is_deleted', false);
        setStats(prev => ({ ...prev, totalUsers: userCount || 0, totalResources: resourceCount || 0 }));
      } finally {
        setLoading(false);
      }
    }
    fetchStats();

    const channel = supabase.channel('admin-stats-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, () => fetchStats())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { stats, loading };
}

export function useAdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;
    let isSubscribed = true;

    async function loadUsers() {
      if (!isSubscribed) return;
      setLoading(true);
      
      try {
        // 1. Try Firestore getDocs
        const usersRef = collection(db, "users");
        const q = query(usersRef, orderBy("createdAt", "desc"), limit(100));
        
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          console.log("[AdminUsers] Firestore loaded:", snap.size);
          if (isSubscribed) setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })) as any);
          
          // Subscribe for updates
          unsubscribeFirestore = onSnapshot(q, (s) => {
            if (isSubscribed && !s.empty) {
              setUsers(s.docs.map(d => ({ uid: d.id, ...d.data() })) as any);
            }
          });
        } else {
          throw new Error("Firestore empty");
        }

      } catch (err) {
        console.warn("[AdminUsers] Falling back to Supabase:", err);
        try {
          const { data, error: supaErr } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
            
          if (isSubscribed && data) {
            setUsers(data.map(u => ({
              uid: u.id,
              email: u.email,
              displayName: u.name || u.email?.split('@')[0] || "User",
              role: u.role || 'user',
              isPremium: u.is_premium,
              createdAt: u.created_at,
              updatedAt: u.updated_at
            })) as any);
          }
          if (supaErr) setError(supaErr as any);
        } catch (sErr) {
          setError(sErr as any);
        }
      } finally {
        if (isSubscribed) setLoading(false);
      }
    }

    loadUsers();
    return () => {
      isSubscribed = false;
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  const togglePremium = async (uid: string, isPremium: boolean) => {
    const userRef = doc(db, "users", uid);
    try {
       await updateDoc(userRef, { isPremium, updatedAt: new Date().toISOString() });
    } catch (e) {
       console.warn("[AdminUsers] Firestore toggle failed:", e);
    }
    if (supabase) {
      await supabase.from('users').update({ is_premium: isPremium, updated_at: new Date().toISOString() }).eq('id', uid);
    }
  };

  return { users, loading, error, togglePremium };
}
