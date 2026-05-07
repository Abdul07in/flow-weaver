import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, ArrowDown, Send } from "lucide-react";

type Status = "idle" | "running" | "success";

interface StepDef {
  method: "POST" | "GET" | "PUT";
  name: string;
  url: string;
  body?: string;
  responsePreview: { key: string; value: string }[];
  /** key in previous step's response that this step pipes from */
  pipeFrom?: { step: number; key: string };
}

const STEPS: StepDef[] = [
  {
    method: "POST",
    name: "Login",
    url: "/api/auth",
    body: `{ "email": "you@app.dev" }`,
    responsePreview: [
      { key: "id", value: '"u_42"' },
      { key: "token", value: '"ey…9f"' },
    ],
  },
  {
    method: "GET",
    name: "Get profile",
    url: "/api/users/{{Login.response.body.id}}",
    responsePreview: [
      { key: "name", value: '"Alex"' },
      { key: "plan", value: '"free"' },
    ],
    pipeFrom: { step: 0, key: "id" },
  },
  {
    method: "PUT",
    name: "Upgrade plan",
    url: "/api/billing",
    body: `{ "user": "{{Login.response.body.id}}", "plan": "pro" }`,
    responsePreview: [
      { key: "ok", value: "true" },
      { key: "plan", value: '"pro"' },
    ],
    pipeFrom: { step: 0, key: "id" },
  },
];

const STEP_DURATION = 1800; // ms per step
const RESET_PAUSE = 1400;

