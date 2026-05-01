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
} from "react";
import { auth, db } from "@/lib/firebase/config";
import {
  onAuthStateChanged,
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

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const syncInProgress = useRef(false);
  const lastSyncedUid = useRef<string | null>(null);

  const [showStreakToast, setShowStreakToast] = useState<number | null>(null);

  // Referral System (Capture code from URL)
  useReferral();

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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!mountedRef.current) return;

      setUser(firebaseUser);

      if (firebaseUser) {
        // 0. Instant Role Check via Custom Claims
        firebaseUser.getIdTokenResult().then((result) => {
          if (mountedRef.current && result.claims.role) {
            setUserProfile((prev) => ({
              ...(prev || { uid: firebaseUser.uid, email: firebaseUser.email || "" }),
              role: result.claims.role as any,
              isPremium: !!result.claims.isPremium
            } as UserProfile));
          }
        });

        // 1. Background Sync (Persist to DBs) - Throttled to once per 15 mins
        const lastSyncTime = localStorage.getItem(`lastSync_${firebaseUser.uid}`);
        const shouldSync = !lastSyncTime || (Date.now() - parseInt(lastSyncTime) > 15 * 60 * 1000);

        if (firebaseUser.uid !== lastSyncedUid.current || shouldSync) {
          if (!syncInProgress.current) {
            syncInProgress.current = true;
            
            const syncPromise = syncUserToServer(firebaseUser);
            const timeoutPromise = new Promise<null>((resolve) => 
              setTimeout(() => {
                console.warn("[Auth] ⚠️ Sync API timeout reached (10s). Proceeding with cache/db.");
                resolve(null);
              }, 10000)
            );

            Promise.race([syncPromise, timeoutPromise]).then((profileData: any) => {
              if (mountedRef.current && profileData) {
                console.log(`[Auth] 👤 Profile resolved: Role=${profileData.role}, Premium=${profileData.isPremium}`);
                setUserProfile(profileData as UserProfile);
                lastSyncedUid.current = firebaseUser.uid;
                localStorage.setItem(`lastSync_${firebaseUser.uid}`, Date.now().toString());

                // Streak Celebration
                if (profileData.streakUpdated) {
                  setShowStreakToast(profileData.streak);
                  setTimeout(() => setShowStreakToast(null), 5000);
                }
              } else if (mountedRef.current) {
                // If sync failed or timed out, fallback to a direct Supabase fetch
                fetchProfile(firebaseUser.uid);
              }
            }).catch(err => {
              console.error("[Auth] Sync error:", err);
              fetchProfile(firebaseUser.uid);
            }).finally(() => {
              syncInProgress.current = false;
            });
          }
        }
      } else {
        setUserProfile(null);
        lastSyncedUid.current = null;
      }
      
      if (mountedRef.current) {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [fetchProfile]);

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
