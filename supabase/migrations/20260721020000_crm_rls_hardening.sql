-- CRM Row Level Security Hardening, Triggers & Performance Indexes

-- Notifications policies
DROP POLICY IF EXISTS "Org members can create notifications" ON public.notifications;
CREATE POLICY "Org members can create notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id, auth.uid()));

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Audit logs policies
DROP POLICY IF EXISTS "Org members can insert audit logs" ON public.audit_logs;
CREATE POLICY "Org members can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id, auth.uid()));

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS trg_contacts_updated ON public.contacts;
CREATE TRIGGER trg_contacts_updated BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_companies_updated ON public.companies;
CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_deals_updated ON public.deals;
CREATE TRIGGER trg_deals_updated BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_tasks_updated ON public.tasks;
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Composite & Performance indexes
CREATE INDEX IF NOT EXISTS idx_contacts_org_stage ON public.contacts(organization_id, stage);
CREATE INDEX IF NOT EXISTS idx_deals_org_stage ON public.deals(organization_id, stage);
CREATE INDEX IF NOT EXISTS idx_tasks_org_status ON public.tasks(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_activities_org_created ON public.activities(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON public.audit_logs(organization_id, created_at DESC);
