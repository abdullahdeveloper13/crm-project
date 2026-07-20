import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { slugify } from "@/lib/slugify";
import { toast } from "sonner";
import { ArrowRight, Building2, Loader2, Plus, ShieldCheck, Sparkles, Users } from "lucide-react";

type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

type MembershipSummary = {
  role: string;
  organizations: OrganizationSummary;
};

export const Route = createFileRoute("/_authenticated/organizations/")({
  component: OrgsIndex,
});

function OrgsIndex() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const { data: memberships, isLoading } = useQuery({
    queryKey: ["my-orgs", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("role, organizations(id, name, slug, created_at)");
      if (error) {
        if ((error as { code?: string }).code === "PGRST205") {
          throw new Error(
            "The organizations tables are not available in this Supabase project yet. Apply the database migration first.",
          );
        }
        throw error;
      }
      return (data ?? []) as MembershipSummary[];
    },
  });

  const createOrg = useMutation({
    mutationFn: async (orgName: string) => {
      const slug = `${slugify(orgName)}-${Math.random().toString(36).slice(2, 6)}`;
      const { data, error } = await supabase
        .from("organizations")
        .insert({ name: orgName, slug, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Organization created");
      setName("");
      qc.invalidateQueries({ queryKey: ["my-orgs"] });
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to create organization";
      toast.error(
        message.includes("migration") || message.includes("available")
          ? message
          : message.includes("permission") || message.includes("RLS") || message.includes("policy")
            ? "The database policy is blocking organization creation. Please check that the bootstrap migration is applied and that the authenticated role can insert into organizations."
            : message,
      );
    },
  });

  const schemaMissing =
    memberships === undefined && !isLoading && createOrg.error instanceof Error
      ? createOrg.error.message.includes("available")
      : false;

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 px-6 py-8 text-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.7)] sm:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(125,211,252,0.18),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.18),_transparent_26%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.3fr_0.9fr] lg:items-end">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Workspace setup
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Build a workspace that feels clear, premium, and team-ready.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Create your organization, invite teammates, and start managing CRM data from
                a polished home base.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-200">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-2">
                <ShieldCheck className="h-4 w-4" />
                Secure by default
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-2">
                <Users className="h-4 w-4" />
                Built for teams
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
            <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-slate-300">
              Quick start
            </h2>
            <p className="mt-2 text-lg font-semibold">Create a new organization</p>
            <p className="mt-1 text-sm leading-6 text-slate-300">
              You’ll be added as the owner automatically.
            </p>
            <form
              className="mt-5 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!name.trim()) return;
                createOrg.mutate(name.trim());
              }}
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Inc."
                className="w-full rounded-2xl border border-white/10 bg-white/95 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/20"
              />
              <button
                disabled={createOrg.isPending || !name.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createOrg.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create organization
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Your organizations</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Open a workspace to manage contacts, deals, and collaborators.
            </p>
          </div>
        </div>

        {schemaMissing && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            The live Supabase project is missing the organizations schema, so the page cannot
            load or create workspaces until that migration is applied.
          </div>
        )}

        {isLoading ? (
          <div className="h-28 animate-pulse rounded-3xl border border-border bg-white shadow-card" />
        ) : memberships && memberships.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {memberships.map((m) => (
              <Link
                key={m.organizations.id}
                to="/organizations/$orgId"
                params={{ orgId: m.organizations.id }}
                className="group rounded-3xl border border-border bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-[0_24px_60px_-24px_rgba(15,23,42,0.25)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold">{m.organizations.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        /{m.organizations.slug} · <span className="capitalize">{m.role}</span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-slate-900" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-border bg-white/70 p-10 text-center shadow-card">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 text-lg font-semibold">Nothing yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first organization above.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
