import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  Plus,
  Search,
  Phone,
  Mail,
  Video,
  FileText,
  CheckSquare,
  Sparkles,
  Trash2,
  Loader2,
  Filter,
  Clock,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, logAuditEvent, type ActivityKind } from "@/lib/crm-helpers";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";

type ActivityRow = Database["public"]["Tables"]["activities"]["Row"];

type ActivitiesViewProps = {
  orgId: string;
  userId: string;
  canEdit: boolean;
};

const KIND_CONFIG: Record<
  ActivityKind,
  { label: string; icon: typeof Phone; color: string; bg: string }
> = {
  call: { label: "Phone Call", icon: Phone, color: "text-blue-600", bg: "bg-blue-50" },
  email: { label: "Email Sent", icon: Mail, color: "text-purple-600", bg: "bg-purple-50" },
  meeting: { label: "Meeting Held", icon: Video, color: "text-emerald-600", bg: "bg-emerald-50" },
  note: { label: "Note / Memo", icon: FileText, color: "text-amber-600", bg: "bg-amber-50" },
  task: { label: "Task", icon: CheckSquare, color: "text-indigo-600", bg: "bg-indigo-50" },
  system: { label: "System Event", icon: Sparkles, color: "text-slate-600", bg: "bg-slate-50" },
};

