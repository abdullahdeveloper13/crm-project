import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  Plus,
  DollarSign,
  Calendar,
  Building2,
  User,
  Sparkles,
  Trash2,
  Edit2,
  Loader2,
  ChevronRight,
  ChevronLeft,
  LayoutGrid,
  List,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatCurrency,
  formatDate,
  STAGE_CONFIG,
  logAuditEvent,
  type CrmStage,
} from "@/lib/crm-helpers";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";

type DealRow = Database["public"]["Tables"]["deals"]["Row"];

type DealsPipelineViewProps = {
  orgId: string;
  userId: string;
  canEdit: boolean;
  onOpenAICopilotForDeal: (deal: { title: string; value: number; stage: string }) => void;
};

const STAGES: CrmStage[] = ["lead", "qualified", "proposal", "won", "lost"];

export function DealsPipelineView({
  orgId,
  userId,
  canEdit,
  onOpenAICopilotForDeal,
}: DealsPipelineViewProps) {
  const qc = useQueryClient();
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<DealRow | null>(null);
  const [dealToDelete, setDealToDelete] = useState<DealRow | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [stage, setStage] = useState<CrmStage>("lead");
  const [probability, setProbability] = useState<number>(50);
  const [companyId, setCompanyId] = useState<string>("");
  const [contactId, setContactId] = useState<string>("");
  const [expectedCloseDate, setExpectedCloseDate] = useState<string>("");

  const { data: deals = [], isLoading } = useQuery({
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

  const { data: companies = [] } = useQuery({
    queryKey: ["companies", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
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
      if (!title.trim()) throw new Error("Deal title is required");
      const numValue = value ? parseFloat(value.replace(/[^0-9.]/g, "")) : 0;

      if (editingDeal) {
        const { error } = await supabase
          .from("deals")
          .update({
            title: title.trim(),
            value: numValue,
            stage,
            probability,
            company_id: companyId || null,
            contact_id: contactId || null,
            expected_close_date: expectedCloseDate || null,
            closed_at: stage === "won" || stage === "lost" ? new Date().toISOString() : null,
          })
          .eq("id", editingDeal.id);
        if (error) throw error;
        await logAuditEvent({
          organizationId: orgId,
          actorId: userId,
          action: "update_deal",
          entityType: "deal",
          entityId: editingDeal.id,
          afterData: { title, value: numValue, stage, probability },
        });
      } else {
        const { data, error } = await supabase
          .from("deals")
          .insert({
            organization_id: orgId,
            owner_id: userId,
            title: title.trim(),
            value: numValue,
            stage,
            probability,
            company_id: companyId || null,
            contact_id: contactId || null,
            expected_close_date: expectedCloseDate || null,
            closed_at: stage === "won" || stage === "lost" ? new Date().toISOString() : null,
          })
          .select()
          .single();
        if (error) throw error;
        await logAuditEvent({
          organizationId: orgId,
          actorId: userId,
          action: "create_deal",
          entityType: "deal",
          entityId: data.id,
          afterData: { title, value: numValue, stage, probability },
        });
      }
    },
    onSuccess: () => {
      toast.success(editingDeal ? "Deal updated" : "Deal created");
      closeModal();
      qc.invalidateQueries({ queryKey: ["deals", orgId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to save deal");
    },
  });

  const moveStageMutation = useMutation({
    mutationFn: async ({ id, newStage }: { id: string; newStage: CrmStage }) => {
      const { error } = await supabase
        .from("deals")
        .update({
          stage: newStage,
          closed_at: newStage === "won" || newStage === "lost" ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
      await logAuditEvent({
        organizationId: orgId,
        actorId: userId,
        action: "move_deal_stage",
        entityType: "deal",
        entityId: id,
        afterData: { newStage },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals", orgId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update stage");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deals").delete().eq("id", id);
      if (error) throw error;
      await logAuditEvent({
        organizationId: orgId,
        actorId: userId,
        action: "delete_deal",
        entityType: "deal",
        entityId: id,
      });
    },
    onSuccess: () => {
      toast.success("Deal deleted");
      setDealToDelete(null);
      qc.invalidateQueries({ queryKey: ["deals", orgId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete deal");
    },
  });

  function openCreateModal(defaultStage?: CrmStage) {
    setEditingDeal(null);
    setTitle("");
    setValue("");
    setStage(defaultStage || "lead");
    setProbability(defaultStage === "won" ? 100 : defaultStage === "proposal" ? 75 : 50);
    setCompanyId("");
    setContactId("");
    setExpectedCloseDate("");
    setIsModalOpen(true);
  }

  function openEditModal(d: DealRow) {
    setEditingDeal(d);
    setTitle(d.title);
    setValue(d.value ? String(d.value) : "");
    setStage(d.stage);
    setProbability(d.probability || 50);
    setCompanyId(d.company_id || "");
    setContactId(d.contact_id || "");
    setExpectedCloseDate(d.expected_close_date || "");
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingDeal(null);
  }

  const totalPipeline = deals
    .filter((d) => ["lead", "qualified", "proposal"].includes(d.stage))
    .reduce((acc, curr) => acc + Number(curr.value || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">Sales Pipeline</h2>
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-primary">
              Active: {formatCurrency(totalPipeline)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Track deal stages, progression probabilities, and close forecasts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-border bg-white p-1 shadow-xs">
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === "kanban"
                  ? "bg-brand text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Kanban
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === "list"
                  ? "bg-brand text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="h-3.5 w-3.5" /> List
            </button>
          </div>
          {canEdit && (
            <button
              onClick={() => openCreateModal()}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-elevated hover:opacity-95"
            >
              <Plus className="h-4 w-4" /> New Deal
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
          <p className="mt-2">Loading sales pipeline...</p>
        </div>
      ) : viewMode === "kanban" ? (
        /* Kanban View */
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 items-start">
          {STAGES.map((st, stageIdx) => {
            const config = STAGE_CONFIG[st];
            const stageDeals = deals.filter((d) => d.stage === st);
            const stageSum = stageDeals.reduce((acc, curr) => acc + Number(curr.value || 0), 0);

            return (
              <div
                key={st}
                className="flex flex-col rounded-2xl border border-border/80 bg-slate-50/70 p-3.5 shadow-xs"
              >
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${config.bg.replace("bg-", "bg-primary/80")}`}
                    />
                    <span className="font-semibold text-xs text-foreground uppercase tracking-wider">
                      {config.label}
                    </span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold shadow-xs text-muted-foreground">
                      {stageDeals.length}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-foreground">
                    {formatCurrency(stageSum)}
                  </span>
                </div>

                <div className="mt-3 space-y-3 min-h-[300px]">
                  {stageDeals.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-[11px] text-muted-foreground">
                      No deals in {config.label}
                    </div>
                  ) : (
                    stageDeals.map((d) => {
                      const linkedComp = companies.find((c) => c.id === d.company_id);
                      const linkedContact = contacts.find((c) => c.id === d.contact_id);

                      return (
                        <div
                          key={d.id}
                          className="rounded-xl border border-border bg-white p-4 shadow-sm transition hover:shadow-md"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-sm text-foreground">{d.title}</h4>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() =>
                                  onOpenAICopilotForDeal({
                                    title: d.title,
                                    value: d.value,
                                    stage: config.label,
                                  })
                                }
                                title="AI Deal Strategy"
                                className="grid h-6 w-6 place-items-center rounded-md text-primary hover:bg-accent"
                              >
                                <Sparkles className="h-3 w-3" />
                              </button>
                              {canEdit && (
                                <button
                                  onClick={() => openEditModal(d)}
                                  title="Edit Deal"
                                  className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:text-foreground"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="mt-2 text-base font-bold text-foreground">
                            {formatCurrency(d.value)}
                          </div>

                          {/* Metadata */}
                          <div className="mt-2.5 space-y-1 text-xs text-muted-foreground">
                            {linkedComp && (
                              <div className="flex items-center gap-1.5 truncate">
                                <Building2 className="h-3 w-3 shrink-0" />
                                <span className="truncate">{linkedComp.name}</span>
                              </div>
                            )}
                            {linkedContact && (
                              <div className="flex items-center gap-1.5 truncate">
                                <User className="h-3 w-3 shrink-0" />
                                <span className="truncate">
                                  {linkedContact.first_name} {linkedContact.last_name}
                                </span>
                              </div>
                            )}
                            {d.expected_close_date && (
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3 w-3 shrink-0" />
                                <span>Close: {formatDate(d.expected_close_date)}</span>
                              </div>
                            )}
                          </div>

                          {/* Probability bar */}
                          <div className="mt-3">
                            <div className="flex justify-between text-[10px] text-muted-foreground font-medium mb-1">
                              <span>Win Probability</span>
                              <span>{d.probability}%</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-brand rounded-full transition-all"
                                style={{ width: `${d.probability}%` }}
                              />
                            </div>
                          </div>

                          {/* Stage Mover Controls */}
                          {canEdit && (
                            <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/50 text-[11px]">
                              <button
                                disabled={stageIdx === 0}
                                onClick={() =>
                                  moveStageMutation.mutate({
                                    id: d.id,
                                    newStage: STAGES[stageIdx - 1],
                                  })
                                }
                                className="inline-flex items-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                              >
                                <ChevronLeft className="h-3.5 w-3.5" /> Back
                              </button>
                              <button
                                disabled={stageIdx === STAGES.length - 1}
                                onClick={() =>
                                  moveStageMutation.mutate({
                                    id: d.id,
                                    newStage: STAGES[stageIdx + 1],
                                  })
                                }
                                className="inline-flex items-center font-semibold text-primary hover:underline disabled:opacity-30"
                              >
                                Next <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {canEdit && (
                  <button
                    onClick={() => openCreateModal(st)}
                    className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-border/80 py-2 text-xs font-semibold text-muted-foreground hover:bg-white hover:text-foreground"
                  >
                    <Plus className="h-3 w-3" /> Add {config.label}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3.5">Deal Title</th>
                <th className="px-5 py-3.5">Value</th>
                <th className="px-5 py-3.5">Stage</th>
                <th className="px-5 py-3.5">Probability</th>
                <th className="px-5 py-3.5">Associated Account</th>
                <th className="px-5 py-3.5">Close Date</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {deals.map((d) => {
                const stageStyle = STAGE_CONFIG[d.stage];
                const linkedComp = companies.find((c) => c.id === d.company_id);
                return (
                  <tr key={d.id} className="transition hover:bg-muted/30">
                    <td className="px-5 py-4 font-semibold text-foreground">{d.title}</td>
                    <td className="px-5 py-4 font-bold text-foreground">
                      {formatCurrency(d.value)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${stageStyle.border} ${stageStyle.bg} ${stageStyle.color}`}
                      >
                        {stageStyle.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium">{d.probability}%</td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {linkedComp?.name || "—"}
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {formatDate(d.expected_close_date)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canEdit && (
                          <button
                            onClick={() => openEditModal(d)}
                            title="Edit Deal"
                            className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => setDealToDelete(d)}
                            title="Delete Deal"
                            className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-red-50 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Deal Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDeal ? "Edit Deal" : "Create New Deal"}</DialogTitle>
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
                Deal Title *
              </label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enterprise Software Expansion"
                className="w-full rounded-xl border border-input bg-background p-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Deal Value (USD) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="number"
                    required
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="50000"
                    className="w-full rounded-xl border border-input bg-background pl-9 pr-4 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Pipeline Stage
                </label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value as CrmStage)}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-sm outline-none capitalize"
                >
                  <option value="lead">Lead</option>
                  <option value="qualified">Qualified</option>
                  <option value="proposal">Proposal</option>
                  <option value="won">Closed Won</option>
                  <option value="lost">Closed Lost</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Associated Company
                </label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-sm outline-none"
                >
                  <option value="">None / Unassigned</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Primary Contact
                </label>
                <select
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-sm outline-none"
                >
                  <option value="">None / Unassigned</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Win Probability: {probability}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={probability}
                  onChange={(e) => setProbability(Number(e.target.value))}
                  className="w-full cursor-pointer accent-primary mt-2"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Expected Close Date
                </label>
                <input
                  type="date"
                  value={expectedCloseDate}
                  onChange={(e) => setExpectedCloseDate(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2 text-sm outline-none"
                />
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
                {editingDeal ? "Save Changes" : "Create Deal"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <DeleteConfirmationDialog
        open={dealToDelete !== null}
        onOpenChange={(open) => !open && setDealToDelete(null)}
        itemLabel="deal"
        description={
          dealToDelete
            ? `This will permanently delete ${dealToDelete.title} and its pipeline record. This action cannot be undone.`
            : undefined
        }
        isPending={deleteMutation.isPending}
        error={deleteMutation.error}
        onConfirm={() => dealToDelete && deleteMutation.mutate(dealToDelete.id)}
      />
    </div>
  );
}
