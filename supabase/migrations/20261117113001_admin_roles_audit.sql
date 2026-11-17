-- Migration: admin role assignments and persistent audit history.
-- Apply after migration_production_hardening.sql.

ALTER TABLE public.admins
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'super_admin';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'admins_role_check'
      AND conrelid = 'public.admins'::regclass
  ) THEN
    ALTER TABLE public.admins
      ADD CONSTRAINT admins_role_check
      CHECK (role IN (
        'chairperson',
        'vice_chairperson',
        'secretary_general',
        'treasurer',
        'vc_education',
        'vc_projects',
        'vc_membership',
        'super_admin',
        'owner',
        'manager',
        'editor'
      ));
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at
  ON public.admin_audit_logs (created_at DESC);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_audit_logs FROM anon, authenticated;
GRANT SELECT, INSERT ON public.admin_audit_logs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.admin_audit_logs_id_seq TO service_role;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admins
    WHERE user_id = auth.uid()
      AND role IN (
        'chairperson',
        'vice_chairperson',
        'secretary_general',
        'treasurer',
        'vc_education',
        'vc_projects',
        'vc_membership',
        'super_admin',
        'owner',
        'manager',
        'editor'
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.update_admin_role_and_audit(
  p_actor_user_id UUID,
  p_actor_email TEXT,
  p_target_user_id UUID,
  p_target_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_email TEXT;
  previous_role TEXT;
  target_created_at TIMESTAMPTZ;
  owner_count INTEGER;
BEGIN
  IF p_target_role IS NULL OR p_target_role NOT IN (
    'chairperson',
    'vice_chairperson',
    'secretary_general',
    'treasurer',
    'vc_education',
    'vc_projects',
    'vc_membership',
    'super_admin',
    'owner',
    'manager',
    'editor'
  ) THEN
    RAISE EXCEPTION 'Choose a valid administrator role.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('iec-admin-role-change')::BIGINT);

  IF NOT EXISTS (
    SELECT 1 FROM public.admins
    WHERE user_id = p_actor_user_id AND role IN ('super_admin', 'owner')
  ) THEN
    RAISE EXCEPTION 'Only a Super Admin can change administrator roles.';
  END IF;

  SELECT email, role, created_at
  INTO target_email, previous_role, target_created_at
  FROM public.admins
  WHERE user_id = p_target_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Administrator account not found.';
  END IF;

  IF p_actor_user_id = p_target_user_id AND p_target_role <> 'super_admin' AND p_target_role <> 'owner' THEN
    RAISE EXCEPTION 'You cannot remove your own Super Admin role.';
  END IF;

  IF previous_role IN ('super_admin', 'owner') AND p_target_role NOT IN ('super_admin', 'owner') THEN
    SELECT COUNT(*) INTO owner_count
    FROM public.admins
    WHERE role IN ('super_admin', 'owner');

    IF owner_count <= 1 THEN
      RAISE EXCEPTION 'At least one Super Admin must remain.';
    END IF;
  END IF;

  IF previous_role <> p_target_role THEN
    UPDATE public.admins
    SET role = p_target_role
    WHERE user_id = p_target_user_id;

    INSERT INTO public.admin_audit_logs (
      actor_user_id, actor_email, action, resource_type, resource_id, details
    ) VALUES (
      p_actor_user_id, p_actor_email, 'update-admin-role', 'admin',
      p_target_user_id::TEXT,
      jsonb_build_object('previous_role', previous_role, 'new_role', p_target_role)
    );
  END IF;

  RETURN jsonb_build_object(
    'user_id', p_target_user_id,
    'email', target_email,
    'role', p_target_role,
    'created_at', target_created_at
  );
END
$$;

REVOKE ALL ON FUNCTION public.update_admin_role_and_audit(UUID, TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_admin_role_and_audit(UUID, TEXT, UUID, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_admin_role_and_audit(UUID, TEXT, UUID, TEXT) TO service_role;