export function FlowDemo() {
  const [active, setActive] = useState(0);
  const [statuses, setStatuses] = useState<Status[]>(["idle", "idle", "idle"]);
  const [tick, setTick] = useState(0); // forces pipe pulse re-trigger each loop

  useEffect(() => {
    let cancelled = false;
    let timeouts: ReturnType<typeof setTimeout>[] = [];

    const run = () => {
      setStatuses(["idle", "idle", "idle"]);
      setActive(0);
      setTick((t) => t + 1);

      STEPS.forEach((_, i) => {
        timeouts.push(
          setTimeout(() => {
            if (cancelled) return;
            setActive(i);
            setStatuses((prev) => {
              const next = [...prev];
              next[i] = "running";
              return next;
            });
          }, i * STEP_DURATION),
        );
        timeouts.push(
          setTimeout(
            () => {
              if (cancelled) return;
              setStatuses((prev) => {
                const next = [...prev];
                next[i] = "success";
                return next;
              });
            },
            i * STEP_DURATION + STEP_DURATION - 400,
          ),
        );
      });

      timeouts.push(
        setTimeout(() => {
          if (cancelled) return;
          run();
        }, STEPS.length * STEP_DURATION + RESET_PAUSE),
      );
    };

    run();
    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-3xl rounded-2xl border bg-card p-3 shadow-[var(--shadow-elevated)] sm:p-5">
      {/* faux window chrome */}
      <div className="mb-4 flex items-center gap-1.5 px-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.7_0.15_27)]/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.8_0.15_85)]/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.7_0.15_155)]/60" />
        <span className="ml-2 text-[10px] font-medium text-muted-foreground">
          example-flow.json
        </span>
        <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          live demo
        </span>
      </div>

      <div className="space-y-2">
        {STEPS.map((step, i) => (
          <FlowStep
            key={i}
            step={step}
            status={statuses[i]}
            isActive={active === i && statuses[i] === "running"}
            tick={tick}
            isLast={i === STEPS.length - 1}
            prevStep={step.pipeFrom ? STEPS[step.pipeFrom.step] : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function FlowStep({
  step,
  status,
  isActive,
  tick,
  isLast,
  prevStep,
}: {
  step: StepDef;
  status: Status;
  isActive: boolean;
  tick: number;
  isLast: boolean;
  prevStep?: StepDef;
}) {
  const methodBg =
    step.method === "GET"
      ? "bg-[var(--method-get)]"
      : step.method === "POST"
        ? "bg-[var(--method-post)]"
        : "bg-[var(--method-put)]";

  return (
    <div className="space-y-2">
      <motion.div
        layout
        animate={{
          scale: isActive ? 1.01 : 1,
          borderColor: isActive
            ? "color-mix(in oklab, var(--primary) 50%, transparent)"
            : "var(--border)",
        }}
        transition={{ duration: 0.3 }}
        className={`relative overflow-hidden rounded-xl border bg-background p-3 ${
          status === "idle" ? "opacity-60" : "opacity-100"
        } transition-opacity`}
      >
        {/* sweep when running */}
        {isActive && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-primary/15 to-transparent"
          />
        )}

        <div className="flex items-center gap-2.5">
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${methodBg}`}>
            {step.method}
          </span>
          <span className="text-sm font-semibold">{step.name}</span>
          <code className="ml-1 truncate text-[11px] text-muted-foreground">
            <UrlWithHighlight url={step.url} highlight={!!step.pipeFrom} tick={tick} />
          </code>
          <span className="ml-auto">
            <StatusIcon status={status} />
          </span>
        </div>

        {/* request body */}
        {step.body && (
          <div className="mt-2 rounded-md bg-muted/60 px-2.5 py-1.5">
            <code className="text-[11px] text-muted-foreground">
              <BodyWithHighlight body={step.body} pipe={!!step.pipeFrom} tick={tick} />
            </code>
          </div>
        )}

        {/* response */}
        <AnimatePresence>
          {status === "success" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-2 flex items-center gap-2 text-[10px] font-medium text-[var(--status-success)]">
                <span className="rounded bg-[var(--status-success)]/15 px-1.5 py-0.5">200 OK</span>
                <span className="text-muted-foreground">response</span>
              </div>
              <div className="mt-1 grid grid-cols-2 gap-1.5 rounded-md bg-muted/40 px-2.5 py-1.5">
                {step.responsePreview.map((r) => (
                  <div key={r.key} className="flex gap-1.5 text-[11px]">
                    <span className="text-muted-foreground">{r.key}:</span>
                    <code className="truncate text-foreground">{r.value}</code>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* connector + pipe animation */}
      {!isLast && (
        <div className="relative ml-5 flex h-6 items-center">
          <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
          {/* token pulse along the line when next step starts */}
          <PipeIndicator
            label={prevStepLabel(STEPS, prevStep, step)}
            triggerKey={`${tick}-${step.method}`}
          />
        </div>
      )}
    </div>
  );
}

function prevStepLabel(all: StepDef[], _prev: StepDef | undefined, current: StepDef) {
  // Show pipe label for the step BELOW that consumes data from above
  const idx = all.indexOf(current);
  const next = all[idx + 1];
  if (!next?.pipeFrom) return null;
  const source = all[next.pipeFrom.step];
  return `${source.name}.response.${next.pipeFrom.key}`;
}

function PipeIndicator({
  label,
  triggerKey,
}: {
  label: string | null;
  triggerKey: string;
}) {
  if (!label) return null;
  return (
    <motion.div
      key={triggerKey}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: [0, 1, 1, 0], x: [-8, 0, 0, 8] }}
      transition={{ duration: 1.4, times: [0, 0.2, 0.8, 1], delay: 0.2 }}
      className="ml-2 flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
    >
      <Send className="h-2.5 w-2.5" />
      pipe <code className="font-mono">{label}</code>
    </motion.div>
  );
}

function StatusIcon({ status }: { status: Status }) {
  if (status === "running")
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--status-running)]" />;
  if (status === "success")
    return <CheckCircle2 className="h-3.5 w-3.5 text-[var(--status-success)]" />;
  return <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />;
}

function UrlWithHighlight({
  url,
  highlight,
  tick,
}: {
  url: string;
  highlight: boolean;
  tick: number;
}) {
  const parts = url.split(/(\{\{[^}]+\}\})/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("{{") ? (
          <motion.span
            key={`${tick}-${i}`}
            initial={highlight ? { backgroundColor: "color-mix(in oklab, var(--primary) 35%, transparent)" } : false}
            animate={{ backgroundColor: "color-mix(in oklab, var(--primary) 12%, transparent)" }}
            transition={{ duration: 1.2 }}
            className="rounded px-0.5 font-medium text-primary"
          >
            {p}
          </motion.span>
        ) : (
          <span key={`${tick}-${i}`}>{p}</span>
        ),
      )}
    </>
  );
}

function BodyWithHighlight({
  body,
  pipe,
  tick,
}: {
  body: string;
  pipe: boolean;
  tick: number;
}) {
  const parts = body.split(/(\{\{[^}]+\}\})/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("{{") ? (
          <motion.span
            key={`${tick}-${i}`}
            initial={pipe ? { backgroundColor: "color-mix(in oklab, var(--primary) 35%, transparent)" } : false}
            animate={{ backgroundColor: "color-mix(in oklab, var(--primary) 12%, transparent)" }}
            transition={{ duration: 1.2 }}
            className="rounded px-0.5 font-medium text-primary"
          >
            {p}
          </motion.span>
        ) : (
          <span key={`${tick}-${i}`}>{p}</span>
        ),
      )}
    </>
  );
}
