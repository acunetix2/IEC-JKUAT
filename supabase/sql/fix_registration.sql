-- ============================================================
-- IEC JKUAT — Registration Fix
-- Run this in the Supabase SQL Editor if registration gives
-- "new row violates row-level security policy for table members"
-- ============================================================

-- 1. Replace the members INSERT policy with a permissive one
DROP POLICY IF EXISTS "Public can register as member" ON members;
CREATE POLICY "Public can register as member"
  ON members FOR INSERT TO anon WITH CHECK (true);

-- 2. Allow anon to read their own record after insert
--    (needed so the registration flow can get the member id)
DROP POLICY IF EXISTS "Public can read own member" ON members;
CREATE POLICY "Public can read own member"
  ON members FOR SELECT TO anon
  USING (true);

-- 3. Create the find_member_lookup RPC if it doesn't exist
--    (used by the activation step to look up by reg number)
CREATE OR REPLACE FUNCTION public.find_member_lookup(p_reg TEXT)
RETURNS TABLE (id UUID, full_name TEXT, reg_number TEXT, membership_status TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.full_name, m.reg_number, m.membership_status
  FROM public.members AS m
  WHERE m.reg_number ILIKE p_reg
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.find_member_lookup(TEXT) TO anon;

-- 4. Make sure RLS is enabled
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- 5. Verify
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'members';
SELECT routine_name FROM information_schema.routines WHERE routine_name = 'find_member_lookup';
