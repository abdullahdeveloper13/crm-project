-- CRM core
CREATE TYPE public.crm_stage AS ENUM ('lead', 'qualified', 'proposal', 'won', 'lost');
CREATE TYPE public.activity_kind AS ENUM ('call', 'email', 'meeting', 'note', 'task', 'system');
CREATE TYPE public.notification_channel AS ENUM ('in_app', 'email');
CREATE TYPE public.notification_status AS ENUM ('pending', 'sent', 'read');

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'starter';

CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  title TEXT,
  source TEXT,
  stage public.crm_stage NOT NULL DEFAULT 'lead',
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  domain TEXT,
  industry TEXT,
  size TEXT,
  revenue NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  stage public.crm_stage NOT NULL DEFAULT 'lead',
  probability INTEGER NOT NULL DEFAULT 0,
  expected_close_date DATE,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  kind public.activity_kind NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  due_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel public.notification_channel NOT NULL DEFAULT 'in_app',
  status public.notification_status NOT NULL DEFAULT 'pending',
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id),
  bucket TEXT NOT NULL DEFAULT 'crm-files',
  path TEXT NOT NULL,
  name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read contacts" ON public.contacts FOR SELECT TO authenticated USING (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "Org members can manage contacts" ON public.contacts FOR ALL TO authenticated USING (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','manager','sales','support']::public.app_role[])) WITH CHECK (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','manager','sales','support']::public.app_role[]));

CREATE POLICY "Org members can read companies" ON public.companies FOR SELECT TO authenticated USING (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "Org members can manage companies" ON public.companies FOR ALL TO authenticated USING (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','manager','sales']::public.app_role[])) WITH CHECK (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','manager','sales']::public.app_role[]));

CREATE POLICY "Org members can read deals" ON public.deals FOR SELECT TO authenticated USING (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "Org members can manage deals" ON public.deals FOR ALL TO authenticated USING (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','manager','sales']::public.app_role[])) WITH CHECK (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin','manager','sales']::public.app_role[]));

CREATE POLICY "Org members can read activities" ON public.activities FOR SELECT TO authenticated USING (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "Org members can manage activities" ON public.activities FOR ALL TO authenticated USING (public.is_org_member(organization_id, auth.uid())) WITH CHECK (public.is_org_member(organization_id, auth.uid()));

CREATE POLICY "Org members can read tasks" ON public.tasks FOR SELECT TO authenticated USING (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "Org members can manage tasks" ON public.tasks FOR ALL TO authenticated USING (public.is_org_member(organization_id, auth.uid())) WITH CHECK (public.is_org_member(organization_id, auth.uid()));

CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can manage own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Org members can read files" ON public.files FOR SELECT TO authenticated USING (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "Org members can manage files" ON public.files FOR ALL TO authenticated USING (public.is_org_member(organization_id, auth.uid())) WITH CHECK (public.is_org_member(organization_id, auth.uid()));

CREATE POLICY "Admins can read audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.app_role[]));

CREATE INDEX IF NOT EXISTS contacts_org_idx ON public.contacts(organization_id);
CREATE INDEX IF NOT EXISTS deals_org_idx ON public.deals(organization_id);
CREATE INDEX IF NOT EXISTS tasks_org_idx ON public.tasks(organization_id);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_org_idx ON public.audit_logs(organization_id);
