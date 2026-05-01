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
      console.warn("[Auth] ❌ Sync API failed:", err.error);
      return null;
    } else {
      const data = await response.json();
      return data.profile;
    }
  } catch (e) {
    console.warn("[Auth] ❌ Sync exception:", e);
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

        // 1. Background Sync (Persist to DBs)
        if (firebaseUser.uid !== lastSyncedUid.current || !userProfile) {
          if (!syncInProgress.current) {
            syncInProgress.current = true;
            
            const syncPromise = syncUserToServer(firebaseUser);
            const timeoutPromise = new Promise<null>((resolve) => 
              setTimeout(() => {
                console.warn("[Auth] ⚠️ Sync API timeout reached (10s). Proceeding with limited session.");
                resolve(null);
              }, 10000)
            );

            Promise.race([syncPromise, timeoutPromise]).then((profileData) => {
              if (mountedRef.current && profileData) {
                console.log(`[Auth] 👤 Profile resolved: Role=${profileData.role}, Premium=${profileData.isPremium}`);
                setUserProfile(profileData as UserProfile);
                lastSyncedUid.current = firebaseUser.uid;
              } else if (mountedRef.current && !userProfile) {
                fetchProfile(firebaseUser.uid);
              }
            }).catch(err => {
              console.error("[Auth] Sync error:", err);
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
  }, [fetchProfile]); // Removed userProfile dependency to prevent infinite loop

  const refreshProfile = useCallback(async () => {
    const userId = user?.uid;
    if (userId) {
      await fetchProfile(userId);
    }
  }, [user, fetchProfile]);

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
    if (!userProfile?.isPremium || !userProfile.premiumExpiry) {
      return !!userProfile?.isPremium;
    }
    try {
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
