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
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> owner_id THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  base_slug := regexp_replace(lower(trim(org_name)), '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' FROM base_slug);
  IF base_slug = '' THEN
    base_slug := 'organization';
  END IF;
  org_slug := base_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  INSERT INTO public.organizations (name, slug, created_by)
  VALUES (trim(org_name), org_slug, owner_id)
  RETURNING * INTO new_org;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org.id, owner_id, 'owner');

  RETURN new_org;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_organization(TEXT, UUID) TO authenticated;

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

DROP TRIGGER IF EXISTS on_organization_created ON public.organizations;
CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_organization_created();
