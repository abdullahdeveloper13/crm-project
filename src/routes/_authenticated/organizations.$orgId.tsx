import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Copy, Loader2, Trash2, UserPlus } from "lucide-react";

const ROLES = ["owner", "admin", "manager", "sales", "support", "employee", "viewer"] as const;
type Role = (typeof ROLES)[number];

export const Route = createFileRoute("/_authenticated/organizations/$orgId")({
  component: OrgDetail,
});

function OrgDetail() {
  const { orgId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const org = useQuery({
    queryKey: ["org", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const members = useQuery({
    queryKey: ["org-members", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("id, role, user_id, created_at, profiles:profiles!organization_members_user_id_fkey(full_name, avatar_url)")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: true });
      if (error) {
        // profiles fk name may not exist; retry without join
        const fallback = await supabase
          .from("organization_members")
          .select("id, role, user_id, created_at")
          .eq("organization_id", orgId);
        if (fallback.error) throw fallback.error;
        return fallback.data;
      }
      return data;
    },
  });

  const invitations = useQuery({
    queryKey: ["invitations", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const myRole = (members.data as any[] | undefined)?.find((m) => m.user_id === user.id)?.role as Role | undefined;
  const canManage = myRole === "owner" || myRole === "admin";

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("sales");

  const invite = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("invitations").insert({
        organization_id: orgId,
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        invited_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invitation created");
      setInviteEmail("");
      qc.invalidateQueries({ queryKey: ["invitations", orgId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: Role }) => {
      const { error } = await supabase.from("organization_members").update({ role }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["org-members", orgId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("organization_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Member removed");
      qc.invalidateQueries({ queryKey: ["org-members", orgId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const revokeInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invitations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invitations", orgId] }),
  });

  const leaveOrg = useMutation({
    mutationFn: async () => {
      const meRow = (members.data as any[]).find((m) => m.user_id === user.id);
      if (!meRow) throw new Error("Not a member");
      const { error } = await supabase.from("organization_members").delete().eq("id", meRow.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("You left the organization");
      navigate({ to: "/organizations" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (org.isLoading) return <div className="p-10">Loading…</div>;
  if (org.error || !org.data) return <div className="p-10">Organization not found or you don't have access.</div>;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link to="/organizations" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{org.data.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">/{org.data.slug} · Your role: <span className="capitalize font-medium">{myRole ?? "—"}</span></p>
        </div>
        <button
          onClick={() => leaveOrg.mutate()}
          className="rounded-md border border-border bg-white px-3 py-1.5 text-sm hover:bg-muted"
        >
          Leave organization
        </button>
      </div>

      {/* Invite */}
      {canManage && (
        <section className="mt-8 rounded-xl border border-border bg-white p-5 shadow-card">
          <h2 className="font-semibold">Invite a teammate</h2>
          <form
            className="mt-4 flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => { e.preventDefault(); if (inviteEmail) invite.mutate(); }}
          >
            <input
              type="email"
              required
              placeholder="teammate@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-4 focus:ring-ring/20"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Role)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm capitalize"
            >
              {ROLES.filter((r) => r !== "owner").map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button
              disabled={invite.isPending}
              className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-elevated disabled:opacity-60"
            >
              {invite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Invite
            </button>
          </form>
        </section>
      )}

      {/* Members */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Members</h2>
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-4 py-3">Member</th><th className="px-4 py-3">Role</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {(members.data as any[] | undefined)?.map((m) => (
                <tr key={m.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="font-medium">{m.profiles?.full_name ?? m.user_id.slice(0, 8)}</div>
                    <div className="text-xs text-muted-foreground">{m.user_id === user.id ? "You" : m.user_id.slice(0, 8) + "…"}</div>
                  </td>
                  <td className="px-4 py-3">
                    {canManage && m.user_id !== user.id ? (
                      <select
                        value={m.role}
                        onChange={(e) => updateRole.mutate({ id: m.id, role: e.target.value as Role })}
                        className="rounded-md border border-input bg-background px-2 py-1 capitalize"
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      <span className="capitalize">{m.role}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canManage && m.user_id !== user.id && (
                      <button
                        onClick={() => removeMember.mutate(m.id)}
                        className="inline-flex items-center gap-1 text-sm text-destructive hover:underline"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Invitations */}
      {canManage && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Pending invitations</h2>
          <div className="overflow-hidden rounded-xl border border-border bg-white shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Link</th><th className="px-4 py-3"></th></tr>
              </thead>
              <tbody>
                {(invitations.data ?? []).length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No pending invitations</td></tr>
                )}
                {(invitations.data ?? []).map((inv: any) => {
                  const link = `${window.location.origin}/accept-invite?token=${inv.token}`;
                  return (
                    <tr key={inv.id} className="border-t border-border">
                      <td className="px-4 py-3">{inv.email}</td>
                      <td className="px-4 py-3 capitalize">{inv.role}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => { navigator.clipboard.writeText(link); toast.success("Invite link copied"); }}
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <Copy className="h-3.5 w-3.5" /> Copy link
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => revokeInvite.mutate(inv.id)}
                          className="text-sm text-destructive hover:underline"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
