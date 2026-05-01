import { adminAuth } from "./firebase/admin";
import { supabaseAdmin } from "./supabase/admin";

/**
 * Verifies the Firebase ID Token from the Authorization header.
 * Returns the decoded token if valid, otherwise null.
 */
export async function verifyFirebaseToken(requestOrToken: Request | string) {
  let token: string | null = null;

  if (typeof requestOrToken === "string") {
    token = requestOrToken;
  } else {
    const authHeader = requestOrToken.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) return null;

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error("[AuthUtils] Token verification failed:", error);
    return null;
  }
}

/**
 * Checks if a user has admin privileges in the Supabase users table.
 */
export async function checkAdminRole(uid: string) {
  if (!supabaseAdmin) return false;
  
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', uid)
      .single();
      
    if (error || !data) return false;
    return data.role === 'admin' || data.role === 'super-admin' || data.role === 'content-admin';
  } catch (err) {
    console.error("[AuthUtils] Error checking admin role:", err);
    return false;
  }
}
