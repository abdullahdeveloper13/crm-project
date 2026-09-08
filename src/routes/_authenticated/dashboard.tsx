import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import {
  Building2,
  Plus,
  Users,
  ArrowRight,
  DollarSign,
  CheckSquare,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/crm-helpers";

type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  created_at: string;
};

type MembershipSummary = {
  role: string;
  organizations: OrganizationSummary;
};

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useSession();

  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ["my-orgs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("organization_members")
        .select("role, organizations(id, name, slug, plan, created_at)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MembershipSummary[];
    },
    enabled: !!user,
  });

  const orgIds = memberships.map((m) => m.organizations.id);

  const { data: allDeals = [] } = useQuery({
    queryKey: ["all-my-deals", orgIds],
    queryFn: async () => {
      if (orgIds.length === 0) return [];
      const { data, error } = await supabase
        .from("deals")
        .select("id, value, stage, organization_id")
        .in("organization_id", orgIds);
      if (error) return [];
      return data || [];
    },
    enabled: orgIds.length > 0,
  });

  const { data: allContacts = [] } = useQuery({
    queryKey: ["all-my-contacts", orgIds],
    queryFn: async () => {
      if (orgIds.length === 0) return [];
      const { data, error } = await supabase
        .from("contacts")
        .select("id, organization_id")
        .in("organization_id", orgIds);
      if (error) return [];
      return data || [];
    },
    enabled: orgIds.length > 0,
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ["all-my-tasks", orgIds],
    queryFn: async () => {
      if (orgIds.length === 0) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select("id, status, organization_id")
        .in("organization_id", orgIds);
      if (error) return [];
      return data || [];
    },
    enabled: orgIds.length > 0,
  });

  if (!user) return null;

  const avatarUrl = user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null;
  const avatarLabel = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? "";
  const avatarInitial = avatarLabel.trim().charAt(0).toUpperCase() || "U";

  const totalPipeline = allDeals
    .filter((d) => ["lead", "qualified", "proposal"].includes(d.stage))
    .reduce((acc, curr) => acc + Number(curr.value || 0), 0);

  const totalWon = allDeals
    .filter((d) => d.stage === "won")
    .reduce((acc, curr) => acc + Number(curr.value || 0), 0);

  const openTasksCount = allTasks.filter((t) => t.status !== "completed").length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col gap-4 rounded-3xl border border-border bg-white p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 border border-border/60">
            <AvatarImage src={avatarUrl ?? undefined} alt={avatarLabel} />
            <AvatarFallback className="bg-slate-900 text-base font-semibold text-white">
              {avatarInitial}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Welcome back, {user.user_metadata?.full_name?.split(" ")[0] || "there"}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-primary">
                <Sparkles className="h-3 w-3" /> Nova AI Enabled
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/organizations"
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-elevated hover:opacity-95"
          >
            <Plus className="h-4 w-4" /> Create Workspace
          </Link>
        </div>
      </div>

      {/* Cross-Org Stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Pipeline</span>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight">
            {formatCurrency(totalPipeline)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Across all active workspaces</div>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Won Revenue
            </span>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight">{formatCurrency(totalWon)}</div>
          <div className="mt-1 text-xs text-muted-foreground">Closed deals to date</div>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Tracked Contacts</span>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-purple-50 text-purple-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight">{allContacts.length}</div>
          <div className="mt-1 text-xs text-muted-foreground">Customer accounts & leads</div>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Open Action Items
            </span>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-600">
              <CheckSquare className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight">{openTasksCount}</div>
          <div className="mt-1 text-xs text-muted-foreground">Pending follow-ups</div>
        </div>
      </section>

      {/* Workspaces List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Your Workspaces</h2>
            <p className="text-xs text-muted-foreground">
              Select an organization to manage CRM contacts, sales deals, and teammates.
            </p>
          </div>
          <Link to="/organizations" className="text-xs font-semibold text-primary hover:underline">
            Manage organizations
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="h-32 animate-pulse rounded-2xl border border-border bg-white" />
            <div className="h-32 animate-pulse rounded-2xl border border-border bg-white" />
          </div>
        ) : memberships.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {memberships.map((m) => (
              <Link
                key={m.organizations.id}
                to="/organizations/$orgId"
                params={{ orgId: m.organizations.id }}
                className="group rounded-2xl border border-border bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-900 text-white shadow-xs">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground group-hover:text-primary transition">
                        {m.organizations.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        /{m.organizations.slug} · <span className="capitalize">{m.role}</span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-white/60 p-12 text-center shadow-card">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 font-semibold text-foreground">No organizations yet</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Create your first organization to begin managing your revenue pipeline.
            </p>
            <Link
              to="/organizations"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white shadow-elevated"
            >
              <Plus className="h-3.5 w-3.5" /> Create Organization
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
