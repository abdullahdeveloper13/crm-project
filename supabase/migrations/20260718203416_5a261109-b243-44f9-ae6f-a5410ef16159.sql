-- Roles enum
CREATE TYPE public.app_role AS ENUM ('owner','admin','manager','sales','support','employee','viewer');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Organizations
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Organization members
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.organization_members(user_id);
CREATE INDEX ON public.organization_members(organization_id);

-- Security-definer helpers (avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.is_org_member(_org UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = _org AND user_id = _user)
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(_org UUID, _user UUID, _roles public.app_role[])
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org AND user_id = _user AND role = ANY(_roles)
  )
$$;

-- Organizations policies
CREATE POLICY "Members can view their orgs" ON public.organizations
  FOR SELECT TO authenticated USING (public.is_org_member(id, auth.uid()));
CREATE POLICY "Any authenticated can create org" ON public.organizations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owners/Admins can update org" ON public.organizations
  FOR UPDATE TO authenticated USING (public.has_org_role(id, auth.uid(), ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY "Owners can delete org" ON public.organizations
  FOR DELETE TO authenticated USING (public.has_org_role(id, auth.uid(), ARRAY['owner']::public.app_role[]));

-- Members policies
CREATE POLICY "Members can view org members" ON public.organization_members
  FOR SELECT TO authenticated USING (public.is_org_member(organization_id, auth.uid()));
CREATE POLICY "Owner/Admin can add members" ON public.organization_members
  FOR INSERT TO authenticated WITH CHECK (
    public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.app_role[])
    OR (auth.uid() = user_id AND role = 'owner' AND NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = organization_members.organization_id))
  );
CREATE POLICY "Owner/Admin can update members" ON public.organization_members
  FOR UPDATE TO authenticated USING (public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.app_role[]));
CREATE POLICY "Owner/Admin can remove members" ON public.organization_members
  FOR DELETE TO authenticated USING (
    public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.app_role[])
    OR user_id = auth.uid()
  );

-- Invitations
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'viewer',
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations TO authenticated;
GRANT ALL ON public.invitations TO service_role;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.invitations(organization_id);
CREATE INDEX ON public.invitations(email);

CREATE POLICY "Owner/Admin can view org invitations" ON public.invitations
  FOR SELECT TO authenticated USING (
    public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.app_role[])
  );
CREATE POLICY "Owner/Admin can create invitations" ON public.invitations
  FOR INSERT TO authenticated WITH CHECK (
    public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.app_role[])
    AND auth.uid() = invited_by
  );
CREATE POLICY "Owner/Admin can update invitations" ON public.invitations
  FOR UPDATE TO authenticated USING (
    public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.app_role[])
  );
CREATE POLICY "Owner/Admin can delete invitations" ON public.invitations
  FOR DELETE TO authenticated USING (
    public.has_org_role(organization_id, auth.uid(), ARRAY['owner','admin']::public.app_role[])
  );

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_orgs_updated BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();