import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { UserPlus, Copy, Trash2, Loader2, Users, Clock, Shield, Check } from "lucide-react";
import { toast } from "sonner";
import { formatDate, logAuditEvent, type AppRole } from "@/lib/crm-helpers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type ProfileSummary = {
  full_name: string | null;
  avatar_url: string | null;
};

type MemberRow = {
  id: string;
  role: AppRole;
  user_id: string;
  created_at: string;
  profiles?: ProfileSummary | null;
};

type InvitationRow = Database["public"]["Tables"]["invitations"]["Row"];

type TeamMembersViewProps = {
  orgId: string;
  userId: string;
  canManage: boolean;
};

const ROLES: AppRole[] = ["owner", "admin", "manager", "sales", "support", "employee", "viewer"];

export function TeamMembersView({ orgId, userId, canManage }: TeamMembersViewProps) {
  const qc = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("sales");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const members = useQuery({
    queryKey: ["org-members", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select(
          "id, role, user_id, created_at, profiles:profiles!organization_members_user_id_fkey(full_name, avatar_url)",
        )
        .eq("organization_id", orgId)
        .order("created_at", { ascending: true });
      if (error) {
        const fallback = await supabase
          .from("organization_members")
          .select("id, role, user_id, created_at")
          .eq("organization_id", orgId);
        if (fallback.error) throw fallback.error;
        return fallback.data as MemberRow[];
      }
      return data as MemberRow[];
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
      return data as InvitationRow[];
    },
  });

  const invite = useMutation({
    mutationFn: async () => {
      if (!inviteEmail.trim()) throw new Error("Email is required");
      const { data, error } = await supabase
        .from("invitations")
        .insert({
          organization_id: orgId,
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          invited_by: userId,
        })
        .select()
        .single();
      if (error) throw error;

      await logAuditEvent({
        organizationId: orgId,
        actorId: userId,
        action: "create_invitation",
        entityType: "invitation",
        entityId: data.id,
        afterData: { email: inviteEmail, role: inviteRole },
      });
    },
    onSuccess: () => {
      toast.success("Invitation generated");
      setInviteEmail("");
      qc.invalidateQueries({ queryKey: ["invitations", orgId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to invite"),
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: AppRole }) => {
      const { error } = await supabase.from("organization_members").update({ role }).eq("id", id);
      if (error) throw error;

      await logAuditEvent({
        organizationId: orgId,
        actorId: userId,
        action: "update_member_role",
        entityType: "organization_member",
        entityId: id,
        afterData: { newRole: role },
      });
    },
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["org-members", orgId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update role"),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("organization_members").delete().eq("id", id);
      if (error) throw error;

      await logAuditEvent({
        organizationId: orgId,
        actorId: userId,
        action: "remove_member",
        entityType: "organization_member",
        entityId: id,
      });
    },
    onSuccess: () => {
      toast.success("Member removed");
      qc.invalidateQueries({ queryKey: ["org-members", orgId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to remove"),
  });

  const revokeInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invitations").delete().eq("id", id);
      if (error) throw error;

      await logAuditEvent({
        organizationId: orgId,
        actorId: userId,
        action: "revoke_invitation",
        entityType: "invitation",
        entityId: id,
      });
    },
    onSuccess: () => {
      toast.success("Invitation revoked");
      qc.invalidateQueries({ queryKey: ["invitations", orgId] });
    },
  });

  function handleCopyInvite(inv: InvitationRow) {
    const link = `${window.location.origin}/accept-invite?token=${inv.token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(inv.id);
    toast.success("Invitation link copied to clipboard");
    setTimeout(() => setCopiedId(null), 2500);
  }

  const memberRows = members.data ?? [];
  const invitationRows = invitations.data ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Team & Members</h2>
        <p className="text-sm text-muted-foreground">
          Manage workspace members, assign granular roles, and invite teammates.
        </p>
      </div>

      {/* Invite Box */}
      {canManage && (
        <section className="rounded-2xl border border-border bg-white p-6 shadow-card">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-primary">
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Invite a Teammate</h3>
              <p className="text-xs text-muted-foreground">
                An invitation token will be created and ready to share.
              </p>
            </div>
          </div>

          <form
            className="mt-4 flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              invite.mutate();
            }}
          >
            <input
              type="email"
              required
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as AppRole)}
              className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm capitalize outline-none"
            >
              {ROLES.filter((r) => r !== "owner").map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              disabled={invite.isPending || !inviteEmail.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-elevated hover:opacity-95 disabled:opacity-60"
            >
              {invite.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Send Invite
            </button>
          </form>
        </section>
      )}

      {/* Members List */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg text-foreground">
            Active Members ({memberRows.length})
          </h3>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3.5">Member</th>
                <th className="px-5 py-3.5">Workspace Role</th>
                <th className="px-5 py-3.5">Joined Date</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {memberRows.map((m) => {
                const name = m.profiles?.full_name || `User (${m.user_id.slice(0, 8)})`;
                const isCurrentUser = m.user_id === userId;

                return (
                  <tr key={m.id} className="transition hover:bg-muted/30">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-border/60">
                          <AvatarImage src={m.profiles?.avatar_url ?? undefined} alt={name} />
                          <AvatarFallback className="bg-slate-900 text-xs font-semibold text-white">
                            {name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            {name}
                            {isCurrentUser && (
                              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-primary">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {m.user_id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {canManage && !isCurrentUser && m.role !== "owner" ? (
                        <select
                          value={m.role}
                          onChange={(e) =>
                            updateRole.mutate({ id: m.id, role: e.target.value as AppRole })
                          }
                          className="rounded-xl border border-input bg-background px-2.5 py-1 text-xs capitalize outline-none"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs font-semibold capitalize text-foreground">
                          <Shield className="h-3 w-3 text-primary" /> {m.role}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {formatDate(m.created_at)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {canManage && !isCurrentUser && m.role !== "owner" && (
                        <button
                          onClick={() => {
                            if (confirm(`Remove ${name} from this organization?`)) {
                              removeMember.mutate(m.id);
                            }
                          }}
                          className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remove
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pending Invitations */}
      {canManage && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg text-foreground">
              Pending Invitations ({invitationRows.length})
            </h3>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5">Recipient Email</th>
                  <th className="px-5 py-3.5">Assigned Role</th>
                  <th className="px-5 py-3.5">Expires</th>
                  <th className="px-5 py-3.5">Invite Link</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invitationRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-xs text-muted-foreground">
                      No pending team invitations.
                    </td>
                  </tr>
                ) : (
                  invitationRows.map((inv) => (
                    <tr key={inv.id} className="transition hover:bg-muted/30">
                      <td className="px-5 py-4 font-semibold text-foreground">{inv.email}</td>
                      <td className="px-5 py-4">
                        <span className="capitalize text-xs font-medium">{inv.role}</span>
                      </td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(inv.expires_at)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleCopyInvite(inv)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          {copiedId === inv.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          {copiedId === inv.id ? "Copied Link!" : "Copy Invite Link"}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => revokeInvite.mutate(inv.id)}
                          className="text-xs text-destructive hover:underline"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
