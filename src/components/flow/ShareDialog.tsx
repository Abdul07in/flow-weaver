import { useEffect, useState } from "react";
import { Copy, Trash2, Link as LinkIcon, Loader2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  listShares, listLinks, inviteByEmail, updateSharePermission, removeShare,
  createLink, revokeLink, buildLinkUrl,
  type ShareEntry, type ShareLink, type Permission,
} from "@/lib/sharing/shares";

export function ShareDialog({
  flowId, flowName, open, onOpenChange,
}: {
  flowId: string; flowName: string; open: boolean; onOpenChange: (o: boolean) => void;
}) {
  const [shares, setShares] = useState<ShareEntry[]>([]);
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [email, setEmail] = useState("");
  const [perm, setPerm] = useState<Permission>("view");
  const [linkPerm, setLinkPerm] = useState<Permission>("view");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const refresh = async () => {
    const [s, l] = await Promise.all([listShares(flowId), listLinks(flowId)]);
    setShares(s); setLinks(l);
  };

  useEffect(() => { if (open) void refresh(); }, [open, flowId]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setBusy(true);
    try {
      await inviteByEmail(flowId, email, perm);
      setEmail("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite");
    } finally { setBusy(false); }
  };

  const newLink = async () => {
    setBusy(true);
    try { await createLink(flowId, linkPerm); await refresh(); }
    finally { setBusy(false); }
  };

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key); setTimeout(() => setCopied(null), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share &ldquo;{flowName}&rdquo;</DialogTitle>
          <DialogDescription>
            Invite people by email or share a link. Edits are auto-synced to viewers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Invite by email */}
          <form onSubmit={invite} className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Invite by email</Label>
            <div className="flex gap-2">
              <Input type="email" required placeholder="person@company.com" value={email}
                onChange={(e) => setEmail(e.target.value)} className="flex-1" />
              <Select value={perm} onValueChange={(v) => setPerm(v as Permission)}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">Can view</SelectItem>
                  <SelectItem value="edit">Can edit</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={busy}>{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Invite"}</Button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </form>

          {/* People with access */}
          {shares.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">People with access</Label>
              {shares.map((s) => (
                <div key={s.id} className="flex items-center gap-2 rounded-md border bg-card p-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{s.display_name || s.email || "Member"}</div>
                    {s.email && s.display_name && <div className="truncate text-xs text-muted-foreground">{s.email}</div>}
                  </div>
                  <Select value={s.permission} onValueChange={async (v) => { await updateSharePermission(s.id, v as Permission); await refresh(); }}>
                    <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">View</SelectItem>
                      <SelectItem value="edit">Edit</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive"
                    onClick={async () => { await removeShare(s.id); await refresh(); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Share links */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Share links</Label>
            <div className="flex gap-2">
              <Select value={linkPerm} onValueChange={(v) => setLinkPerm(v as Permission)}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View only</SelectItem>
                  <SelectItem value="edit">Can edit</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={newLink} disabled={busy} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Create link
              </Button>
            </div>
            {links.map((l) => {
              const url = buildLinkUrl(l.token);
              return (
                <div key={l.id} className="flex items-center gap-2 rounded-md border bg-card p-2 text-sm">
                  <LinkIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <code className="flex-1 truncate text-xs">{url}</code>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">{l.permission}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copy(url, l.id)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  {copied === l.id && <span className="text-[10px] text-status-success">Copied</span>}
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive"
                    onClick={async () => { await revokeLink(l.id); await refresh(); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