export function ActivitiesView({ orgId, userId, canEdit }: ActivitiesViewProps) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedKind, setSelectedKind] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState<string | null>(null);

  // Form state
  const [kind, setKind] = useState<ActivityKind>("call");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [dealId, setDealId] = useState("");
  const [contactId, setContactId] = useState("");

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["activities", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["deals", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, title")
        .eq("organization_id", orgId);
      if (error) throw error;
      return data;
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, first_name, last_name")
        .eq("organization_id", orgId);
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!subject.trim()) throw new Error("Subject is required");

      const { data, error } = await supabase
        .from("activities")
        .insert({
          organization_id: orgId,
          created_by: userId,
          kind,
          subject: subject.trim(),
          body: body.trim() || null,
          deal_id: dealId || null,
          contact_id: contactId || null,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;

      await logAuditEvent({
        organizationId: orgId,
        actorId: userId,
        action: "log_activity",
        entityType: "activity",
        entityId: data.id,
        afterData: { kind, subject },
      });
    },
    onSuccess: () => {
      toast.success("Activity logged");
      closeModal();
      qc.invalidateQueries({ queryKey: ["activities", orgId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to log activity");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("activities").delete().eq("id", id);
      if (error) throw error;
      await logAuditEvent({
        organizationId: orgId,
        actorId: userId,
        action: "delete_activity",
        entityType: "activity",
        entityId: id,
      });
    },
    onSuccess: () => {
      toast.success("Activity deleted");
      setActivityToDelete(null);
      qc.invalidateQueries({ queryKey: ["activities", orgId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete activity");
    },
  });

  function openCreateModal() {
    setKind("call");
    setSubject("");
    setBody("");
    setDealId("");
    setContactId("");
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
  }

  const filteredActivities = activities.filter((act) => {
    const query = search.toLowerCase();
    const matchesSearch =
      act.subject.toLowerCase().includes(query) ||
      (act.body && act.body.toLowerCase().includes(query));
    const matchesKind = selectedKind === "all" || act.kind === selectedKind;
    return matchesSearch && matchesKind;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Activity Stream</h2>
          <p className="text-sm text-muted-foreground">
            Complete timeline of client meetings, phone calls, notes, and emails.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-elevated hover:opacity-95"
          >
            <Plus className="h-4 w-4" /> Log Activity
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search activities by subject or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-input bg-background pl-9 pr-4 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={selectedKind}
            onChange={(e) => setSelectedKind(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm capitalize outline-none"
          >
            <option value="all">All Types ({activities.length})</option>
            <option value="call">Calls</option>
            <option value="email">Emails</option>
            <option value="meeting">Meetings</option>
            <option value="note">Notes</option>
            <option value="task">Tasks</option>
          </select>
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
            <p className="mt-2">Loading activities...</p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="rounded-2xl border border-border bg-white p-12 text-center shadow-card">
            <Calendar className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 font-semibold text-foreground">No activities found</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {search || selectedKind !== "all"
                ? "Try adjusting your filters."
                : "Log your first call, meeting, or note."}
            </p>
            {canEdit && (
              <button
                onClick={openCreateModal}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white shadow-elevated"
              >
                <Plus className="h-3.5 w-3.5" /> Log Activity
              </button>
            )}
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:bottom-0 before:left-2 before:top-2 before:w-0.5 before:bg-border">
            {filteredActivities.map((act) => {
              const cfg = KIND_CONFIG[act.kind] || KIND_CONFIG.call;
              const Icon = cfg.icon;
              const linkedDeal = deals.find((d) => d.id === act.deal_id);
              const linkedContact = contacts.find((c) => c.id === act.contact_id);

              return (
                <div key={act.id} className="relative group">
                  {/* Timeline dot */}
                  <div
                    className={`absolute -left-[30px] top-3.5 grid h-6 w-6 place-items-center rounded-full border border-border ${cfg.bg} ${cfg.color} shadow-xs`}
                  >
                    <Icon className="h-3 w-3" />
                  </div>

                  <div className="rounded-2xl border border-border bg-white p-5 shadow-card transition group-hover:border-primary/30">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.color}`}
                          >
                            {cfg.label}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDate(act.created_at)}
                          </span>
                        </div>
                        <h4 className="mt-1.5 font-semibold text-foreground text-base">
                          {act.subject}
                        </h4>
                      </div>

                      {canEdit && (
                        <button
                          onClick={() => setActivityToDelete(act.id)}
                          className="opacity-0 group-hover:opacity-100 transition grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-red-50 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {act.body && (
                      <p className="mt-2.5 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {act.body}
                      </p>
                    )}

                    {(linkedDeal || linkedContact) && (
                      <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-3 border-t border-border/60 text-xs text-muted-foreground">
                        {linkedDeal && (
                          <span className="rounded-lg bg-muted px-2.5 py-1 font-medium text-foreground">
                            Deal: {linkedDeal.title}
                          </span>
                        )}
                        {linkedContact && (
                          <span className="rounded-lg bg-muted px-2.5 py-1 font-medium text-foreground">
                            Contact: {linkedContact.first_name} {linkedContact.last_name}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Log Activity Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Activity</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="space-y-4 pt-2"
          >
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Activity Type
              </label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as ActivityKind)}
                className="w-full rounded-xl border border-input bg-background p-2.5 text-sm outline-none capitalize"
              >
                <option value="call">Phone Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="note">Note / Memo</option>
                <option value="task">Task</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Subject *</label>
              <input
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Product demo follow-up call"
                className="w-full rounded-xl border border-input bg-background p-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Notes & Details
              </label>
              <textarea
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Client expressed interest in team seats, requested revised proposal by Friday..."
                className="w-full rounded-xl border border-input bg-background p-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Associated Deal
                </label>
                <select
                  value={dealId}
                  onChange={(e) => setDealId(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-sm outline-none"
                >
                  <option value="">None</option>
                  {deals.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Associated Contact
                </label>
                <select
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-sm outline-none"
                >
                  <option value="">None</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-elevated hover:opacity-95 disabled:opacity-60"
              >
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Log Activity
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <DeleteConfirmationDialog
        open={activityToDelete !== null}
        onOpenChange={(open) => !open && setActivityToDelete(null)}
        itemLabel="activity record"
        isPending={deleteMutation.isPending}
        error={deleteMutation.error}
        onConfirm={() => activityToDelete && deleteMutation.mutate(activityToDelete)}
      />
    </div>
  );
}
