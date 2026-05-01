import { supabaseAdmin } from "@/lib/supabase/admin";

export interface ResourceAccess {
  authorized: boolean;
  url?: string;
  error?: string;
  type?: string;
  title?: string;
}

export class ResourceService {
  /**
   * Generates a signed URL for a Supabase storage object
   */
  static async getSecureUrl(url: string): Promise<string> {
    if (!url || !url.includes("supabase.co/storage/v1/object/")) return url;
    if (!supabaseAdmin) return url;

    try {
      const urlParts = url.split("/storage/v1/object/");
      if (urlParts.length < 2) return url;

      const pathParts = urlParts[1].split("/");
      pathParts.shift(); // Remove 'public' or 'authenticated' prefix
      const bucket = pathParts.shift();
      const path = pathParts.join("/");

      if (!bucket || !path) return url;

      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(path, 3600); // 1 hour expiry

      if (error || !data) return url;
      return data.signedUrl;
    } catch (err) {
      console.error("[ResourceService] Failed to generate signed URL:", err);
      return url;
    }
  }

  /**
   * Verifies if a user has access to a specific resource
   */
  static async verifyAccess(userId: string, resourceId: string): Promise<ResourceAccess> {
    if (!supabaseAdmin) {
      return { authorized: false, error: "Database not configured" };
    }

    try {
      // 1. Fetch resource details
      const { data: resource, error: resourceError } = await supabaseAdmin
        .from("resources")
        .select("*")
        .eq("id", resourceId)
        .single();

      if (resourceError || !resource || resource.is_deleted) {
        return { authorized: false, error: "Resource not found" };
      }

      // 2. If not premium, grant access
      if (!resource.is_premium) {
        return {
          authorized: true,
          url: await this.getSecureUrl(resource.url),
          type: resource.type,
          title: resource.title
        };
      }

      // 3. Resource IS premium — check user profile
      const { data: user, error: userError } = await supabaseAdmin
        .from("users")
        .select("id, role, is_premium, premium_expires_at")
        .eq("id", userId)
        .single();

      if (userError || !user) {
        return { authorized: false, error: "User profile not found" };
      }

      // 4. Admin bypass
      const isAdmin = ["admin", "super-admin", "content-admin"].includes(user.role || "");
      if (isAdmin) {
        return {
          authorized: true,
          url: await this.getSecureUrl(resource.url),
          type: resource.type,
          title: resource.title
        };
      }

      // 5. Check premium status
      if (!user.is_premium || !user.premium_expires_at) {
        return { authorized: false, error: "Premium subscription required" };
      }

      const premiumExpiry = new Date(user.premium_expires_at);
      if (premiumExpiry <= new Date()) {
        return { authorized: false, error: "Premium subscription expired" };
      }

      // 6. Access granted
      return {
        authorized: true,
        url: await this.getSecureUrl(resource.url),
        type: resource.type,
        title: resource.title
      };

    } catch (err: any) {
      console.error("[ResourceService] Verification error:", err.message);
      return { authorized: false, error: "Internal verification error" };
    }
  }
}
