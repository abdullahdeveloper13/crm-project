-- Atomic organization creation and invitation acceptance.
-- Fixes INSERT ... RETURNING failing SELECT RLS because is_org_member() is STABLE
-- and cannot see the membership row inserted by an AFTER INSERT trigger in the same statement.

CREATE OR REPLACE FUNCTION public.is_org_member(_org UUID, _user UUID)
RETURNS BOOLEAN
LANGUAGE SQL
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org AND user_id = _user
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_organization_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner')
  ON CONFLICT (organization_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_organization(org_name TEXT, owner_id UUID)
RETURNS public.organizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org public.organizations;
  base_slug TEXT;
  org_slug TEXT;
  trimmed_name TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to create an organization';
  END IF;

  IF owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  trimmed_name := trim(org_name);
  IF trimmed_name IS NULL OR length(trimmed_name) < 2 THEN
    RAISE EXCEPTION 'Organization name must be at least 2 characters';
  END IF;
  IF length(trimmed_name) > 80 THEN
    RAISE EXCEPTION 'Organization name is too long';
  END IF;

  base_slug := regexp_replace(lower(trimmed_name), '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' FROM base_slug);
  IF base_slug = '' THEN
    base_slug := 'organization';
  END IF;
  org_slug := left(base_slug, 40) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  INSERT INTO public.organizations (name, slug, created_by)
  VALUES (trimmed_name, org_slug, auth.uid())
  RETURNING * INTO new_org;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org.id, auth.uid(), 'owner')
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  RETURN new_org;
END;
$$;

REVOKE ALL ON FUNCTION public.create_organization(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_organization(TEXT, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_invitation(invite_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.invitations;
  user_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to accept an invitation';
  END IF;

  IF invite_token IS NULL OR length(trim(invite_token)) = 0 THEN
    RAISE EXCEPTION 'Missing invitation token';
  END IF;

  SELECT * INTO inv
  FROM public.invitations
  WHERE token = trim(invite_token)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or already used';
  END IF;

  IF inv.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'This invitation is no longer valid';
  END IF;

  IF inv.expires_at < now() THEN
    UPDATE public.invitations SET status = 'expired' WHERE id = inv.id AND status = 'pending';
    RAISE EXCEPTION 'This invitation has expired';
  END IF;

  user_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  IF user_email = '' OR lower(inv.email) <> user_email THEN
    RAISE EXCEPTION 'This invitation was sent to a different email address';
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (inv.organization_id, auth.uid(), inv.role)
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  UPDATE public.invitations
  SET status = 'accepted'
  WHERE id = inv.id;

  RETURN inv.organization_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_invitation(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_invitation(TEXT) TO authenticated;
