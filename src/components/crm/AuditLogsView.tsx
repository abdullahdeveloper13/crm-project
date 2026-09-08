import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShieldAlert, Search, Loader2, Clock, Filter, User, Eye } from "lucide-react";
import { formatDate } from "@/lib/crm-helpers";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type AuditLogsViewProps = {
  orgId: string;
};

export function AuditLogsView({ orgId }: AuditLogsViewProps) {
  const [search, setSearch] = useState("");
  const [selectedEntity, setSelectedEntity] = useState("all");
  const [inspectLog, setInspectLog] = useState<unknown | null>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit_logs", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const filteredLogs = logs.filter((log) => {
    const query = search.toLowerCase();
    const matchesSearch =
      log.action.toLowerCase().includes(query) ||
      log.entity_type.toLowerCase().includes(query) ||
      (log.actor_id && log.actor_id.toLowerCase().includes(query));
    const matchesEntity = selectedEntity === "all" || log.entity_type === selectedEntity;
    return matchesSearch && matchesEntity;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-white">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Security & Audit Logs</h2>
            <p className="text-sm text-muted-foreground">
              Immutable trail of data modifications, member actions, and pipeline events.
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search logs by action, actor, or entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-input bg-background pl-9 pr-4 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm capitalize outline-none"
          >
            <option value="all">All Entity Types</option>
            <option value="deal">Deals</option>
            <option value="contact">Contacts</option>
            <option value="company">Companies</option>
            <option value="task">Tasks</option>
            <option value="activity">Activities</option>
            <option value="invitation">Invitations</option>
            <option value="organization_member">Members</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
            <p className="mt-2">Loading audit logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 font-semibold text-foreground">No audit logs recorded</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              User actions in this workspace will automatically appear here.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Action</th>
                <th className="px-5 py-3.5">Entity</th>
                <th className="px-5 py-3.5">Actor</th>
                <th className="px-5 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLogs.map((log) => {
                const isDelete = log.action.includes("delete") || log.action.includes("remove");
                const isCreate = log.action.includes("create") || log.action.includes("import");

                return (
                  <tr key={log.id} className="transition hover:bg-muted/30">
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3" />
                        {formatDate(log.created_at)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold font-mono ${
                          isDelete
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : isCreate
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-foreground">
                      {log.entity_type}
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5 font-mono">
                        <User className="h-3 w-3" />
                        {log.actor_id ? `${log.actor_id.slice(0, 8)}...` : "System"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {(log.before_data || log.after_data) && (
                        <button
                          onClick={() => setInspectLog(log)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          <Eye className="h-3.5 w-3.5" /> Inspect
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Inspect Modal */}
      <Dialog open={inspectLog !== null} onOpenChange={() => setInspectLog(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
          </DialogHeader>
          <div className="mt-2 rounded-xl border border-border bg-slate-950 p-4 font-mono text-xs text-slate-200 overflow-x-auto max-h-[400px]">
            <pre>{JSON.stringify(inspectLog, null, 2)}</pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
