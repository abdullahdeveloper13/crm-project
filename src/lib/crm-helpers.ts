import type { Database, Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type CrmStage = Database["public"]["Enums"]["crm_stage"];
export type ActivityKind = Database["public"]["Enums"]["activity_kind"];
export type NotificationChannel = Database["public"]["Enums"]["notification_channel"];
export type NotificationStatus = Database["public"]["Enums"]["notification_status"];

export const STAGE_CONFIG: Record<
  CrmStage,
  { label: string; color: string; bg: string; border: string }
> = {
  lead: {
    label: "Lead",
    color: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-800",
  },
  qualified: {
    label: "Qualified",
    color: "text-purple-700 dark:text-purple-300",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    border: "border-purple-200 dark:border-purple-800",
  },
  proposal: {
    label: "Proposal",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
  },
  won: {
    label: "Won",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  lost: {
    label: "Lost",
    color: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-200 dark:border-rose-800",
  },
};

export const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  urgent: { label: "Urgent", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  high: { label: "High", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  normal: { label: "Normal", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  low: { label: "Low", color: "text-slate-700", bg: "bg-slate-50 border-slate-200" },
};

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  } catch {
    return dateString;
  }
}

export function canManageMembers(role: AppRole | undefined): boolean {
  return role === "owner" || role === "admin";
}

export function canManageWorkspaceSettings(role: AppRole | undefined): boolean {
  return role === "owner" || role === "admin";
}

export function canDeleteWorkspace(role: AppRole | undefined): boolean {
  return role === "owner";
}

export function canManageContacts(role: AppRole | undefined): boolean {
  if (!role) return false;
  return ["owner", "admin", "manager", "sales", "support"].includes(role);
}

export function canManageCompanies(role: AppRole | undefined): boolean {
  if (!role) return false;
  return ["owner", "admin", "manager", "sales"].includes(role);
}

export function canManageDeals(role: AppRole | undefined): boolean {
  return canManageCompanies(role);
}

export function canManageTasks(role: AppRole | undefined): boolean {
  return !!role;
}

export function canManageActivities(role: AppRole | undefined): boolean {
  return !!role;
}

/** @deprecated Use the more specific helpers that match RLS. */
export function canManageCRM(role: AppRole | undefined): boolean {
  return canManageContacts(role);
}

export async function logAuditEvent({
  organizationId,
  actorId,
  action,
  entityType,
  entityId,
  beforeData,
  afterData,
}: {
  organizationId: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
}) {
  try {
    await supabase.from("audit_logs").insert({
      organization_id: organizationId,
      actor_id: actorId,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      before_data: (beforeData as Json) ?? null,
      after_data: (afterData as Json) ?? null,
    });
  } catch (err) {
    console.warn("Audit log recording failed:", err);
  }
}
