import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  Plus,
  Search,
  CheckCircle2,
  Circle,
  Calendar,
  Trash2,
  Edit2,
  Loader2,
  Filter,
  AlertCircle,
  CheckSquare,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, PRIORITY_CONFIG, logAuditEvent } from "@/lib/crm-helpers";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

type TasksViewProps = {
  orgId: string;
  userId: string;
  canEdit: boolean;
};

export function TasksView({ orgId, userId, canEdit }: TasksViewProps) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<TaskRow | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [status, setStatus] = useState("open");
  const [dueDate, setDueDate] = useState("");
  const [dealId, setDealId] = useState("");
  const [contactId, setContactId] = useState("");

  const { data: tasks = [], isLoading } = useQuery({
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
      if (!title.trim()) throw new Error("Task title is required");

      if (editingTask) {
        const { error } = await supabase
          .from("tasks")
          .update({
            title: title.trim(),
            description: description.trim() || null,
            priority,
            status,
            due_date: dueDate || null,
            deal_id: dealId || null,
            contact_id: contactId || null,
          })
          .eq("id", editingTask.id);
        if (error) throw error;
        await logAuditEvent({
          organizationId: orgId,
          actorId: userId,
          action: "update_task",
          entityType: "task",
          entityId: editingTask.id,
          afterData: { title, priority, status, due_date: dueDate },
        });
      } else {
        const { data, error } = await supabase
          .from("tasks")
          .insert({
            organization_id: orgId,
            created_by: userId,
            assigned_to: userId,
            title: title.trim(),
            description: description.trim() || null,
            priority,
            status,
            due_date: dueDate || null,
            deal_id: dealId || null,
            contact_id: contactId || null,
          })
          .select()
          .single();
        if (error) throw error;
        await logAuditEvent({
          organizationId: orgId,
          actorId: userId,
          action: "create_task",
          entityType: "task",
          entityId: data.id,
          afterData: { title, priority, status, due_date: dueDate },
        });
      }
    },
    onSuccess: () => {
      toast.success(editingTask ? "Task updated" : "Task created");
      closeModal();
      qc.invalidateQueries({ queryKey: ["tasks", orgId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to save task");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const { error } = await supabase.from("tasks").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", orgId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
      await logAuditEvent({
        organizationId: orgId,
        actorId: userId,
        action: "delete_task",
        entityType: "task",
        entityId: id,
      });
    },
    onSuccess: () => {
      toast.success("Task deleted");
      setTaskToDelete(null);
      qc.invalidateQueries({ queryKey: ["tasks", orgId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete task");
    },
  });

  function openCreateModal() {
    setEditingTask(null);
    setTitle("");
    setDescription("");
    setPriority("normal");
    setStatus("open");
    setDueDate("");
    setDealId("");
    setContactId("");
    setIsModalOpen(true);
  }

  function openEditModal(t: TaskRow) {
    setEditingTask(t);
    setTitle(t.title);
    setDescription(t.description || "");
    setPriority(t.priority || "normal");
    setStatus(t.status || "open");
    setDueDate(t.due_date || "");
    setDealId(t.deal_id || "");
    setContactId(t.contact_id || "");
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingTask(null);
  }

  const todayStr = new Date().toISOString().split("T")[0];

  const filteredTasks = tasks.filter((t) => {
    const query = search.toLowerCase();
    const matchesSearch =
      t.title.toLowerCase().includes(query) ||
      (t.description && t.description.toLowerCase().includes(query));
    const matchesPriority = selectedPriority === "all" || t.priority === selectedPriority;
    const matchesStatus =
      selectedStatus === "all"
        ? true
        : selectedStatus === "open"
          ? t.status !== "completed"
          : t.status === selectedStatus;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tasks & Action Items</h2>
          <p className="text-sm text-muted-foreground">
            Manage your daily pipeline action items, reminders, and follow-ups.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-elevated hover:opacity-95"
          >
            <Plus className="h-4 w-4" /> Add Task
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks by title or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-input bg-background pl-9 pr-4 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open / Pending</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm capitalize outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Tasks List */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
            <p className="mt-2">Loading tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-12 text-center">
            <CheckSquare className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 font-semibold text-foreground">No tasks found</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {search || selectedPriority !== "all" || selectedStatus !== "all"
                ? "Try adjusting your filters."
                : "Create a task to keep track of customer follow-ups."}
            </p>
            {canEdit && (
              <button
                onClick={openCreateModal}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white shadow-elevated"
              >
                <Plus className="h-3.5 w-3.5" /> Add Task
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredTasks.map((t) => {
              const isCompleted = t.status === "completed";
              const isOverdue = t.due_date && t.due_date < todayStr && !isCompleted;
              const priorityCfg = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.normal;
              const linkedDeal = deals.find((d) => d.id === t.deal_id);
              const linkedContact = contacts.find((c) => c.id === t.contact_id);

              return (
                <div
                  key={t.id}
                  className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between transition hover:bg-muted/30 ${
                    isCompleted ? "opacity-60 bg-muted/10" : ""
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <button
                      onClick={() =>
                        toggleStatusMutation.mutate({
                          id: t.id,
                          newStatus: isCompleted ? "open" : "completed",
                        })
                      }
                      className="mt-0.5 text-muted-foreground hover:text-primary transition"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>
                    <div>
                      <div
                        className={`text-sm font-semibold text-foreground ${
                          isCompleted ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {t.title}
                      </div>
                      {t.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {t.due_date && (
                          <span
                            className={`inline-flex items-center gap-1 ${
                              isOverdue ? "font-bold text-destructive" : ""
                            }`}
                          >
                            <Calendar className="h-3 w-3" />
                            {isOverdue && <AlertCircle className="h-3 w-3" />}
                            {isOverdue ? "Overdue: " : "Due: "}
                            {formatDate(t.due_date)}
                          </span>
                        )}
                        {linkedDeal && (
                          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium">
                            Deal: {linkedDeal.title}
                          </span>
                        )}
                        {linkedContact && (
                          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium">
                            Contact: {linkedContact.first_name} {linkedContact.last_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pl-8 sm:pl-0">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${priorityCfg.bg} ${priorityCfg.color}`}
                    >
                      {priorityCfg.label}
                    </span>
                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <button
                          onClick={() => openEditModal(t)}
                          title="Edit Task"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canEdit && (
                        <button
                          onClick={() => setTaskToDelete(t)}
                          title="Delete Task"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-red-50 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Add Task"}</DialogTitle>
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
                Task Title *
              </label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Follow up with decision maker on contract terms"
                className="w-full rounded-xl border border-input bg-background p-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Check if legal review has any redlines on SLA..."
                className="w-full rounded-xl border border-input bg-background p-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-sm outline-none capitalize"
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2 text-sm outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Link to Deal
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
                  Link to Contact
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
                {editingTask ? "Save Changes" : "Create Task"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <DeleteConfirmationDialog
        open={taskToDelete !== null}
        onOpenChange={(open) => !open && setTaskToDelete(null)}
        itemLabel="task"
        description={
          taskToDelete
            ? `This will permanently delete ${taskToDelete.title} and its action item record. This action cannot be undone.`
            : undefined
        }
        isPending={deleteMutation.isPending}
        error={deleteMutation.error}
        onConfirm={() => taskToDelete && deleteMutation.mutate(taskToDelete.id)}
      />
    </div>
  );
}
