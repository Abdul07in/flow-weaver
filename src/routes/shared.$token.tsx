import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/useAuth";
import { claimLink } from "@/lib/sharing/shares";

export const Route = createFileRoute("/shared/$token")({
  component: SharedClaim,
});

function SharedClaim() {
  const { token } = Route.useParams();
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      void navigate({ to: "/login", search: { redirect: `/shared/${token}` } as never });
      return;
    }
    (async () => {
      try {
        const flowId = await claimLink(token);
        void navigate({ to: "/flows/$flowId", params: { flowId } });
      } catch (e) {
        setError(e instanceof Error ? e.message : "This share link is invalid.");
      }
    })();
  }, [ready, user, token, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        {error ? (
          <>
            <h1 className="text-xl font-semibold">Can&rsquo;t open this share</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Link to="/dashboard" className="mt-4 inline-block text-sm text-primary hover:underline">Go to dashboard</Link>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Opening shared flow…</p>
          </>
        )}
      </div>
    </div>
  );
}
