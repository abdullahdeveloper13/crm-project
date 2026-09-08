import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  LayoutDashboard,
  DollarSign,
  Users,
  Building2,
  CheckSquare,
  Activity,
  UserPlus,
  ShieldAlert,
  Settings,
  Sparkles,
  Search,
  Menu,
} from "lucide-react";
import {
  canManageCompanies,
  canManageContacts,
  canManageDeals,
  canManageMembers,
  canManageTasks,
  canManageActivities,
  type AppRole,
} from "@/lib/crm-helpers";
import { isWorkspaceTab, rememberLastOrgId, type WorkspaceTab } from "@/lib/safe-redirect";
import { toUserFacingError, logTechnicalError } from "@/lib/supabase-errors";
import { ErrorState, LoadingState } from "@/components/PageState";
import { WorkspaceOverview } from "@/components/crm/WorkspaceOverview";
import { ContactsView } from "@/components/crm/ContactsView";
import { CompaniesView } from "@/components/crm/CompaniesView";
import { DealsPipelineView } from "@/components/crm/DealsPipelineView";
import { TasksView } from "@/components/crm/TasksView";
import { ActivitiesView } from "@/components/crm/ActivitiesView";
import { TeamMembersView } from "@/components/crm/TeamMembersView";
import { AuditLogsView } from "@/components/crm/AuditLogsView";
import { OrgSettingsView } from "@/components/crm/OrgSettingsView";
import { AICopilotModal } from "@/components/crm/AICopilotModal";
import { GlobalSearchModal } from "@/components/GlobalSearchModal";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const workspaceSearchSchema = z.object({
  tab: z
    .enum([
      "overview",
      "pipeline",
      "contacts",
      "companies",
      "tasks",
      "activities",
      "team",
      "audit_logs",
      "settings",
    ])
    .optional(),
});

export const Route = createFileRoute("/_authenticated/organizations/$orgId")({
  validateSearch: (s) => workspaceSearchSchema.parse(s),
  component: OrgDetail,
});

type TabItem = { id: WorkspaceTab; label: string; icon: typeof LayoutDashboard };

