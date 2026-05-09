import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import {
  Workflow,
  ArrowRight,
  Zap,
  Lock,
  GitBranch,
  Code2,
  Play,
  Layers,
  Sparkles,
  Github,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/useAuth";
import { FlowDemo } from "@/components/landing/FlowDemo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flow Weaver — Free API flow builder to chain, run & inspect requests" },
      {
        name: "description",
        content:
          "Flow Weaver is a free, local-first API flow builder. Chain HTTP requests, pipe response data, encrypt payloads, and run flows — no signup, no servers.",
      },
      { name: "keywords", content: "Flow Weaver, API flow builder, chain API requests, HTTP workflow, local-first API client, free Postman alternative, pipe response data, API automation" },
      { name: "robots", content: "index, follow" },
      { property: "og:site_name", content: "Flow Weaver" },
      { property: "og:title", content: "Flow Weaver — Chain APIs, pipe data, run anywhere" },
      { property: "og:description", content: "Free, local-first API flow builder. Chain HTTP requests, pipe response data, and run flows. No signup, no servers." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://floweaver.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Flow Weaver — Chain APIs, pipe data, run anywhere" },
      { name: "twitter:description", content: "Free, local-first API flow builder. Chain HTTP requests and pipe response data in your browser." },
    ],
    links: [{ rel: "canonical", href: "https://floweaver.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Flow Weaver",
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Web",
          description: "Free, local-first API flow builder. Chain HTTP requests, pipe response data, and run flows in your browser.",
          url: "https://floweaver.lovable.app/",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user } = useAuth();
  const ctaTarget = user ? "/dashboard" : "/login";

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <Nav user={user?.username} />
      <Hero ctaTarget={ctaTarget} />
      <Features />
      <HowItWorks />
      <FinalCTA ctaTarget={ctaTarget} />
      <Footer />
    </div>
  );
}

function Nav({ user }: { user?: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
            <Workflow className="h-5 w-5" />
          </div>
          <span className="text-base font-bold">Flow Weaver</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#how" className="hover:text-foreground">How it works</a>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Link to="/dashboard">
              <Button size="sm" className="gap-1.5">
                Dashboard <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button size="sm" className="gap-1.5">
                Get started <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero({ ctaTarget }: { ctaTarget: "/login" | "/dashboard" }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const y1 = useSpring(useTransform(scrollY, [0, 600], [0, -120]), { stiffness: 80, damping: 20 });
  const y2 = useSpring(useTransform(scrollY, [0, 600], [0, -60]), { stiffness: 80, damping: 20 });
  const y3 = useSpring(useTransform(scrollY, [0, 600], [0, 80]), { stiffness: 80, damping: 20 });
  const opacity = useTransform(scrollY, [0, 400], [1, 0.3]);

  // pointer parallax
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setMouse({ x: (e.clientX / w - 0.5) * 2, y: (e.clientY / h - 0.5) * 2 });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <section ref={ref} className="relative overflow-hidden pb-24 pt-20 sm:pb-32 sm:pt-28">
      {/* parallax orbs */}
      <motion.div
        style={{ y: y1, x: mouse.x * 30 }}
        className="pointer-events-none absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full bg-primary/25 blur-3xl"
      />
      <motion.div
        style={{ y: y2, x: mouse.x * -20 }}
        className="pointer-events-none absolute top-10 -right-32 h-[360px] w-[360px] rounded-full bg-secondary/25 blur-3xl"
      />
      <motion.div
        style={{ y: y3, opacity }}
        className="pointer-events-none absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
      />

      {/* grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
        }}
      />

      <div className="relative mx-auto max-w-5xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1 text-xs font-medium shadow-[var(--shadow-soft)] backdrop-blur"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          100% free · local-first · no signup needed
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05 }}
          className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl"
        >
          Chain APIs.{" "}
          <span className="bg-gradient-to-r from-primary to-[oklch(0.72_0.18_55)] bg-clip-text text-transparent">
            Pipe data.
          </span>
          <br />
          Run anywhere.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg"
        >
          Build multi-step API flows in your browser. Pipe response fields between requests,
          encrypt payloads with custom JS, and replay everything in one click.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Link to={ctaTarget}>
            <Button size="lg" className="gap-1.5">
              {ctaTarget === "/dashboard" ? "Open dashboard" : "Start free"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <a href="#features">
            <Button size="lg" variant="outline">
              See features
            </Button>
          </a>
        </motion.div>

        {/* floating preview card */}
        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 12 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          style={{ y: y3, perspective: 1200 }}
          className="relative mx-auto mt-16 w-full max-w-3xl"
        >
          <div
            style={{
              transform: `rotateX(${mouse.y * -3}deg) rotateY(${mouse.x * 4}deg)`,
              transition: "transform 0.2s ease-out",
            }}
            className="rounded-2xl border bg-card p-2 shadow-[var(--shadow-elevated)]"
          >
            <div className="rounded-xl bg-background p-5 text-left">
              <MockFlowBlock method="POST" name="Login" url="/api/auth" status="success" delay={0} />
              <Connector />
              <MockFlowBlock
                method="GET"
                name="Get profile"
                url="/api/users/{{Login.response.body.id}}"
                status="success"
                delay={0.15}
              />
              <Connector />
              <MockFlowBlock
                method="PUT"
                name="Update plan"
                url="/api/billing"
                status="running"
                delay={0.3}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function MockFlowBlock({
  method,
  name,
  url,
  status,
  delay,
}: {
  method: "GET" | "POST" | "PUT";
  name: string;
  url: string;
  status: "success" | "running";
  delay: number;
}) {
  const methodColor =
    method === "GET" ? "bg-[var(--method-get)]" : method === "POST" ? "bg-[var(--method-post)]" : "bg-[var(--method-put)]";
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.6 + delay }}
      className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5"
    >
      <span className={`rounded px-2 py-0.5 text-[10px] font-bold text-white ${methodColor}`}>
        {method}
      </span>
      <span className="text-sm font-medium">{name}</span>
      <code className="ml-auto truncate text-xs text-muted-foreground">{url}</code>
      <span
        className={`h-2 w-2 rounded-full ${
          status === "success" ? "bg-[var(--status-success)]" : "animate-pulse bg-[var(--status-running)]"
        }`}
      />
    </motion.div>
  );
}

