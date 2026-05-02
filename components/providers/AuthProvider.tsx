"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
  type ReactNode,
  Suspense,
} from "react";
import { auth, db } from "@/lib/firebase/config";
import {
  onIdTokenChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  User,
} from "firebase/auth";
type FirebaseUser = User;
import {
  doc,
  getDoc,
} from "firebase/firestore";
import type { UserProfile } from "@/types";
import { getFriendlyAuthError } from "@/lib/firebase/errors";
import { supabase } from "@/lib/supabase/client";
import { useReminder } from "@/hooks/useReminder";
import { useReferral } from "@/hooks/useReferral";
import { analytics } from "@/lib/analytics";

// ---------------------------------------------------------------------------
// Sync user to Databases via Server API
// ---------------------------------------------------------------------------
async function syncUserToServer(user: FirebaseUser, displayName?: string) {
  try {
    console.log(`[Auth] 🔄 Triggering server-side sync for ${user.uid}...`);
    const idToken = await user.getIdToken(); // Don't force refresh every time
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s fetch timeout

    const response = await fetch("/api/auth/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`
      },
      body: JSON.stringify({
        displayName,
        referralCode: localStorage.getItem("refCode")
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json();
      console.warn("[Auth] ❌ Sync API failed:", err.error);
      return null;
    } else {
      const data = await response.json();
      console.log(`[Auth] ✅ Sync successful: Premium=${data.profile.isPremium}`);

      // Cleanup referral code after successful sync
      localStorage.removeItem("refCode");

      return data.profile;
    }
  } catch (e) {
    console.error("[Auth] ❌ Sync exception:", e);
    return null;
  }
}


interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  isPremium: boolean;
  isAdmin: boolean;
  loading: boolean;
  emailVerified: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupWithEmail: (
    email: string,
    password: string,
    displayName: string,
    referralCode?: string
  ) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

function ReferralTracker() {
  useReferral();
  return null;
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const lastSyncedUid = useRef<string | null>(null);
  const lastTokenRef = useRef<string | null>(null);
  const syncInProgress = useRef(false);
  const mountedRef = useRef(true);

  const [showStreakToast, setShowStreakToast] = useState<number | null>(null);

  // Daily Reminder System
  useReminder(user, userProfile);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      // Step 4: Always fetch from database (Supabase)
      const { data, error } = await supabase
        .from("users")
        .select("id, email, name, role, is_premium, premium_expires_at, photo_url, streak, last_active_date")
        .eq("id", userId)
        .maybeSingle();

      if (data && mountedRef.current) {
        setUserProfile({
          uid: data.id,
          email: data.email,
          displayName: data.name,
          role: data.role,
          isPremium: !!data.is_premium,
          premiumExpiry: data.premium_expires_at,
          photoURL: data.photo_url,
          streak: data.streak || 0,
          lastActiveDate: data.last_active_date || null
        } as UserProfile);
      } else if (error) {
        console.warn("[Auth] Supabase profile fetch error:", error.message);
      }
    } catch (e) {
      console.warn("[Auth] profile fetch exception:", e);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (!mountedRef.current) return;

      // 1. Get the current ID token string
      const token = firebaseUser ? await firebaseUser.getIdToken() : null;
      
      // 2. Guard: Prevent redundant logic if token hasn't changed (Dev HMR or double events)
      if (token === lastTokenRef.current && (!!firebaseUser === !!user)) {
        return;
      }
      lastTokenRef.current = token;

      // 3. Handle Logout
      if (!firebaseUser) {
        setUser(null);
        setUserProfile(null);
        lastSyncedUid.current = null;
        if (mountedRef.current) setLoading(false);
        return;
      }

      // 4. Handle Authenticated User
      const isNewUser = firebaseUser.uid !== lastSyncedUid.current;
      setUser(firebaseUser);

      // OPTIMIZATION: Set partial profile immediately to avoid "Student" fallback if possible
      if (!userProfile && firebaseUser.displayName) {
        setUserProfile(prev => prev || ({
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          displayName: firebaseUser.displayName || "",
          role: "user" as any,
          isPremium: false,
          premiumExpiry: null,
          referralCode: "------",
          photoURL: firebaseUser.photoURL || undefined,
          streak: 0,
          lastActiveDate: null,
          lastStreakDate: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as UserProfile));
      }

      // 5. Profile & Sync Logic
      try {
        const idTokenResult = await firebaseUser.getIdTokenResult();
        const { claims } = idTokenResult;

        // A. If user is same and we already have a profile, just update local state from claims (Instant)
        if (!isNewUser && userProfile) {
          const updatedProfile = {
            ...userProfile,
            role: (claims.role as any) || userProfile.role,
            isPremium: claims.isPremium !== undefined ? !!claims.isPremium : userProfile.isPremium,
          };
          
          if (JSON.stringify(updatedProfile) !== JSON.stringify(userProfile)) {
             setUserProfile(updatedProfile);
          }
          if (mountedRef.current) setLoading(false);
          return;
        }

        // B. If new user OR missing profile, we need to fetch/sync
        // CRITICAL: Set loading to false IMMEDIATELY to unblock UI
        if (mountedRef.current) setLoading(false);

        if (isNewUser || !userProfile) {
          if (syncInProgress.current) return;
          syncInProgress.current = true;

          // Check if we should sync (15 min throttle) or if we just need to fetch
          const lastSyncTime = localStorage.getItem(`lastSync_${firebaseUser.uid}`);
          const throttleExpired = !lastSyncTime || (Date.now() - parseInt(lastSyncTime) > 15 * 60 * 1000);

          if (isNewUser || throttleExpired) {
            console.log(`[Auth] 🔄 Syncing user to server (background)...`);
            
            // Run sync in background - don't await the 8s timeout anymore
            syncUserToServer(firebaseUser).then(profileData => {
              if (mountedRef.current && profileData) {
                setUserProfile(profileData as UserProfile);
                lastSyncedUid.current = firebaseUser.uid;
                localStorage.setItem(`lastSync_${firebaseUser.uid}`, Date.now().toString());
                
                if (profileData.streakUpdated) {
                  setShowStreakToast(profileData.streak);
                  setTimeout(() => setShowStreakToast(null), 5000);
                }
              } else if (mountedRef.current && !userProfile) {
                // Fallback to direct fetch only if we still don't have a profile
                fetchProfile(firebaseUser.uid).then(() => {
                  lastSyncedUid.current = firebaseUser.uid;
                });
              }
            });
          } else {
            // Within throttle window, just fetch current profile from Supabase
            fetchProfile(firebaseUser.uid).then(() => {
              lastSyncedUid.current = firebaseUser.uid;
            });
          }
        }
      } catch (err) {
        console.error("[Auth] Listener error:", err);
      } finally {
        syncInProgress.current = false;
        // Ensure loading is false even if error occurred
        if (mountedRef.current) setLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [fetchProfile, user, userProfile]);

  const refreshProfile = useCallback(async () => {
    if (user && mountedRef.current) {
      console.log("[Auth] 🔄 Refreshing user profile from server...");
      const profileData = await syncUserToServer(user);
      if (profileData && mountedRef.current) {
        setUserProfile(profileData as UserProfile);
      }
    }
  }, [user]);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Track login
      analytics.track({ eventType: 'login' });
    } catch (error: any) {
      throw new Error(getFriendlyAuthError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  const signupWithEmail = useCallback(async (
    email: string,
    password: string,
    displayName: string,
    referralCode?: string
  ) => {
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName });
      // Trigger background sync - DO NOT await it to keep UI responsive
      syncUserToServer(result.user, displayName);
      // Track login (which is also signup success)
      analytics.track({ eventType: 'login' });
    } catch (error: any) {
      throw new Error(getFriendlyAuthError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // Track login
      analytics.track({ eventType: 'login' });
    } catch (error: any) {
      throw new Error(getFriendlyAuthError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      if (mountedRef.current) {
        setUser(null);
        setUserProfile(null);
      }
    } catch (err) {
      console.error("[Auth] Logout failed:", err);
    }
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (!auth.currentUser) throw new Error("No user is logged in.");
    try {
      await sendEmailVerification(auth.currentUser);
    } catch (error: any) {
      throw new Error(getFriendlyAuthError(error));
    }
  }, []);

  const isPremium = useMemo(() => {
    // Step 8: Validate isPremium flag and expiry
    if (!userProfile?.isPremium) return false;
    if (!userProfile.premiumExpiry) return true; // Lifetime or legacy

    try {
      // Handle both Firestore Timestamp (with toDate) and Supabase/ISO strings
      const expiryDate = typeof userProfile.premiumExpiry === 'string'
        ? new Date(userProfile.premiumExpiry)
        : (userProfile.premiumExpiry.toDate ? userProfile.premiumExpiry.toDate() : new Date(userProfile.premiumExpiry));

      return expiryDate > new Date();
    } catch (e) {
      console.error("[Auth] Premium check error:", e);
      return false;
    }
  }, [userProfile]);

  const isAdmin = useMemo(() => {
    if (!userProfile) return false;
    return userProfile.role === "admin" || userProfile.role === "super-admin" || userProfile.role === "content-admin";
  }, [userProfile]);

  const emailVerified = useMemo(() => {
    return true; // Verification completely removed
  }, []);

  const value = useMemo(
    () => ({
      user,
      userProfile,
      isPremium,
      isAdmin,
      loading,
      emailVerified,
      loginWithEmail,
      signupWithEmail,
      loginWithGoogle,
      logout,
      refreshProfile,
      resendVerificationEmail,
    }),
    [user, userProfile, isPremium, isAdmin, loading, emailVerified, loginWithEmail, signupWithEmail, loginWithGoogle, logout, refreshProfile, resendVerificationEmail]
  );

  return (
    <AuthContext.Provider value={value}>
      <Suspense fallback={null}>
        <ReferralTracker />
      </Suspense>
      {children}

      {/* Streak Celebration Toast */}
      {showStreakToast !== null && (
        <div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div
            className="flex items-center gap-3 px-6 py-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[rgba(247,197,216,0.2)]"
            style={{ background: "var(--color-navy)", color: "var(--color-cream)" }}
          >
            <span className="text-[24px]">🔥</span>
            <div>
              <p className="text-[14px] font-bold" style={{ fontFamily: "var(--font-display)" }}>
                Streak +1!
              </p>
              <p className="text-[12px] opacity-80" style={{ fontFamily: "var(--font-body)" }}>
                You&apos;ve reached a {showStreakToast} day streak!
              </p>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}
