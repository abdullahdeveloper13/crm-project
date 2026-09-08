import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  Plus,
  Search,
  Building2,
  Globe,
  Trash2,
  Edit2,
  DollarSign,
  Loader2,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate, logAuditEvent } from "@/lib/crm-helpers";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];

type CompaniesViewProps = {
  orgId: string;
  userId: string;
  canEdit: boolean;
};

export function CompaniesView({ orgId, userId, canEdit }: CompaniesViewProps) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyRow | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [industry, setIndustry] = useState("Software & Tech");
  const [size, setSize] = useState("11-50");
  const [revenue, setRevenue] = useState<string>("");

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Company name is required");
      const numRevenue = revenue ? parseFloat(revenue.replace(/[^0-9.]/g, "")) : null;

      if (editingCompany) {
        const { error } = await supabase
          .from("companies")
          .update({
            name: name.trim(),
            domain: domain.trim() || null,
            industry: industry.trim() || null,
            size: size.trim() || null,
            revenue: numRevenue,
          })
          .eq("id", editingCompany.id);
        if (error) throw error;
        await logAuditEvent({
          organizationId: orgId,
          actorId: userId,
          action: "update_company",
          entityType: "company",
          entityId: editingCompany.id,
          afterData: { name, domain, industry, size, revenue: numRevenue },
        });
      } else {
        const { data, error } = await supabase
          .from("companies")
          .insert({
            organization_id: orgId,
            owner_id: userId,
            name: name.trim(),
            domain: domain.trim() || null,
            industry: industry.trim() || null,
            size: size.trim() || null,
            revenue: numRevenue,
          })
          .select()
          .single();
        if (error) throw error;
        await logAuditEvent({
          organizationId: orgId,
          actorId: userId,
          action: "create_company",
          entityType: "company",
          entityId: data.id,
          afterData: { name, domain, industry, size, revenue: numRevenue },
        });
      }
    },
    onSuccess: () => {
      toast.success(editingCompany ? "Company updated" : "Company created");
      closeModal();
      qc.invalidateQueries({ queryKey: ["companies", orgId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to save company");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
      await logAuditEvent({
        organizationId: orgId,
        actorId: userId,
        action: "delete_company",
        entityType: "company",
        entityId: id,
      });
    },
    onSuccess: () => {
      toast.success("Company deleted");
      qc.invalidateQueries({ queryKey: ["companies", orgId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete company");
    },
  });

  function openCreateModal() {
    setEditingCompany(null);
    setName("");
    setDomain("");
    setIndustry("Software & Tech");
    setSize("11-50");
    setRevenue("");
    setIsModalOpen(true);
  }

  function openEditModal(comp: CompanyRow) {
    setEditingCompany(comp);
    setName(comp.name);
    setDomain(comp.domain || "");
    setIndustry(comp.industry || "Software & Tech");
    setSize(comp.size || "11-50");
    setRevenue(comp.revenue != null ? String(comp.revenue) : "");
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingCompany(null);
  }

  const filteredCompanies = companies.filter((c) => {
    const query = search.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(query) ||
      (c.domain && c.domain.toLowerCase().includes(query)) ||
      (c.industry && c.industry.toLowerCase().includes(query));
    const matchesIndustry = selectedIndustry === "all" || c.industry === selectedIndustry;
    return matchesSearch && matchesIndustry;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Companies</h2>
          <p className="text-sm text-muted-foreground">
            Directory of client organizations, partner accounts, and target enterprises.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-elevated hover:opacity-95"
          >
            <Plus className="h-4 w-4" /> Add Company
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search companies by name, domain, industry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-input bg-background pl-9 pr-4 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none"
          >
            <option value="all">All Industries ({companies.length})</option>
            <option value="Software & Tech">Software & Tech</option>
            <option value="Financial Services">Financial Services</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Retail & E-commerce">Retail & E-commerce</option>
            <option value="Manufacturing">Manufacturing</option>
            <option value="Consulting">Consulting</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
            <p className="mt-2">Loading companies...</p>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 font-semibold text-foreground">No companies found</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {search || selectedIndustry !== "all"
                ? "Try clearing your filters or search terms."
                : "Add your first company account to begin."}
            </p>
            {canEdit && (
              <button
                onClick={openCreateModal}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white shadow-elevated"
              >
                <Plus className="h-3.5 w-3.5" /> Add Company
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3.5">Company Name</th>
                <th className="px-5 py-3.5">Website / Domain</th>
                <th className="px-5 py-3.5">Industry</th>
                <th className="px-5 py-3.5">Company Size</th>
                <th className="px-5 py-3.5">Est. Revenue</th>
                <th className="px-5 py-3.5">Created</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCompanies.map((c) => {
                const domainFormatted = c.domain
                  ? c.domain.startsWith("http")
                    ? c.domain
                    : `https://${c.domain}`
                  : null;
                return (
                  <tr key={c.id} className="transition hover:bg-muted/30">
                    <td className="px-5 py-4 font-semibold text-foreground">
                      <div className="flex items-center gap-2.5">
                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-800">
                          <Building2 className="h-4 w-4" />
                        </div>
                        {c.name}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {domainFormatted ? (
                        <a
                          href={domainFormatted}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Globe className="h-3.5 w-3.5" />
                          {c.domain}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-foreground">
                      {c.industry || "General"}
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {c.size ? `${c.size} employees` : "—"}
                    </td>
                    <td className="px-5 py-4 font-medium text-foreground">
                      {c.revenue ? formatCurrency(c.revenue) : "—"}
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {formatDate(c.created_at)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canEdit && (
                          <button
                            onClick={() => openEditModal(c)}
                            title="Edit Company"
                            className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete ${c.name}?`)) {
                                deleteMutation.mutate(c.id);
                              }
                            }}
                            title="Delete Company"
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCompany ? "Edit Company" : "Add New Company"}</DialogTitle>
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
                Company Name *
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Stripe, Inc."
                className="w-full rounded-xl border border-input bg-background p-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Website / Domain
              </label>
              <input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="stripe.com"
                className="w-full rounded-xl border border-input bg-background p-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Industry</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-sm outline-none"
                >
                  <option value="Software & Tech">Software & Tech</option>
                  <option value="Financial Services">Financial Services</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Retail & E-commerce">Retail & E-commerce</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Consulting">Consulting</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Company Size
                </label>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-sm outline-none"
                >
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-1000">201-1000 employees</option>
                  <option value="1000+">1000+ employees</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Annual Revenue (USD)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="number"
                  value={revenue}
                  onChange={(e) => setRevenue(e.target.value)}
                  placeholder="2500000"
                  className="w-full rounded-xl border border-input bg-background pl-9 pr-4 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
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
                {editingCompany ? "Save Changes" : "Create Company"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