function Connector() {
  return <div className="ml-6 h-4 w-px bg-border" />;
}

function Features() {
  const features = [
    {
      icon: GitBranch,
      title: "Chain requests",
      desc: "Build multi-step flows. Reuse any field from a previous response with simple {{block.response}} templates.",
    },
    {
      icon: Lock,
      title: "Custom encryption",
      desc: "Write your own JS to encrypt outgoing payloads and decrypt responses — per block, fully optional.",
    },
    {
      icon: Code2,
      title: "Variable picker",
      desc: "Click through previous responses and insert any nested field into headers, params, URL or body.",
    },
    {
      icon: Play,
      title: "Run one or all",
      desc: "Run the entire flow or just a single block — earlier responses are kept so templates still resolve.",
    },
    {
      icon: Layers,
      title: "Undo / redo everything",
      desc: "Every change to blocks, fields, and crypto settings is undoable with Cmd/Ctrl + Z.",
    },
    {
      icon: Zap,
      title: "Local-first & free",
      desc: "Everything lives in your browser. No accounts, no servers, no tracking. Export when you want.",
    },
  ];

  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Everything you need to{" "}
            <span className="bg-gradient-to-r from-primary to-[oklch(0.72_0.18_55)] bg-clip-text text-transparent">
              orchestrate APIs
            </span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            A focused, no-fluff alternative to bloated API clients.
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              whileHover={{ y: -4 }}
              className="group relative overflow-hidden rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)] transition hover:border-primary/40 hover:shadow-[var(--shadow-elevated)]"
            >
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl transition group-hover:bg-primary/15" />
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Pick a username",
      desc: "No email, no password. We just need a name to label your local data.",
    },
    {
      n: "02",
      title: "Build your flow",
      desc: "Add HTTP blocks, set method, URL, headers, params and body. Reorder freely.",
    },
    {
      n: "03",
      title: "Pipe responses",
      desc: "Insert fields from previous responses into any later request using the variable picker.",
    },
    {
      n: "04",
      title: "Run & inspect",
      desc: "Click Run. Watch each block execute in order with full request/response inspection.",
    },
  ];

  const { scrollYProgress } = useScroll();
  const lineHeight = useTransform(scrollYProgress, [0.35, 0.75], ["0%", "100%"]);

  return (
    <section id="how" className="relative bg-secondary/[0.04] py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">From zero to flow in 60 seconds</h2>
          <p className="mt-4 text-muted-foreground">No installs. No setup. Just open and build.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="mt-14"
        >
          <FlowDemo />
        </motion.div>

        <div className="relative mt-16">
          <div className="absolute left-6 top-0 hidden h-full w-px bg-border sm:block">
            <motion.div style={{ height: lineHeight }} className="w-px bg-primary" />
          </div>

          <div className="space-y-10">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="relative flex items-start gap-5 sm:gap-8"
              >
                <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border bg-card text-sm font-bold text-primary shadow-[var(--shadow-soft)]">
                  {s.n}
                </div>
                <div className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCTA({ ctaTarget }: { ctaTarget: "/login" | "/dashboard" }) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [800, 2200], [60, -60]);
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <motion.div
        style={{ y }}
        className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto h-[400px] w-[600px] -translate-y-1/2 rounded-full bg-primary/20 blur-3xl"
      />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-4xl font-bold tracking-tight sm:text-6xl"
        >
          Ready to build your first flow?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mx-auto mt-4 max-w-xl text-muted-foreground"
        >
          Free forever. Your data stays on your device.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-8"
        >
          <Link to={ctaTarget}>
            <Button size="lg" className="gap-1.5">
              {ctaTarget === "/dashboard" ? "Open your dashboard" : "Create your account"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t bg-card/30">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Workflow className="h-3.5 w-3.5" />
          </div>
          <span>Flow Weaver · free & local-first</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#how" className="hover:text-foreground">How it works</a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 hover:text-foreground"
          >
            <Github className="h-3.5 w-3.5" /> GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
