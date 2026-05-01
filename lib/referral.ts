import { supabaseAdmin } from "./supabase/admin";

/**
 * Referral System Helper
 * Logic for applying referrals and rewarding referrers.
 */

export async function applyReferral(newUserId: string, refCode: string) {
  if (!supabaseAdmin || !refCode) return null;

  console.log(`[Referral] 🔍 Attempting to apply referral code: ${refCode} for user: ${newUserId}`);

  try {
    // 1. Find the referrer
    const { data: referrer, error: findError } = await supabaseAdmin
      .from("users")
      .select("id, referral_count")
      .eq("referral_code", refCode.toUpperCase())
      .single();

    if (findError || !referrer) {
      console.warn(`[Referral] ⚠️ Referrer not found for code: ${refCode}`);
      return null;
    }

    // 2. Prevent self-referral
    if (referrer.id === newUserId) {
      console.warn(`[Referral] 🚫 Self-referral blocked for user: ${newUserId}`);
      return null;
    }

    // 3. Check if user was already referred (prevent duplicates)
    const { data: currentUser } = await supabaseAdmin
      .from("users")
      .select("referred_by")
      .eq("id", newUserId)
      .single();

    if (currentUser?.referred_by) {
      console.log(`[Referral] ℹ️ User ${newUserId} already has a referrer. Skipping.`);
      return null;
    }

    // 4. Update the new user
    const { error: updateNewUserError } = await supabaseAdmin
      .from("users")
      .update({ referred_by: referrer.id })
      .eq("id", newUserId);

    if (updateNewUserError) throw updateNewUserError;

    // 5. Increment referrer's count
    const { error: updateReferrerError } = await supabaseAdmin
      .from("users")
      .update({ referral_count: (referrer.referral_count || 0) + 1 })
      .eq("id", referrer.id);

    if (updateReferrerError) throw updateReferrerError;

    console.log(`[Referral] ✅ Successfully linked ${newUserId} to referrer ${referrer.id}`);
    return referrer.id;

  } catch (error: any) {
    console.error(`[Referral] ❌ Failed to apply referral:`, error.message);
    return null;
  }
}

/**
 * Generates a random 6-character referral code.
 */
export function generateReferralCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
