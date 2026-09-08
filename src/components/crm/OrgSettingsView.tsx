import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Trash2, Loader2, Save, AlertTriangle, Zap } from "lucide-react";
import { toast } from "sonner";
import { formatDate, logAuditEvent, type AppRole } from "@/lib/crm-helpers";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";

type OrgSettingsViewProps = {
  org: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    created_at: string;
  };
  myRole: AppRole | undefined;
  userId: string;
};

export function OrgSettingsView({ org, myRole, userId }: OrgSettingsViewProps) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState(org.name);
  const [confirmation, setConfirmation] = useState<"leave" | "delete" | null>(null);

  const canEdit = myRole === "owner" || myRole === "admin";
  const isOwner = myRole === "owner";

  const updateOrg = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Organization name cannot be empty");
      const { error } = await supabase
        .from("organizations")
        .update({ name: name.trim() })
        .eq("id", org.id);
      if (error) throw error;

      await logAuditEvent({
        organizationId: org.id,
        actorId: userId,
        action: "update_organization_settings",
        entityType: "organization",
        entityId: org.id,
        afterData: { name },
      });
    },
    onSuccess: () => {
      toast.success("Workspace name updated");
      qc.invalidateQueries({ queryKey: ["org", org.id] });
      qc.invalidateQueries({ queryKey: ["my-orgs"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update"),
  });

  const deleteOrg = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("organizations").delete().eq("id", org.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Organization deleted successfully");
      setConfirmation(null);
      navigate({ to: "/organizations" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete"),
  });

  const leaveOrg = useMutation({
    mutationFn: async () => {
      const { data: member, error: findErr } = await supabase
        .from("organization_members")
        .select("id")
        .eq("organization_id", org.id)
        .eq("user_id", userId)
        .single();
      if (findErr || !member) throw new Error("Membership record not found");

      const { error } = await supabase.from("organization_members").delete().eq("id", member.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("You have left the organization");
      setConfirmation(null);
      navigate({ to: "/organizations" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to leave"),
  });

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Workspace Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage your organization profile, plan tier, and security preferences.
        </p>
      </div>

      {/* Profile Form */}
      <section className="rounded-2xl border border-border bg-white p-6 shadow-card space-y-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">General Information</h3>
            <p className="text-xs text-muted-foreground">Workspace identity and public slug</p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canEdit) updateOrg.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Organization Name
            </label>
            <input
              disabled={!canEdit}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-input bg-background p-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:opacity-60"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Workspace Slug
              </label>
              <input
                disabled
                value={org.slug}
                className="w-full rounded-xl border border-input bg-muted/60 p-2.5 text-sm text-muted-foreground font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Created Date
              </label>
              <input
                disabled
                value={formatDate(org.created_at)}
                className="w-full rounded-xl border border-input bg-muted/60 p-2.5 text-sm text-muted-foreground font-mono"
              />
            </div>
          </div>

          {canEdit && (
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={updateOrg.isPending || name === org.name}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-elevated hover:opacity-95 disabled:opacity-60"
              >
                {updateOrg.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Changes
              </button>
            </div>
          )}
        </form>
      </section>

      {/* Plan Tier */}
      <section className="rounded-2xl border border-border bg-white p-6 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-primary">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Subscription Tier</h3>
              <p className="text-xs text-muted-foreground">
                Current organization plan and features
              </p>
            </div>
          </div>
          <span className="rounded-full bg-brand/10 border border-brand/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            {org.plan || "Enterprise"}
          </span>
        </div>
        <div className="mt-4 rounded-xl border border-border/80 bg-muted/20 p-4 text-xs text-muted-foreground space-y-1">
          <div className="font-semibold text-foreground">Plan includes:</div>
          <div>✓ Unlimited CRM Contacts & Companies</div>
          <div>✓ AI Sales Copilot access for all team members</div>
          <div>✓ Multi-seat Role-Based Access Control</div>
          <div>✓ Full Audit Logs & Security Triggers</div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="rounded-2xl border border-red-200 bg-red-50/40 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="font-semibold text-destructive">Danger Zone</h3>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-2">
          <div>
            <div className="font-semibold text-sm text-foreground">Leave Organization</div>
            <p className="text-xs text-muted-foreground">
              Revoke your personal access to this workspace.
            </p>
          </div>
          <button
            onClick={() => setConfirmation("leave")}
            disabled={isOwner}
            title={isOwner ? "Owners must transfer ownership before leaving" : undefined}
            className="rounded-xl border border-border bg-white px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
          >
            Leave Workspace
          </button>
        </div>

        {isOwner && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-red-200">
            <div>
              <div className="font-semibold text-sm text-destructive">Delete Organization</div>
              <p className="text-xs text-muted-foreground">
                Permanently delete this workspace and all associated contacts, deals, and
                activities.
              </p>
            </div>
            <button
              onClick={() => setConfirmation("delete")}
              disabled={deleteOrg.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-destructive px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Workspace
            </button>
          </div>
        )}
      </section>
      <DeleteConfirmationDialog
        open={confirmation !== null}
        onOpenChange={(open) => !open && setConfirmation(null)}
        title={confirmation === "leave" ? "Leave this workspace?" : "Delete this workspace?"}
        itemLabel={confirmation === "leave" ? "workspace access" : "workspace"}
        description={
          confirmation === "leave"
            ? "You will lose access to this workspace until a member invites you again."
            : `This will permanently delete ${org.name}, its CRM data, and its team access. This action cannot be undone.`
        }
        confirmLabel={confirmation === "leave" ? "Leave workspace" : "Delete workspace"}
        isPending={confirmation === "leave" ? leaveOrg.isPending : deleteOrg.isPending}
        error={confirmation === "leave" ? leaveOrg.error : deleteOrg.error}
        onConfirm={() => (confirmation === "leave" ? leaveOrg.mutate() : deleteOrg.mutate())}
      />
    </div>
  );
}
