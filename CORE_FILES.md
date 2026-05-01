# PharmaCademy WebApp Core Files

This file contains the most important source code files for the PharmaCademy web application.

## Table of Contents
1. [package.json](#packagejson)
2. [middleware.ts](#middlewarets)
3. [app/layout.tsx](#applayouttsx)
4. [app/page.tsx](#apppagetsx)
5. [components/providers/AuthProvider.tsx](#componentsprovidersauthprovidertsx)
6. [lib/firebase/config.ts](#libfirebaseconfigts)
7. [lib/firebase/admin.ts](#libfirebaseadmints)
8. [lib/supabase/client.ts](#libsupabaseclientts)
9. [hooks/useFirestore.ts](#hooksusefirestorets)

---

## package.json
```json
{
  "name": "pharmacademy",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@colors/colors": "^1.6.0",
    "@supabase/supabase-js": "^2.104.1",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "firebase": "^12.12.0",
    "firebase-admin": "^13.8.0",
    "firebase-tools": "^15.15.0",
    "html2canvas": "^1.4.1",
    "next": "16.2.4",
    "razorpay": "^2.9.6",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "react-youtube": "^10.1.0",
    "resend": "^6.12.2",
    "zod": "^4.3.6",
    "zustand": "^5.0.12"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.4",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

---

## middleware.ts
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Basic in-memory rate limiting map for Edge Middleware.
// Note: In serverless environments, this state is per-instance.
// For strict global rate limiting, an external store like Redis is required.
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();

const RATE_LIMIT_COUNT = 60; // 60 requests
const RATE_LIMIT_WINDOW_MS = 60000; // per 1 minute

export function middleware(request: NextRequest) {
  // Only apply rate limiting to API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    const ip = request.headers.get('x-forwarded-for') || request.ip || 'unknown';

    const now = Date.now();
    const hit = rateLimitMap.get(ip);

    if (hit) {
      if (now - hit.timestamp < RATE_LIMIT_WINDOW_MS) {
        if (hit.count >= RATE_LIMIT_COUNT) {
          console.warn(`[RateLimit] IP ${ip} exceeded API rate limit.`);
          return NextResponse.json(
            { error: 'Too many requests. Please slow down.' },
            { status: 429 }
          );
        }
        hit.count++;
      } else {
        // Reset window
        rateLimitMap.set(ip, { count: 1, timestamp: now });
      }
    } else {
      rateLimitMap.set(ip, { count: 1, timestamp: now });
    }
  }

  return NextResponse.next();
}

export const config = {
  // Match all API routes
  matcher: '/api/:path*',
};
```

---

## app/layout.tsx
```tsx
import type { Metadata } from "next";
import { Playfair_Display, DM_Sans, JetBrains_Mono } from "next/font/google";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AuthProvider from "@/components/providers/AuthProvider";
import EmailVerificationBanner from "@/components/shared/EmailVerificationBanner";
import CookieConsent from "@/components/shared/CookieConsent";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "PharmaCademy — All Your Pharmacy Study Resources in One Place",
    template: "%s | PharmaCademy",
  },
  description:
    "Access PYQs, important questions, PDFs, and video lectures in a structured way to prepare faster. Built for B.Pharm, M.Pharm, and D.Pharm students.",
  keywords: [
    "pharmacy",
    "B.Pharm",
    "M.Pharm",
    "D.Pharm",
    "PYQ",
    "study material",
    "pharmacology",
    "exam preparation",
  ],
  authors: [{ name: "Priyanshu" }],
  openGraph: {
    title: "PharmaCademy — Pharmacy Student Learning Platform",
    description:
      "Access PYQs, important questions, PDFs, and video lectures in a structured way to prepare faster.",
    type: "website",
    locale: "en_IN",
    siteName: "PharmaCademy",
  },
  twitter: {
    card: "summary_large_image",
    title: "PharmaCademy — Pharmacy Student Learning Platform",
    description:
      "Access PYQs, important questions, PDFs, and video lectures in a structured way to prepare faster.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${dmSans.variable} ${jetbrains.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <AuthProvider>
          <Navbar />
          <EmailVerificationBanner />
          <main className="flex-1 pt-[64px]">{children}</main>
          <Footer />
          <CookieConsent />
        </AuthProvider>
        </body>
    </html>
  );
}
```

---

## app/page.tsx
```tsx
import dynamic from "next/dynamic";
import HeroSection from "@/components/home/HeroSection";

// Lazy load below-the-fold sections for better performance
const AboutSection = dynamic(() => import("@/components/home/AboutSection"));
const FeaturesSection = dynamic(() => import("@/components/home/FeaturesSection"));
const PremiumSection = dynamic(() => import("@/components/home/PremiumSection"));
const CreatorSection = dynamic(() => import("@/components/home/CreatorSection"));
const VisionSection = dynamic(() => import("@/components/home/VisionSection"));
const TrustBadges = dynamic(() => import("@/components/home/TrustBadges"));

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <AboutSection />
      <FeaturesSection />
      <PremiumSection />
      <CreatorSection />
      <VisionSection />
      <TrustBadges />
    </>
  );
}
```

---

## components/providers/AuthProvider.tsx
```tsx
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);

      if (currentUser) {
        try {
          const { data, error } = await supabase
            .from("users")
            .select("role")
            .eq("id", currentUser.id)
            .single();

          if (error) {
            setUserProfile({
              uid: currentUser.id,
              email: currentUser.email || "",
              role: "viewer" as any,
              isPremium: false,
            } as any);
          } else {
            setUserProfile({
              uid: currentUser.id,
              email: currentUser.email || "",
              role: data?.role,
              isPremium: false,
            } as any);
          }
        } catch (err) {
          setUserProfile({
            uid: currentUser.id,
            role: "viewer" as any,
          } as any);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    const userId = user?.id || user?.uid;
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
      await syncUserToServer(result.user, displayName);
      await sendWelcomeEmail(email, displayName);
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
```

---

## lib/firebase/config.ts
```typescript
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "0",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:0:web:0",
};

export const isFirebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  
  try {
     db = initializeFirestore(app, {
       localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
     });
  } catch (initErr) {
     db = getFirestore(app);
  }
  
  storage = getStorage(app);
} catch (e) {
  app = {} as FirebaseApp;
  auth = {} as Auth;
  db = {} as Firestore;
  storage = {} as FirebaseStorage;
}

export { auth, db, storage };
export default app;
```

---

## lib/firebase/admin.ts
```typescript
import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getServiceAccount(): ServiceAccount | null {
  let raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;
  
  raw = raw.trim();
  if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
    raw = raw.substring(1, raw.length - 1);
  }

  try {
    const creds = JSON.parse(raw) as ServiceAccount;
    if (creds.privateKey) {
       creds.privateKey = creds.privateKey.replace(/\\n/g, '\n');
    }
    if ((creds as any).private_key) {
       (creds as any).private_key = (creds as any).private_key.replace(/\\n/g, '\n');
    }
    return creds;
  } catch {
    return null;
  }
}

let app;
let adminAuth: ReturnType<typeof getAuth>;
let adminDb: ReturnType<typeof getFirestore>;

const serviceAccount = getServiceAccount();

if (serviceAccount) {
  app = getApps().length > 0 ? getApps()[0] : initializeApp({ credential: cert(serviceAccount) });
  adminAuth = getAuth(app);
  adminDb = getFirestore(app);
} else {
  app = {} as any;
  adminAuth = {
    setCustomUserClaims: async () => {},
    verifyIdToken: async () => ({ uid: "mock-uid", email: "mock@example.com" }),
  } as unknown as ReturnType<typeof getAuth>;
  adminDb = {
    collection: () => ({
      doc: () => ({
        update: async () => {},
        get: async () => ({ exists: false, data: () => ({}) }),
      }),
      add: async () => ({ id: "mock-id" }),
      where: () => ({ limit: () => ({ get: async () => ({ empty: true }) }) })
    })
  } as unknown as ReturnType<typeof getFirestore>;
}

export { adminAuth, adminDb };
```

---

## lib/supabase/client.ts
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## hooks/useFirestore.ts (Partial - core logic)
```typescript
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

// ... (Data Fetching logic for Courses, Subjects, and Resources using dual-sync between Firestore and Supabase)
```
