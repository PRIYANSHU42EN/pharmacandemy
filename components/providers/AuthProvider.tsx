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

import { supabase } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Sync user to Databases via Server API
// ---------------------------------------------------------------------------
async function syncUserToServer(user: FirebaseUser, displayName?: string) {
  try {
    const idToken = await user.getIdToken();
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
      console.warn("[Auth] Sync API failed:", err.error);
    } else {
      console.log("[Auth] ✅ User synced via server");
    }
  } catch (e) {
    console.warn("[Auth] Sync API exception:", e);
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
  const [user, setUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

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
    // PHASE 1 & 2: Auth State listener & Prevent Infinite Loop
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user || null;
      
      // PHASE 5: DEBUG
      console.log("[Auth] 🔄 Supabase Auth State Changed:", event);
      console.log("USER:", currentUser);
      
      setUser(currentUser);

      if (currentUser) {
        try {
          // PHASE 3: ADMIN ROLE CHECK
          console.log("[Auth] 🔍 Fetching role for user:", currentUser.id);
          const { data, error } = await supabase
            .from("users")
            .select("role")
            .eq("id", currentUser.id)
            .single();

          if (error) {
            console.error("[Auth] ❌ Role fetch error:", error);
            // PHASE 6: FAILSAFE
            setUserProfile({
              uid: currentUser.id,
              email: currentUser.email || "",
              role: "viewer" as any,
              isPremium: false,
            } as any);
          } else {
            console.log("ROLE:", data?.role);
            setUserProfile({
              uid: currentUser.id,
              email: currentUser.email || "",
              role: data?.role,
              isPremium: false,
            } as any);
          }
        } catch (err) {
          console.error("[Auth] ❌ Role check exception:", err);
          // PHASE 6: FAILSAFE
          setUserProfile({
            uid: currentUser.id,
            role: "viewer" as any,
          } as any);
        }
      } else {
        console.log("ROLE: null");
        setUserProfile(null);
      }

      setLoading(false);
      console.log("LOADING: false");
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Empty dependency ensures it runs once (PHASE 2)

  const refreshProfile = useCallback(async () => {
    const userId = user?.id || user?.uid;
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
      
      // Sync to both DBs via server
      await syncUserToServer(result.user, displayName);
      
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
