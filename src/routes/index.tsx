import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Copy, FileJson, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { flowRepository } from "@/lib/storage/local";
import { createFlow } from "@/lib/flow/factory";
import type { Flow } from "@/lib/flow/types";
import { StatusDot } from "@/components/flow/StatusDot";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "API Flow Builder — Chain & run API requests" },
      {
        name: "description",
        content:
          "A simplified, user-friendly Postman-style API flow builder. Chain HTTP requests, pipe response data, and run flows from your browser.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    void flowRepository.list().then((f) => {
      setFlows(f);
      setLoading(false);
    });
  }, []);

  const refresh = async () => setFlows(await flowRepository.list());

  const newFlow = async () => {
    const f = createFlow("Untitled Flow");
    await flowRepository.save(f);
    void navigate({ to: "/flows/$flowId", params: { flowId: f.id } });
  };

  const remove = async (id: string) => {
    await flowRepository.remove(id);
    void refresh();
  };

  const duplicate = async (f: Flow) => {
    const copy = { ...f, id: createFlow().id, name: `${f.name} (copy)`, createdAt: Date.now(), updatedAt: Date.now() };
    await flowRepository.save(copy);
    void refresh();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Console-black masthead — PlayStation channel layout */}
      <header className="surface-dark border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Workflow className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-light tracking-tight text-white">API Flow Builder</h1>
              <p className="text-xs font-normal text-white/60">Chain. Run. Inspect.</p>
            </div>
          </div>
          <Button onClick={newFlow} className="gap-1.5">
            <Plus className="h-4 w-4" /> New flow
          </Button>
        </div>
      </header>

      {/* Light editorial panel */}
      <main className="surface-light">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="mb-10">
            <h2 className="text-[2.2rem] font-light leading-tight tracking-tight">Your flows</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              A gallery of API sequences. Open one to edit and run.
            </p>
          </div>
          {loading ? null : flows.length === 0 ? (
            <EmptyState onCreate={newFlow} />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {flows.map((f) => (
                  <motion.div
                    layout
                    key={f.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <FlowCard flow={f} onDelete={() => remove(f.id)} onDuplicate={() => duplicate(f)} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function FlowCard({
  flow,
  onDelete,
  onDuplicate,
}: {
  flow: Flow;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  return (
    <Link
      to="/flows/$flowId"
      params={{ flowId: flow.id }}
      className="group block rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-card)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-light tracking-tight">{flow.name}</h3>
            {flow.lastRunStatus && <StatusDot status={flow.lastRunStatus} />}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {flow.blocks.length} {flow.blocks.length === 1 ? "block" : "blocks"} · updated{" "}
            {new Date(flow.updatedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex opacity-0 transition group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.preventDefault();
              onDuplicate();
            }}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:text-destructive"
            onClick={(e) => {
              e.preventDefault();
              onDelete();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto mt-10 max-w-md rounded-3xl border border-dashed bg-card/40 p-12 text-center"
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <FileJson className="h-7 w-7" />
      </div>
      <h2 className="mt-5 text-2xl font-light tracking-tight">No flows yet</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Create your first flow to chain API calls and pipe data between them.
      </p>
      <Button onClick={onCreate} className="mt-6 gap-1.5">
        <Plus className="h-4 w-4" /> Create your first flow
      </Button>
    </motion.div>
  );
}
