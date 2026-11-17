CREATE OR REPLACE FUNCTION public.bootstrap_first_admin(
  p_user_id UUID,
  p_email TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('iec-bootstrap-first-admin')::BIGINT);

  IF (SELECT count(*) FROM public.admins) >= 3 THEN
    RAISE EXCEPTION 'Initial administrator setup limit reached.';
  END IF;

  INSERT INTO public.admins (user_id, email, role)
  VALUES (p_user_id, lower(trim(p_email)), 'super_admin');
END
$$;

REVOKE ALL ON FUNCTION public.bootstrap_first_admin(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bootstrap_first_admin(UUID, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin(UUID, TEXT) TO service_role;
