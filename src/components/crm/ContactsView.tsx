import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  Plus,
  Search,
  Download,
  Upload,
  Trash2,
  Edit2,
  Mail,
  Phone,
  Sparkles,
  Loader2,
  User,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { STAGE_CONFIG, formatDate, logAuditEvent, type CrmStage } from "@/lib/crm-helpers";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";

type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];

type ContactsViewProps = {
  orgId: string;
  userId: string;
  canEdit: boolean;
  onOpenAICopilotForContact: (contact: { name: string; email?: string | null }) => void;
};

export function ContactsView({
  orgId,
  userId,
  canEdit,
  onOpenAICopilotForContact,
}: ContactsViewProps) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactRow | null>(null);
  const [contactToDelete, setContactToDelete] = useState<ContactRow | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importCsvText, setImportCsvText] = useState("");

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("Website");
  const [stage, setStage] = useState<CrmStage>("lead");

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!firstName.trim() || !lastName.trim()) {
        throw new Error("First and last name are required");
      }
      if (editingContact) {
        const { error } = await supabase
          .from("contacts")
          .update({
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: email.trim() || null,
            phone: phone.trim() || null,
            title: title.trim() || null,
            source: source.trim() || null,
            stage,
          })
          .eq("id", editingContact.id);
        if (error) throw error;
        await logAuditEvent({
          organizationId: orgId,
          actorId: userId,
          action: "update_contact",
          entityType: "contact",
          entityId: editingContact.id,
          afterData: { first_name: firstName, last_name: lastName, email, stage },
        });
      } else {
        const { data, error } = await supabase
          .from("contacts")
          .insert({
            organization_id: orgId,
            owner_id: userId,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: email.trim() || null,
            phone: phone.trim() || null,
            title: title.trim() || null,
            source: source.trim() || null,
            stage,
          })
          .select()
          .single();
        if (error) throw error;
        await logAuditEvent({
          organizationId: orgId,
          actorId: userId,
          action: "create_contact",
          entityType: "contact",
          entityId: data.id,
          afterData: { first_name: firstName, last_name: lastName, email, stage },
        });
      }
    },
    onSuccess: () => {
      toast.success(editingContact ? "Contact updated" : "Contact created");
      closeModal();
      qc.invalidateQueries({ queryKey: ["contacts", orgId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to save contact");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
      await logAuditEvent({
        organizationId: orgId,
        actorId: userId,
        action: "delete_contact",
        entityType: "contact",
        entityId: id,
      });
    },
    onSuccess: () => {
      toast.success("Contact deleted");
      setContactToDelete(null);
      qc.invalidateQueries({ queryKey: ["contacts", orgId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete contact");
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const lines = importCsvText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length === 0) throw new Error("Please provide CSV content");

      const rowsToInsert = lines.map((line) => {
        const parts = line.split(",").map((p) => p.trim());
        return {
          organization_id: orgId,
          owner_id: userId,
          first_name: parts[0] || "Unknown",
          last_name: parts[1] || "Contact",
          email: parts[2] || null,
          phone: parts[3] || null,
          title: parts[4] || null,
          source: parts[5] || "CSV Import",
          stage: (parts[6] as CrmStage) || "lead",
        };
      });

      const { error } = await supabase.from("contacts").insert(rowsToInsert);
      if (error) throw error;
      await logAuditEvent({
        organizationId: orgId,
        actorId: userId,
        action: "import_contacts_csv",
        entityType: "contact",
        afterData: { count: rowsToInsert.length },
      });
    },
    onSuccess: () => {
      toast.success("Contacts imported successfully");
      setIsImportModalOpen(false);
      setImportCsvText("");
      qc.invalidateQueries({ queryKey: ["contacts", orgId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to import contacts");
    },
  });

  function openCreateModal() {
    setEditingContact(null);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setTitle("");
    setSource("Website");
    setStage("lead");
    setIsModalOpen(true);
  }

  function openEditModal(c: ContactRow) {
    setEditingContact(c);
    setFirstName(c.first_name);
    setLastName(c.last_name);
    setEmail(c.email || "");
    setPhone(c.phone || "");
    setTitle(c.title || "");
    setSource(c.source || "Website");
    setStage(c.stage);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingContact(null);
  }

  function handleExportCsv() {
    if (contacts.length === 0) {
      toast.error("No contacts to export");
      return;
    }
    const headers = "First Name,Last Name,Email,Phone,Title,Source,Stage,Created At";
    const rows = contacts.map((c) =>
      [
        `"${c.first_name}"`,
        `"${c.last_name}"`,
        `"${c.email || ""}"`,
        `"${c.phone || ""}"`,
        `"${c.title || ""}"`,
        `"${c.source || ""}"`,
        `"${c.stage}"`,
        `"${c.created_at}"`,
      ].join(","),
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `contacts-${orgId.slice(0, 6)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Contacts CSV downloaded");
  }

  const filteredContacts = contacts.filter((c) => {
    const query = search.toLowerCase();
    const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
    const matchesSearch =
      fullName.includes(query) ||
      (c.email && c.email.toLowerCase().includes(query)) ||
      (c.phone && c.phone.includes(query)) ||
      (c.title && c.title.toLowerCase().includes(query));
    const matchesStage = selectedStage === "all" || c.stage === selectedStage;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Contacts</h2>
          <p className="text-sm text-muted-foreground">
            Manage your customer accounts, leads, and decision makers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-foreground shadow-xs hover:bg-muted"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
          {canEdit && (
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-foreground shadow-xs hover:bg-muted"
            >
              <Upload className="h-3.5 w-3.5" /> Import CSV
            </button>
          )}
          {canEdit && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-elevated hover:opacity-95"
            >
              <Plus className="h-4 w-4" /> Add Contact
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search contacts by name, email, title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-input bg-background pl-9 pr-4 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm capitalize outline-none"
          >
            <option value="all">All Stages ({contacts.length})</option>
            <option value="lead">Lead</option>
            <option value="qualified">Qualified</option>
            <option value="proposal">Proposal</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
            <p className="mt-2">Loading contacts...</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-12 text-center">
            <User className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 font-semibold text-foreground">No contacts found</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {search || selectedStage !== "all"
                ? "Try clearing your filters or search terms."
                : "Get started by adding your first contact."}
            </p>
            {canEdit && (
              <button
                onClick={openCreateModal}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white shadow-elevated"
              >
                <Plus className="h-3.5 w-3.5" /> Add Contact
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3.5">Name / Title</th>
                <th className="px-5 py-3.5">Contact Info</th>
                <th className="px-5 py-3.5">Stage</th>
                <th className="px-5 py-3.5">Source</th>
                <th className="px-5 py-3.5">Added</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredContacts.map((c) => {
                const stageStyle = STAGE_CONFIG[c.stage];
                const fullName = `${c.first_name} ${c.last_name}`;
                return (
                  <tr key={c.id} className="transition hover:bg-muted/30">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-foreground">{fullName}</div>
                      <div className="text-xs text-muted-foreground">{c.title || "No title"}</div>
                    </td>
                    <td className="px-5 py-4">
                      {c.email && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <a href={`mailto:${c.email}`} className="hover:text-primary">
                            {c.email}
                          </a>
                        </div>
                      )}
                      {c.phone && (
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <a href={`tel:${c.phone}`} className="hover:text-primary">
                            {c.phone}
                          </a>
                        </div>
                      )}
                      {!c.email && !c.phone && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${stageStyle.border} ${stageStyle.bg} ${stageStyle.color}`}
                      >
                        {stageStyle.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">{c.source || "—"}</td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {formatDate(c.created_at)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() =>
                            onOpenAICopilotForContact({ name: fullName, email: c.email })
                          }
                          title="Draft AI Email"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-primary/20 text-primary hover:bg-accent"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => openEditModal(c)}
                            title="Edit Contact"
                            className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => setContactToDelete(c)}
                            title="Delete Contact"
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
        )}
      </div>

      {/* Create / Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingContact ? "Edit Contact" : "Create New Contact"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="space-y-4 pt-2"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  First Name *
                </label>
                <input
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Sarah"
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Last Name *
                </label>
                <input
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Jenkins"
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sarah@company.com"
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Job Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VP of Engineering"
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Lead Source
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-sm outline-none"
                >
                  <option value="Website">Website</option>
                  <option value="Referral">Referral</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Cold Outreach">Cold Outreach</option>
                  <option value="Event">Event / Conference</option>
                </select>
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
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
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
                {editingContact ? "Save Changes" : "Create Contact"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* CSV Import Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Contacts via CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Paste lines formatted as: <br />
              <code className="rounded bg-muted px-1.5 py-0.5 text-foreground font-mono">
                FirstName, LastName, Email, Phone, Title, Source, Stage
              </code>
            </p>
            <textarea
              rows={6}
              value={importCsvText}
              onChange={(e) => setImportCsvText(e.target.value)}
              placeholder="John, Doe, john@acme.com, +123456789, CTO, Website, lead&#10;Jane, Smith, jane@corp.io, +987654321, CEO, Referral, qualified"
              className="w-full rounded-xl border border-input bg-background p-3 font-mono text-xs outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => importMutation.mutate()}
                disabled={importMutation.isPending || !importCsvText.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-elevated hover:opacity-95 disabled:opacity-60"
              >
                {importMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Import Contacts
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <DeleteConfirmationDialog
        open={contactToDelete !== null}
        onOpenChange={(open) => !open && setContactToDelete(null)}
        itemLabel="contact"
        description={
          contactToDelete
            ? `This will permanently delete ${contactToDelete.first_name} ${contactToDelete.last_name} and their CRM record. This action cannot be undone.`
            : undefined
        }
        isPending={deleteMutation.isPending}
        error={deleteMutation.error}
        onConfirm={() => contactToDelete && deleteMutation.mutate(contactToDelete.id)}
      />
    </div>
  );
}
