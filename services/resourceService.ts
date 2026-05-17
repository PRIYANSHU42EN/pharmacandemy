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
   * Generates a signed URL for a Supabase storage object or path.
   * Supports both full Supabase URLs and relative paths.
   */
  static async getSecureUrl(url: string): Promise<string> {
    if (!url) return url;
    if (!supabaseAdmin) return url;

    // Handle legacy Google Drive URLs (preview, view, uc, open)
    if (url.includes("drive.google.com")) {
      const fileIdMatch = url.match(/\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
      if (fileIdMatch && fileIdMatch[1]) {
        // Force direct download format to bypass HTML preview pages
        return `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
      }
      return url;
    }

    // If it's an external URL (YouTube, etc.) and NOT a Supabase URL, return as is
    if (url.startsWith("http") && !url.includes("supabase.co")) return url;

    try {
      let bucket = "pdfs"; // Default bucket for paths
      let path = url;

      // Handle full Supabase URLs
      if (url.includes("/storage/v1/object/")) {
        const urlParts = url.split("/storage/v1/object/");
        if (urlParts.length >= 2) {
          const pathParts = urlParts[1].split("/");
          pathParts.shift(); // Remove 'public' or 'authenticated' prefix
          bucket = pathParts.shift() || "pdfs";
          path = pathParts.join("/");
        }
      } else if (url.startsWith("http")) {
        // Other HTTP links (should be caught by the first check, but just in case)
        return url;
      }

      // Generate signed URL
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(path, 3600); // 1 hour expiry for internal service calls

      if (error || !data) {
        console.warn(`[ResourceService] Signed URL generation failed for ${path}:`, error?.message);
        return url;
      }
      
      return data.signedUrl;
    } catch (err) {
      console.error("[ResourceService] Failed to generate secure URL:", err);
      return url;
    }
  }

  /**
   * Verifies if a user has access to a specific resource (All resources are now free)
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

      // Universal access for all authenticated users
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
