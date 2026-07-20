import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TopNav } from "@/components/TopNav";
import { Loader2 } from "lucide-react";

const search = z.object({ token: z.string().optional() });

type InviteRow = {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  token: string;
  status: string;
  invited_by: string;
  expires_at: string;
  created_at: string;
};

export const Route = createFileRoute("/accept-invite")({
  validateSearch: (s) => search.parse(s),
  component: AcceptInvite,
});

function AcceptInvite() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "signin" | "ready" | "done" | "error">(
    "loading",
  );
  const [invite, setInvite] = useState<InviteRow | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      if (!token) {
        setStatus("error");
        setMessage("Missing invitation token.");
        return;
      }
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setStatus("signin");
        return;
      }
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("token", token)
        .maybeSingle();
      if (error || !data) {
        setStatus("error");
        setMessage("Invitation not found or already used.");
        return;
      }
      if (data.status !== "pending") {
        setStatus("error");
        setMessage("This invitation is no longer valid.");
        return;
      }
      if (new Date(data.expires_at) < new Date()) {
        setStatus("error");
        setMessage("This invitation has expired.");
        return;
      }
      setInvite(data);
      setStatus("ready");
    })();
  }, [token]);

  async function accept() {
    if (!invite) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { error: memErr } = await supabase.from("organization_members").insert({
      organization_id: invite.organization_id,
      user_id: userData.user.id,
      role: invite.role,
    });
    if (memErr && !String(memErr.message).includes("duplicate")) {
      toast.error(memErr.message);
      return;
    }
    await supabase.from("invitations").update({ status: "accepted" }).eq("id", invite.id);
    toast.success("Welcome to the team!");
    setStatus("done");
    navigate({ to: "/organizations/$orgId", params: { orgId: invite.organization_id } });
  }

  return (
    <div className="min-h-screen bg-hero">
      <TopNav />
      <main className="mx-auto max-w-md px-6 pt-16">
        <div className="rounded-2xl border border-border bg-white p-8 shadow-card">
          <h1 className="text-2xl font-semibold tracking-tight">Accept invitation</h1>
          {status === "loading" && (
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          )}
          {status === "signin" && (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                Sign in or create an account to accept this invitation.
              </p>
              <button
                onClick={() =>
                  navigate({ to: "/auth", search: { next: `/accept-invite?token=${token}` } })
                }
                className="mt-4 w-full rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-elevated"
              >
                Sign in to continue
              </button>
            </>
          )}
          {status === "ready" && invite && (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                You've been invited as <span className="font-medium capitalize">{invite.role}</span>
                .
              </p>
              <button
                onClick={accept}
                className="mt-6 w-full rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-elevated"
              >
                Accept invitation
              </button>
            </>
          )}
          {status === "error" && <p className="mt-4 text-sm text-destructive">{message}</p>}
        </div>
      </main>
    </div>
  );
}
