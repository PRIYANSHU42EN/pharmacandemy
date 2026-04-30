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
  type User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import type { UserProfile } from "@/types";
import { getFriendlyAuthError } from "@/lib/firebase/errors";

// import { supabase } from \"@/lib/supabase/client\"; // Disabled for secure proxy architecture

// ---------------------------------------------------------------------------
// Sync user to Databases via Server API
// ---------------------------------------------------------------------------
async function syncUserToServer(user: FirebaseUser, displayName?: string) {
  try {
    const idToken = await user.getIdToken();
    
    /* Proxy handles sync to Supabase internally */

    // Server-side profile sync (Role propagation)
    console.log("[Auth] 🔄 Syncing profile with backend...");
    const response = await fetch("/api/auth/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`
      },
      body: JSON.stringify({ displayName }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.warn("[Auth] ❌ Sync API failed:", err.error);
      return null;
    } else {
      const data = await response.json();
      console.log("[Auth] ✅ Sync successful. Role:", data.profile?.role);
      return data.profile;
    }
  } catch (e) {
    console.warn("[Auth] ❌ Sync exception:", e);
    return null;
  }
}

async function sendWelcomeEmail(email: string, name: string) {
  try {
    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name }),
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("[Auth] Welcome email failed:", result.error);
    } else {
      console.log("[Auth] ✅ Welcome email sent to:", email);
    }
  } catch (err) {
    console.error("[Auth] Welcome email exception:", err);
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

const AUTH_INIT_TIMEOUT = 5000;

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const syncInProgress = useRef(false);
  const lastSyncedUid = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
        
      if (userSnap.exists() && mountedRef.current) {
        const data = userSnap.data();
        console.log("[Auth] Firestore profile loaded:", data.role);
        setUserProfile({
          ...data,
          uid: userId,
        } as UserProfile);
      }
    } catch (e) {
      console.warn("[Auth] Firestore profile fetch error:", e);
    }
  }, []);

  useEffect(() => {
    console.log("[Auth] 🔄 Initializing Auth Listeners...");
    
    // Phase 5: Session restoration on reload
    const unsubscribeFirebase = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("[Auth] Firebase User State:", firebaseUser ? { uid: firebaseUser.uid, email: firebaseUser.email } : "Logged Out");
      
      if (!mountedRef.current) return;

      if (firebaseUser) {
        // Phase 3: Wait for both sessions before unlocking UI
        setUser(firebaseUser);

        // Phase 4: Prevent duplicate syncs
        if (firebaseUser.uid !== lastSyncedUid.current || !userProfile) {
          if (!syncInProgress.current) {
            syncInProgress.current = true;
            
            const profileData = await syncUserToServer(firebaseUser);
            
            if (mountedRef.current && profileData) {
              console.log(`[Auth] 👤 Profile resolved: Role=${profileData.role}, Premium=${profileData.isPremium}`);
              setUserProfile(profileData as UserProfile);
              lastSyncedUid.current = firebaseUser.uid;

              // Track login event
              const { analytics } = await import("@/lib/analytics");
              analytics.track({ eventType: "login" });
            }
            syncInProgress.current = false;
          }
        }
      } else {
        // User logged out
        setUser(null);
        setUserProfile(null);
        lastSyncedUid.current = null;
        // await supabase.auth.signOut(); // Disabled
      }
      
      // Phase 3: loading = false ONLY after everything completes
      if (mountedRef.current) {
        console.log("[Auth] 🔓 Auth lifecycle complete");
        setLoading(false);
      }
    });

    return () => {
      unsubscribeFirebase();
    };
  }, [fetchProfile, userProfile]);



  const refreshProfile = useCallback(async () => {
    const userId = user?.uid;
    if (userId) {
      await fetchProfile(userId);
    }
  }, [user, fetchProfile]);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log("[Auth] 🔑 Firebase email login:", result.user.email);
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
      
      // Update profile with display name
      await updateProfile(result.user, { displayName });
      
      // Let the onAuthStateChanged listener handle the sync to avoid duplicates
      
      // Send welcome email
      await sendWelcomeEmail(email, displayName);
      
      console.log("[Auth] 📝 Firebase signup success:", email);
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
      const result = await signInWithPopup(auth, provider);
      console.log("[Auth] 🌐 Google sign-in success:", result.user.email);
    } catch (error: any) {
      throw new Error(getFriendlyAuthError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    console.log("[Auth] 🚪 Logging out");
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
      console.log("[Auth] 📧 Verification email resent");
    } catch (error: any) {
      throw new Error(getFriendlyAuthError(error));
    }
  }, []);

  const isPremium = useMemo(() => {
    if (!userProfile?.isPremium || !userProfile.premiumExpiry) {
      return !!userProfile?.isPremium;
    }
    try {
      // Handle both Firestore Timestamp and JS Date
      const expiryDate = userProfile.premiumExpiry.toDate ? userProfile.premiumExpiry.toDate() : new Date(userProfile.premiumExpiry);
      return expiryDate > new Date();
    } catch {
      return false;
    }
  }, [userProfile]);

  const isAdmin = useMemo(() => {
    if (!userProfile) return false;
    return userProfile.role === "admin" || userProfile.role === "super-admin" || userProfile.role === "content-admin";
  }, [userProfile]);

  const emailVerified = useMemo(() => {
    return user?.emailVerified || false;
  }, [user]);

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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
