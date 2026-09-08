import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Building2, Loader2, Plus, ShieldCheck, Users } from "lucide-react";
import { toUserFacingError, logTechnicalError } from "@/lib/supabase-errors";
import { EmptyState, ErrorState, SkeletonGrid } from "@/components/PageState";

type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

type MembershipSummary = {
  role: string;
  organizations: OrganizationSummary | null;
};

export const Route = createFileRoute("/_authenticated/organizations/")({
  component: OrgsIndex,
});

function OrgsIndex() {
  const { user } = useSession();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const membershipsQuery = useQuery({
    queryKey: ["my-orgs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("organization_members")
        .select("role, organizations(id, name, slug, created_at)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        logTechnicalError("list organizations", error);
        throw error;
      }
      return ((data ?? []) as MembershipSummary[]).filter(
        (m): m is MembershipSummary & { organizations: OrganizationSummary } =>
          !!m.organizations?.id,
      );
    },
    enabled: !!user,
  });

  const createOrg = useMutation({
    mutationFn: async (orgName: string) => {
      if (!user) throw new Error("Please sign in to continue.");
      const trimmed = orgName.trim();
      if (trimmed.length < 2) throw new Error("Organization name must be at least 2 characters.");
      const { data, error } = await supabase.rpc("create_organization", {
        org_name: trimmed,
        owner_id: user.id,
      });
      if (error) {
        logTechnicalError("create organization", error);
        throw error;
      }
      if (!data?.id) {
        throw new Error("This organization could not be created.");
      }
      return data;
    },
    onSuccess: async (org) => {
      toast.success("Organization created");
      setName("");
      setFormError(null);
      await qc.invalidateQueries({ queryKey: ["my-orgs"] });
      navigate({ to: "/organizations/$orgId", params: { orgId: org.id }, search: { tab: "overview" } });
    },
    onError: (err) => {
      const message = toUserFacingError(err, "This organization could not be created.");
      setFormError(message);
      toast.error(message);
    },
  });

  const memberships = membershipsQuery.data ?? [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Workspaces</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your organizations</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Create a workspace, invite your team, and manage pipeline data with role-based access.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Secure by default
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1">
              <Users className="h-3.5 w-3.5 text-primary" /> Built for teams
            </span>
          </div>
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6">
        <h2 className="text-sm font-semibold">Create a new organization</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You will be added as the owner automatically.
        </p>
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() || createOrg.isPending) return;
            createOrg.mutate(name.trim());
          }}
        >
          <label className="sr-only" htmlFor="org-name">
            Organization name
          </label>
          <input
            id="org-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setFormError(null);
            }}
            placeholder="Acme Inc."
            maxLength={80}
            className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-ring focus:ring-4 focus:ring-ring/20"
          />
          <button
            type="submit"
            disabled={createOrg.isPending || name.trim().length < 2}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-elevated hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createOrg.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create organization
          </button>
        </form>
        {formError ? <p className="mt-3 text-sm text-destructive">{formError}</p> : null}
      </section>

      <section className="mt-8">
        {membershipsQuery.isLoading ? (
          <SkeletonGrid count={3} />
        ) : membershipsQuery.isError ? (
          <ErrorState
            title="Organizations could not be loaded"
            description={toUserFacingError(
              membershipsQuery.error,
              "The workspace list could not be loaded.",
            )}
            onRetry={() => membershipsQuery.refetch()}
          />
        ) : memberships.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {memberships.map((m) => (
              <Link
                key={m.organizations.id}
                to="/organizations/$orgId"
                params={{ orgId: m.organizations.id }}
                search={{ tab: "overview" }}
                className="group rounded-2xl border border-border bg-white p-5 shadow-card transition hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold">{m.organizations.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        /{m.organizations.slug} · <span className="capitalize">{m.role}</span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Building2 className="h-5 w-5" />}
            title="No organizations yet"
            description="Create your first organization above to open a CRM workspace."
          />
        )}
      </section>
    </main>
  );
}