function OrgDetail() {
  const { orgId } = Route.useParams();
  const { tab: tabFromUrl } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useSession();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotContext, setCopilotContext] = useState<
    | {
        contactName?: string;
        companyName?: string;
        dealTitle?: string;
        dealValue?: number;
        stage?: string;
      }
    | undefined
  >(undefined);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const org = useQuery({
    queryKey: ["org", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .maybeSingle();
      if (error) {
        logTechnicalError("load organization", error);
        throw error;
      }
      return data;
    },
    enabled: !!orgId,
  });

  const memberInfo = useQuery({
    queryKey: ["org-my-role", orgId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", orgId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        logTechnicalError("load membership", error);
        throw error;
      }
      return (data?.role as AppRole) || null;
    },
    enabled: !!user && !!orgId,
  });

  const orgSwitcher = useQuery({
    queryKey: ["my-orgs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("organization_members")
        .select("role, organizations(id, name)")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []).filter((m) => m.organizations);
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (org.data?.id) rememberLastOrgId(org.data.id);
  }, [org.data?.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const myRole = memberInfo.data;
  const canManage = canManageMembers(myRole ?? undefined);
  const requestedTab: WorkspaceTab = isWorkspaceTab(tabFromUrl) ? tabFromUrl : "overview";
  const activeTab: WorkspaceTab =
    requestedTab === "audit_logs" && !canManage ? "overview" : requestedTab;

  function setTab(next: WorkspaceTab) {
    setMobileNavOpen(false);
    navigate({
      to: "/organizations/$orgId",
      params: { orgId },
      search: { tab: next },
      replace: true,
    });
  }

  if (!user) return null;

  if (org.isLoading || memberInfo.isLoading) {
    return <LoadingState label="Loading organization workspace..." />;
  }

  if (org.isError) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <ErrorState
          title="The workspace could not be loaded"
          description={toUserFacingError(org.error, "The workspace could not be loaded.")}
          onRetry={() => org.refetch()}
        />
      </main>
    );
  }

  if (!org.data || !myRole) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16 text-center">
        <div className="rounded-2xl border border-border bg-white p-10 shadow-card">
          <h2 className="text-2xl font-semibold">Workspace not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You do not have access to this organization, or it no longer exists.
          </p>
          <Link
            to="/organizations"
            className="mt-6 inline-flex rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white"
          >
            Back to organizations
          </Link>
        </div>
      </main>
    );
  }

  const tabs: TabItem[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "pipeline", label: "Pipeline", icon: DollarSign },
    { id: "contacts", label: "Contacts", icon: Users },
    { id: "companies", label: "Companies", icon: Building2 },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "activities", label: "Activities", icon: Activity },
    { id: "team", label: "Team", icon: UserPlus },
    ...(canManage ? [{ id: "audit_logs" as const, label: "Audit Logs", icon: ShieldAlert }] : []),
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const nav = (
    <nav className="space-y-1" aria-label="Workspace">
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = activeTab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-slate-900 text-white"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {t.label}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-24 space-y-4 rounded-2xl border border-border bg-white p-3 shadow-card">
          <label className="block px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Workspace
          </label>
          <select
            aria-label="Switch organization"
            className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm"
            value={orgId}
            onChange={(e) =>
              navigate({
                to: "/organizations/$orgId",
                params: { orgId: e.target.value },
                search: { tab: activeTab },
              })
            }
          >
            {(orgSwitcher.data ?? []).map((m) => (
              <option key={m.organizations!.id} value={m.organizations!.id}>
                {m.organizations!.name}
              </option>
            ))}
          </select>
          {nav}
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-5">
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-lg border border-border lg:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open workspace menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight">{org.data.name}</h1>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold capitalize">
                  {myRole}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                /{org.data.slug} · {org.data.plan || "starter"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              <Search className="h-3.5 w-3.5" />
              Search
              <kbd className="hidden rounded bg-white px-1.5 py-0.5 font-mono text-[10px] sm:inline">
                ⌘K
              </kbd>
            </button>
            <button
              type="button"
              onClick={() => {
                setCopilotContext({ companyName: org.data.name });
                setIsCopilotOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
            >
              <Sparkles className="h-3.5 w-3.5" /> Drafts
            </button>
          </div>
        </div>

        {activeTab === "overview" && (
          <WorkspaceOverview
            orgId={orgId}
            canEditContacts={canManageContacts(myRole)}
            canEditDeals={canManageDeals(myRole)}
            onNavigateTab={(tab) => {
              if (isWorkspaceTab(tab)) setTab(tab);
            }}
            onOpenAICopilot={() => {
              setCopilotContext({ companyName: org.data.name });
              setIsCopilotOpen(true);
            }}
            onOpenNewDeal={() => setTab("pipeline")}
            onOpenNewContact={() => setTab("contacts")}
          />
        )}

        {activeTab === "pipeline" && (
          <DealsPipelineView
            orgId={orgId}
            userId={user.id}
            canEdit={canManageDeals(myRole)}
            onOpenAICopilotForDeal={(deal) => {
              setCopilotContext({
                dealTitle: deal.title,
                dealValue: deal.value,
                stage: deal.stage,
                companyName: org.data.name,
              });
              setIsCopilotOpen(true);
            }}
          />
        )}

        {activeTab === "contacts" && (
          <ContactsView
            orgId={orgId}
            userId={user.id}
            canEdit={canManageContacts(myRole)}
            onOpenAICopilotForContact={(c) => {
              setCopilotContext({
                contactName: c.name,
                companyName: org.data.name,
              });
              setIsCopilotOpen(true);
            }}
          />
        )}

        {activeTab === "companies" && (
          <CompaniesView orgId={orgId} userId={user.id} canEdit={canManageCompanies(myRole)} />
        )}

        {activeTab === "tasks" && (
          <TasksView orgId={orgId} userId={user.id} canEdit={canManageTasks(myRole)} />
        )}

        {activeTab === "activities" && (
          <ActivitiesView orgId={orgId} userId={user.id} canEdit={canManageActivities(myRole)} />
        )}

        {activeTab === "team" && (
          <TeamMembersView orgId={orgId} userId={user.id} canManage={canManage} />
        )}

        {activeTab === "audit_logs" && <AuditLogsView orgId={orgId} />}

        {activeTab === "settings" && (
          <OrgSettingsView org={org.data} myRole={myRole} userId={user.id} />
        )}
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72">
          <SheetHeader>
            <SheetTitle>Workspace</SheetTitle>
          </SheetHeader>
          <div className="mt-4">{nav}</div>
        </SheetContent>
      </Sheet>

      <AICopilotModal
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        contextData={copilotContext}
      />

      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        orgId={orgId}
        onSelectResult={(tab) => {
          if (isWorkspaceTab(tab)) setTab(tab);
        }}
      />
    </div>
  );
}
