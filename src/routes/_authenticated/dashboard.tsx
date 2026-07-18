import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Plus, Users, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const { data: memberships, isLoading } = useQuery({
    queryKey: ["my-orgs", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("role, organizations(id, name, slug, created_at)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        </div>
        <Link to="/organizations" className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-elevated">
          <Plus className="h-4 w-4" /> New organization
        </Link>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <Stat label="Organizations" value={memberships?.length ?? 0} icon={Building2} />
        <Stat label="Roles held" value={new Set(memberships?.map((m) => m.role)).size || 0} icon={Users} />
        <Stat label="Status" value="Active" icon={ArrowRight} />
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your organizations</h2>
          <Link to="/organizations" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Skeleton /><Skeleton />
          </div>
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
            <h3 className="mt-3 font-semibold">No organizations yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Create one to invite your team.</p>
            <Link to="/organizations" className="mt-4 inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-elevated">
              <Plus className="h-4 w-4" /> Create organization
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon: any }) {
  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}

function Skeleton() {
  return <div className="h-24 animate-pulse rounded-xl border border-border bg-white shadow-card" />;
}
