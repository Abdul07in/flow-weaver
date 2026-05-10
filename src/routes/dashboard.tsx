import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, FileJson, Workflow, LogOut, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cloudFlowRepository } from "@/lib/storage/cloud";
import { createFlow } from "@/lib/flow/factory";
import type { Flow } from "@/lib/flow/types";
import { StatusDot } from "@/components/flow/StatusDot";
import { useAuth } from "@/lib/auth/useAuth";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Flow Weaver" },
      { name: "description", content: "Your saved API flows in Flow Weaver." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [owned, setOwned] = useState<Flow[]>([]);
  const [shared, setShared] = useState<Array<Flow & { permission: "view" | "edit" }>>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user, ready, logout } = useAuth();

  useEffect(() => {
    if (ready && !user) void navigate({ to: "/login" });
  }, [ready, user, navigate]);

  const refresh = async () => {
    const [o, s] = await Promise.all([
      cloudFlowRepository.listOwned(),
      cloudFlowRepository.listShared(),
    ]);
    setOwned(o);
    setShared(s);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    void refresh();
  }, [user]);

  const newFlow = async () => {
    const f = createFlow("Untitled Flow");
    await cloudFlowRepository.create(f);
    void navigate({ to: "/flows/$flowId", params: { flowId: f.id } });
  };

  const remove = async (id: string) => {
    await cloudFlowRepository.remove(id);
    void refresh();
  };

  const handleLogout = async () => {
    await logout();
    void navigate({ to: "/" });
  };

  if (!ready || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Workflow className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">Flow Weaver</h1>
              <p className="text-[11px] text-muted-foreground">Chain. Run. Share.</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Hi, <span className="font-medium text-foreground">{user.username}</span>
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </Button>
            <Button onClick={newFlow} className="gap-1.5">
              <Plus className="h-4 w-4" /> New flow
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 space-y-10">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">My flows</h2>
          {loading ? null : owned.length === 0 ? (
            <EmptyState onCreate={newFlow} />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {owned.map((f) => (
                  <motion.div layout key={f.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                    <FlowCard flow={f} onDelete={() => remove(f.id)} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        {shared.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              <Users className="h-3.5 w-3.5" /> Shared with me
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {shared.map((f) => (
                <FlowCard key={f.id} flow={f} sharedBadge={f.permission} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function FlowCard({ flow, onDelete, sharedBadge }: { flow: Flow; onDelete?: () => void; sharedBadge?: "view" | "edit" }) {
  return (
    <Link
      to="/flows/$flowId"
      params={{ flowId: flow.id }}
      className="group block rounded-xl border bg-card p-4 shadow-[var(--shadow-soft)] transition hover:border-primary/40 hover:shadow-[var(--shadow-elevated)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">{flow.name}</h3>
            {flow.lastRunStatus && <StatusDot status={flow.lastRunStatus} />}
            {sharedBadge && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                {sharedBadge === "edit" ? "Can edit" : "View only"}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {flow.blocks.length} {flow.blocks.length === 1 ? "block" : "blocks"} · updated{" "}
            {new Date(flow.updatedAt).toLocaleDateString()}
          </p>
        </div>
        {onDelete && (
          <div className="flex opacity-0 transition group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:text-destructive"
              onClick={(e) => { e.preventDefault(); onDelete(); }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </Link>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-10 max-w-md rounded-2xl border border-dashed bg-card/40 p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <FileJson className="h-7 w-7" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">No flows yet</h2>
      <p className="mt-1 text-sm text-muted-foreground">Create your first flow to chain API calls.</p>
      <Button onClick={onCreate} className="mt-5 gap-1.5"><Plus className="h-4 w-4" /> Create your first flow</Button>
    </motion.div>
  );
}
