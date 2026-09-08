const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const WORKSPACE_TABS = [
  "overview",
  "pipeline",
  "contacts",
  "companies",
  "tasks",
  "activities",
  "team",
  "audit_logs",
  "settings",
] as const;

export type WorkspaceTab = (typeof WORKSPACE_TABS)[number];

export function isWorkspaceTab(value: string | undefined | null): value is WorkspaceTab {
  return !!value && (WORKSPACE_TABS as readonly string[]).includes(value);
}

export function sanitizeNextUrl(next?: string | null): string {
  if (!next) return "/dashboard";
  let trimmed = next.trim();
  try {
    trimmed = decodeURIComponent(trimmed);
  } catch {
    return "/dashboard";
  }
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return "/dashboard";
  }
  if (trimmed.includes("://") || trimmed.includes("\\")) {
    return "/dashboard";
  }
  if (trimmed === "/" || trimmed.startsWith("/auth")) {
    return "/dashboard";
  }
  return trimmed;
}

export function isUuid(value: string | undefined | null): boolean {
  return !!value && UUID_RE.test(value);
}

export const LAST_ORG_STORAGE_KEY = "novacrm.lastOrgId";

export function rememberLastOrgId(orgId: string) {
  if (typeof window === "undefined" || !isUuid(orgId)) return;
  window.localStorage.setItem(LAST_ORG_STORAGE_KEY, orgId);
}

export function readLastOrgId(): string | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(LAST_ORG_STORAGE_KEY);
  return isUuid(value) ? value : null;
}
