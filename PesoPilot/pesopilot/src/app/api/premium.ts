"use server";

import { createClient } from "@/utils/supabase/server";

export interface PremiumProfile {
  id: string;
  full_name: string | null;
  is_premium: boolean;
  premium_type: "free" | "lifetime";
  premium_since: string | null;
  created_at: string;
}

export interface PremiumRequest {
  id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  payment_proof_url: string;
  amount_paid: number;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  user_email?: string;
}

export async function getUserProfile(): Promise<PremiumProfile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, is_premium, premium_type, premium_since, created_at")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }

  return profile as PremiumProfile;
}

export async function checkPremiumStatus(): Promise<boolean> {
  const profile = await getUserProfile();
  return profile?.is_premium ?? false;
}

export async function getPremiumType(): Promise<"free" | "lifetime"> {
  const profile = await getUserProfile();
  return profile?.premium_type ?? "free";
}

export async function submitPremiumRequest(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const paymentProof = formData.get("payment_proof") as File;
  if (!paymentProof) return { error: "Payment proof is required" };

  const fileExt = paymentProof.name.split(".").pop();
  const fileName = `payment_proofs/${user.id}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("payments")
    .upload(fileName, paymentProof);

  if (uploadError) {
    console.error("Upload error:", uploadError);
    return { error: "Failed to upload payment proof" };
  }

  const { data: { publicUrl } } = supabase.storage
    .from("payments")
    .getPublicUrl(fileName);

  const { error: requestError } = await supabase.from("premium_requests").insert({
    user_id: user.id,
    payment_proof_url: publicUrl,
    amount_paid: 199,
    status: "pending",
  });

  if (requestError) {
    console.error("Request error:", requestError);
    return { error: "Failed to submit premium request" };
  }

  return { success: true };
}

export async function getPendingPremiumRequest(): Promise<PremiumRequest | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("premium_requests")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return data as PremiumRequest | null;
}

export async function getPendingRequests(): Promise<PremiumRequest[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_premium")
    .eq("id", user.id)
    .single();
  if (!profile?.is_premium) return [];

  const { data, error } = await supabase
    .from("premium_requests")
    .select(`
      *,
      user:auth.users!inner(email)
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching pending requests:", error);
    return [];
  }
  
  return (data as unknown as Array<PremiumRequest & { user: { email: string } }>).map(item => ({
    ...item,
    user_email: item.user?.email
  }));
}

export async function approvePremiumRequest(requestId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: request } = await supabase
    .from("premium_requests")
    .select("user_id")
    .eq("id", requestId)
    .single();
  if (!request) return { error: "Request not found" };

  const { error: updateError } = await supabase
    .from("premium_requests")
    .update({ status: "approved", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", requestId);
  if (updateError) return { error: "Failed to approve request" };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ is_premium: true, premium_type: "lifetime", premium_since: new Date().toISOString() })
    .eq("id", request.user_id);
  if (profileError) return { error: "Failed to upgrade user" };

  return { success: true };
}

export async function rejectPremiumRequest(requestId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("premium_requests")
    .update({ status: "rejected", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", requestId);
  if (error) return { error: "Failed to reject request" };
  return { success: true };
}

export async function upgradeToLifetime(userId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const targetUserId = userId || user.id;
  const { error } = await supabase
    .from("profiles")
    .update({ is_premium: true, premium_type: "lifetime", premium_since: new Date().toISOString() })
    .eq("id", targetUserId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function downgradeToFree(userId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const targetUserId = userId || user.id;
  const { error } = await supabase
    .from("profiles")
    .update({ is_premium: false, premium_type: "free", premium_since: null })
    .eq("id", targetUserId);
  if (error) return { error: error.message };
  return { success: true };
}
