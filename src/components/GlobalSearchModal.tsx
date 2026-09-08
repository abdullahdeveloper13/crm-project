import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  Users,
  Building2,
  DollarSign,
  CheckSquare,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/crm-helpers";

type GlobalSearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  onSelectResult: (tab: string) => void;
};

export function GlobalSearchModal({
  isOpen,
  onClose,
  orgId,
  onSelectResult,
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: ["contacts-search", orgId, query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const { data } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, email, title, stage")
        .eq("organization_id", orgId)
        .ilike("first_name", `%${query}%`)
        .limit(5);
      return data || [];
    },
    enabled: isOpen && query.trim().length > 0,
  });

  const { data: companies = [], isLoading: loadingCompanies } = useQuery({
    queryKey: ["companies-search", orgId, query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const { data } = await supabase
        .from("companies")
        .select("id, name, industry, domain")
        .eq("organization_id", orgId)
        .ilike("name", `%${query}%`)
        .limit(5);
      return data || [];
    },
    enabled: isOpen && query.trim().length > 0,
  });

  const { data: deals = [], isLoading: loadingDeals } = useQuery({
    queryKey: ["deals-search", orgId, query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const { data } = await supabase
        .from("deals")
        .select("id, title, value, stage")
        .eq("organization_id", orgId)
        .ilike("title", `%${query}%`)
        .limit(5);
      return data || [];
    },
    enabled: isOpen && query.trim().length > 0,
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["tasks-search", orgId, query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const { data } = await supabase
        .from("tasks")
        .select("id, title, priority, status")
        .eq("organization_id", orgId)
        .ilike("title", `%${query}%`)
        .limit(5);
      return data || [];
    },
    enabled: isOpen && query.trim().length > 0,
  });

  const isLoading = loadingContacts || loadingCompanies || loadingDeals || loadingTasks;
  const hasResults =
    contacts.length > 0 || companies.length > 0 || deals.length > 0 || tasks.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl p-0 overflow-hidden">
        <div className="flex items-center border-b border-border px-4">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            autoFocus
            type="text"
            placeholder="Search contacts, companies, deals, or tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent px-3 py-4 text-sm outline-none placeholder:text-muted-foreground"
          />
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {!query.trim() ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Type anything to search across this workspace.
            </div>
          ) : !isLoading && !hasResults ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No results found for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            <>
              {/* Deals */}
              {deals.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    <DollarSign className="h-3.5 w-3.5" /> Deals ({deals.length})
                  </div>
                  <div className="space-y-1">
                    {deals.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => {
                          onSelectResult("pipeline");
                          onClose();
                        }}
                        className="flex w-full items-center justify-between rounded-xl p-2 text-left text-sm hover:bg-muted transition"
                      >
                        <div>
                          <div className="font-semibold text-foreground">{d.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(d.value)} · Stage: {d.stage}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Contacts */}
              {contacts.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    <Users className="h-3.5 w-3.5" /> Contacts ({contacts.length})
                  </div>
                  <div className="space-y-1">
                    {contacts.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          onSelectResult("contacts");
                          onClose();
                        }}
                        className="flex w-full items-center justify-between rounded-xl p-2 text-left text-sm hover:bg-muted transition"
                      >
                        <div>
                          <div className="font-semibold text-foreground">
                            {c.first_name} {c.last_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {c.email || c.title || c.stage}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Companies */}
              {companies.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    <Building2 className="h-3.5 w-3.5" /> Companies ({companies.length})
                  </div>
                  <div className="space-y-1">
                    {companies.map((comp) => (
                      <button
                        key={comp.id}
                        onClick={() => {
                          onSelectResult("companies");
                          onClose();
                        }}
                        className="flex w-full items-center justify-between rounded-xl p-2 text-left text-sm hover:bg-muted transition"
                      >
                        <div>
                          <div className="font-semibold text-foreground">{comp.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {comp.domain || comp.industry || "Company"}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks */}
              {tasks.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    <CheckSquare className="h-3.5 w-3.5" /> Tasks ({tasks.length})
                  </div>
                  <div className="space-y-1">
                    {tasks.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          onSelectResult("tasks");
                          onClose();
                        }}
                        className="flex w-full items-center justify-between rounded-xl p-2 text-left text-sm hover:bg-muted transition"
                      >
                        <div>
                          <div className="font-semibold text-foreground">{t.title}</div>
                          <div className="text-xs text-muted-foreground">
                            Priority: {t.priority} · Status: {t.status}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
