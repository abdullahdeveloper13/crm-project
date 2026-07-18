import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { slugify } from "@/lib/slugify";
import { toast } from "sonner";
import { Building2, Plus, ArrowRight, Loader2 } from "lucide-react";

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
      if (error) throw error;
      return data ?? [];
    },
  });

  const createOrg = useMutation({
    mutationFn: async (orgName: string) => {
      const slug = slugify(orgName) + "-" + Math.random().toString(36).slice(2, 6);
      const { data: org, error } = await supabase
        .from("organizations")
        .insert({ name: orgName, slug, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      const { error: memErr } = await supabase
        .from("organization_members")
        .insert({ organization_id: org.id, user_id: user.id, role: "owner" });
      if (memErr) throw memErr;
      return org;
    },
    onSuccess: () => {
      toast.success("Organization created");
      setName("");
      qc.invalidateQueries({ queryKey: ["my-orgs"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
      </div>

      <section className="mt-6 rounded-xl border border-border bg-white p-5 shadow-card">
        <h2 className="font-semibold">Create a new organization</h2>
        <p className="mt-1 text-sm text-muted-foreground">You'll be its Owner. Invite teammates in the next step.</p>
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row"
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
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-4 focus:ring-ring/20"
          />
          <button
            disabled={createOrg.isPending || !name.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-elevated disabled:opacity-60"
          >
            {createOrg.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create
          </button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Your organizations</h2>
        {isLoading ? (
          <div className="h-24 animate-pulse rounded-xl border border-border bg-white shadow-card" />
        ) : memberships && memberships.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {memberships.map((m: any) => (
              <Link
                key={m.organizations.id}
                to="/organizations/$orgId"
                params={{ orgId: m.organizations.id }}
                className="group flex items-center justify-between rounded-xl border border-border bg-white p-5 shadow-card hover:border-primary/40"
              >
                <div>
                  <div className="font-semibold">{m.organizations.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">/{m.organizations.slug} · <span className="capitalize">{m.role}</span></div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-white/60 p-10 text-center">
            <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-3 font-semibold">Nothing yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Create your first organization above.</p>
          </div>
        )}
      </section>
    </main>
  );
}
