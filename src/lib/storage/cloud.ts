import { supabase } from "@/integrations/supabase/client";
import type { Flow } from "../flow/types";
import type { FlowRepository } from "./repository";

interface FlowRow {
  id: string;
  owner_id: string;
  name: string;
  data: Flow;
  updated_at: string;
  created_at: string;
}

function rowToFlow(r: FlowRow): Flow {
  // The full Flow object lives inside `data`. Keep id/name authoritative from the row.
  const d = r.data ?? ({} as Flow);
  return {
    ...d,
    id: r.id,
    name: r.name,
    createdAt: d.createdAt ?? new Date(r.created_at).getTime(),
    updatedAt: new Date(r.updated_at).getTime(),
    blocks: d.blocks ?? [],
  } as Flow;
}

export class CloudFlowRepository implements FlowRepository {
  async list(): Promise<Flow[]> {
    const { data, error } = await supabase
      .from("flows")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data as unknown as FlowRow[]).map(rowToFlow);
  }

  async listOwned(): Promise<Flow[]> {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return [];
    const { data, error } = await supabase
      .from("flows")
      .select("*")
      .eq("owner_id", uid)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data as unknown as FlowRow[]).map(rowToFlow);
  }

  async listShared(): Promise<Array<Flow & { permission: "view" | "edit" }>> {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return [];
    const { data: shares, error: e1 } = await supabase
      .from("flow_shares")
      .select("flow_id, permission")
      .eq("shared_with", uid);
    if (e1) throw e1;
    if (!shares || shares.length === 0) return [];
    const ids = shares.map((s) => s.flow_id);
    const { data, error } = await supabase.from("flows").select("*").in("id", ids);
    if (error) throw error;
    const permMap = new Map(shares.map((s) => [s.flow_id, s.permission as "view" | "edit"]));
    return (data as unknown as FlowRow[]).map((r) => ({
      ...rowToFlow(r),
      permission: permMap.get(r.id) ?? "view",
    }));
  }

  async get(id: string): Promise<Flow | undefined> {
    const { data, error } = await supabase.from("flows").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? rowToFlow(data as unknown as FlowRow) : undefined;
  }

  async getUpdatedAt(id: string): Promise<number | undefined> {
    const { data, error } = await supabase
      .from("flows")
      .select("updated_at")
      .eq("id", id)
      .maybeSingle();
    if (error) return undefined;
    return data ? new Date(data.updated_at).getTime() : undefined;
  }

  async getPermission(id: string): Promise<"owner" | "edit" | "view" | "none"> {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return "none";
    const { data: f } = await supabase.from("flows").select("owner_id").eq("id", id).maybeSingle();
    if (!f) return "none";
    if (f.owner_id === uid) return "owner";
    const { data: s } = await supabase
      .from("flow_shares")
      .select("permission")
      .eq("flow_id", id)
      .eq("shared_with", uid)
      .maybeSingle();
    return (s?.permission as "edit" | "view") ?? "none";
  }

  async save(flow: Flow): Promise<void> {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) throw new Error("Not signed in");

    // Try update first (works for owner OR editor-shared via RLS)
    const { data: updated, error: updErr } = await supabase
      .from("flows")
      .update({ name: flow.name, data: flow as unknown as Record<string, unknown> })
      .eq("id", flow.id)
      .select("id");
    if (updErr) throw updErr;
    if (updated && updated.length > 0) return;

    // Otherwise insert (owner)
    const { error: insErr } = await supabase.from("flows").insert({
      id: flow.id,
      owner_id: uid,
      name: flow.name,
      data: flow as unknown as Record<string, unknown>,
    });
    if (insErr) throw insErr;
  }

  async create(flow: Flow): Promise<void> {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) throw new Error("Not signed in");
    const { error } = await supabase.from("flows").insert({
      id: flow.id,
      owner_id: uid,
      name: flow.name,
      data: flow as unknown as Record<string, unknown>,
    });
    if (error) throw error;
  }

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("flows").delete().eq("id", id);
    if (error) throw error;
  }
}

export const cloudFlowRepository = new CloudFlowRepository();
