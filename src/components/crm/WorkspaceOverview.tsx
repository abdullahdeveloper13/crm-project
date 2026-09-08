import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DollarSign,
  TrendingUp,
  Users,
  CheckSquare,
  Sparkles,
  Plus,
  ArrowRight,
  Calendar,
  Clock,
  Phone,
  Mail,
  FileText,
  Video,
} from "lucide-react";
import { formatCurrency, formatDate, STAGE_CONFIG, type CrmStage } from "@/lib/crm-helpers";

type WorkspaceOverviewProps = {
  orgId: string;
  onNavigateTab: (tab: string) => void;
  onOpenAICopilot: () => void;
  onOpenNewDeal: () => void;
  onOpenNewContact: () => void;
  canEditContacts: boolean;
  canEditDeals: boolean;
};

export function WorkspaceOverview({
  orgId,
  onNavigateTab,
  onOpenAICopilot,
  onOpenNewDeal,
  onOpenNewContact,
  canEditContacts,
  canEditDeals,
}: WorkspaceOverviewProps) {
  const { data: deals = [] } = useQuery({
    queryKey: ["deals", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("organization_id", orgId);
      if (error) throw error;
      return data;
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["activities", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  const pipelineValue = deals
    .filter((d) => ["lead", "qualified", "proposal"].includes(d.stage))
    .reduce((acc, curr) => acc + Number(curr.value || 0), 0);

  const wonRevenue = deals
    .filter((d) => d.stage === "won")
    .reduce((acc, curr) => acc + Number(curr.value || 0), 0);

  const activeDealsCount = deals.filter((d) =>
    ["lead", "qualified", "proposal"].includes(d.stage),
  ).length;

  const openTasks = tasks.filter((t) => t.status !== "completed");

  const stages: CrmStage[] = ["lead", "qualified", "proposal", "won", "lost"];
  const stageStats = stages.map((st) => {
    const stageDeals = deals.filter((d) => d.stage === st);
    const sum = stageDeals.reduce((acc, curr) => acc + Number(curr.value || 0), 0);
    return {
      stage: st,
      config: STAGE_CONFIG[st],
      count: stageDeals.length,
      sum,
    };
  });

  return (
    <div className="space-y-8">
      {/* Action Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Revenue Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Real-time pipeline metrics and deal activity.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenAICopilot}
            className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-accent px-4 py-2 text-sm font-semibold text-primary transition hover:bg-accent/80"
          >
            <Sparkles className="h-4 w-4" /> AI Copilot
          </button>
          {canEditContacts && (
            <button
              onClick={onOpenNewContact}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted"
            >
              <Users className="h-4 w-4" /> Add Contact
            </button>
          )}
          {canEditDeals && (
            <button
              onClick={onOpenNewDeal}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-elevated transition hover:opacity-95"
            >
              <Plus className="h-4 w-4" /> New Deal
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Pipeline</span>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight">
            {formatCurrency(pipelineValue)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {activeDealsCount} active deal{activeDealsCount === 1 ? "" : "s"} in progress
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Won Revenue</span>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight">{formatCurrency(wonRevenue)}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {deals.filter((d) => d.stage === "won").length} closed won deal(s)
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Contacts</span>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-purple-50 text-purple-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight">{contacts.length}</div>
          <div className="mt-1 text-xs text-muted-foreground">Accounts and prospects tracked</div>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Open Tasks</span>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-600">
              <CheckSquare className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight">{openTasks.length}</div>
          <div className="mt-1 text-xs text-muted-foreground">Pending action items</div>
        </div>
      </div>

      {/* Stage Breakdown */}
      <section className="rounded-2xl border border-border bg-white p-6 shadow-card">
        <div className="flex items-center justify-between pb-4">
          <div>
            <h3 className="font-semibold text-foreground">Sales Pipeline Stages</h3>
            <p className="text-xs text-muted-foreground">
              Distribution of deal values across stages
            </p>
          </div>
          <button
            onClick={() => onNavigateTab("pipeline")}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Open Kanban Board <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-5">
          {stageStats.map((item) => (
            <div
              key={item.stage}
              className={`rounded-xl border p-4 transition ${item.config.border} ${item.config.bg}`}
            >
              <div className="flex items-center justify-between text-xs font-medium">
                <span className={item.config.color}>{item.config.label}</span>
                <span className="rounded-full bg-white/80 px-2 py-0.5 font-bold shadow-xs">
                  {item.count}
                </span>
              </div>
              <div className="mt-2 text-lg font-bold text-foreground">
                {formatCurrency(item.sum)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Two Column: Recent Activities & Upcoming Tasks */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activities */}
        <section className="rounded-2xl border border-border bg-white p-6 shadow-card">
          <div className="flex items-center justify-between pb-4">
            <h3 className="font-semibold text-foreground">Recent Activities</h3>
            <button
              onClick={() => onNavigateTab("activities")}
              className="text-xs font-semibold text-primary hover:underline"
            >
              View all
            </button>
          </div>
          {activities.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No recent activity recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((act) => {
                const Icon =
                  act.kind === "call"
                    ? Phone
                    : act.kind === "email"
                      ? Mail
                      : act.kind === "meeting"
                        ? Video
                        : FileText;
                return (
                  <div
                    key={act.id}
                    className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3"
                  >
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{act.subject}</div>
                      {act.body && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                          {act.body}
                        </p>
                      )}
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" /> {formatDate(act.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Pending Tasks */}
        <section className="rounded-2xl border border-border bg-white p-6 shadow-card">
          <div className="flex items-center justify-between pb-4">
            <h3 className="font-semibold text-foreground">Open Action Items</h3>
            <button
              onClick={() => onNavigateTab("tasks")}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Manage tasks
            </button>
          </div>
          {openTasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              All tasks are completed! Good job.
            </div>
          ) : (
            <div className="space-y-3">
              {openTasks.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 p-3"
                >
                  <div className="flex items-start gap-3">
                    <CheckSquare className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <div className="text-sm font-semibold text-foreground">{t.title}</div>
                      {t.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                          {t.description}
                        </p>
                      )}
                      {t.due_date && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Calendar className="h-3 w-3" /> Due {formatDate(t.due_date)}
                        </div>
                      )}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      t.priority === "urgent"
                        ? "bg-red-100 text-red-700"
                        : t.priority === "high"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {t.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
