import { supabase } from "@/integrations/supabase/client";

export type Permission = "view" | "edit";

export interface ShareEntry {
  id: string;
  flow_id: string;
  shared_with: string;
  permission: Permission;
  created_at: string;
  email?: string;
  display_name?: string | null;
}

export interface ShareLink {
  id: string;
  flow_id: string;
  token: string;
  permission: Permission;
  created_at: string;
}

export async function listShares(flowId: string): Promise<ShareEntry[]> {
  const { data, error } = await supabase
    .from("flow_shares")
    .select("id, flow_id, shared_with, permission, created_at")
    .eq("flow_id", flowId);
  if (error) throw error;
  if (!data || data.length === 0) return [];
  const ids = data.map((s) => s.shared_with);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, display_name")
    .in("id", ids);
  const map = new Map((profiles ?? []).map((p) => [p.id, p]));
  return data.map((s) => ({
    ...(s as ShareEntry),
    email: map.get(s.shared_with)?.email,
    display_name: map.get(s.shared_with)?.display_name ?? null,
  }));
}

export async function inviteByEmail(
  flowId: string,
  email: string,
  permission: Permission,
): Promise<ShareEntry> {
  const trimmed = email.trim().toLowerCase();
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("id, email, display_name")
    .eq("email", trimmed)
    .maybeSingle();
  if (pErr) throw pErr;
  if (!profile) throw new Error("No account found with that email. Ask them to sign up first.");

  const { data, error } = await supabase
    .from("flow_shares")
    .upsert(
      { flow_id: flowId, shared_with: profile.id, permission },
      { onConflict: "flow_id,shared_with" },
    )
    .select("id, flow_id, shared_with, permission, created_at")
    .single();
  if (error) throw error;
  return {
    ...(data as ShareEntry),
    email: profile.email,
    display_name: profile.display_name,
  };
}

export async function updateSharePermission(shareId: string, permission: Permission) {
  const { error } = await supabase
    .from("flow_shares")
    .update({ permission })
    .eq("id", shareId);
  if (error) throw error;
}

export async function removeShare(shareId: string) {
  const { error } = await supabase.from("flow_shares").delete().eq("id", shareId);
  if (error) throw error;
}

export async function listLinks(flowId: string): Promise<ShareLink[]> {
  const { data, error } = await supabase
    .from("flow_share_links")
    .select("id, flow_id, token, permission, created_at")
    .eq("flow_id", flowId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ShareLink[];
}

function randomToken(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 24);
}

export async function createLink(flowId: string, permission: Permission): Promise<ShareLink> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Not signed in");
  const token = randomToken();
  const { data, error } = await supabase
    .from("flow_share_links")
    .insert({ flow_id: flowId, permission, token, created_by: uid })
    .select("id, flow_id, token, permission, created_at")
    .single();
  if (error) throw error;
  return data as ShareLink;
}

export async function revokeLink(linkId: string) {
  const { error } = await supabase.from("flow_share_links").delete().eq("id", linkId);
  if (error) throw error;
}

export async function claimLink(token: string): Promise<string> {
  const { data, error } = await supabase.rpc("claim_share_link", { _token: token });
  if (error) throw error;
  return data as unknown as string;
}

export function buildLinkUrl(token: string): string {
  if (typeof window === "undefined") return `/shared/${token}`;
  return `${window.location.origin}/shared/${token}`;
}
