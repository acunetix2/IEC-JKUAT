-- ============================================================
-- IEC JKUAT — Production Hardening Migration
-- Run AFTER schema.sql in the Supabase SQL Editor.
-- Safe to re-run (all statements are idempotent).
--
-- WHAT IT DOES:
--  1. Creates an `admins` table (Supabase Auth users who may
--     administer the site).
--  2. Replaces every open anon WRITE/SELECT policy with
--     admin-only policies. Public forms keep working (INSERT-only
--     on exactly the columns they need, with length checks).
--  3. Adds UNIQUE constraints (reg_number, lipana_ref).
--  4. Adds length CHECKs to all public-writable text.
--  5. Adds auto-maintained updated_at triggers.
--  6. Locks storage buckets to admin writes (public read kept).
--
-- MANUAL STEPS (Supabase dashboard, cannot be done in SQL):
--  A. Authentication → Users → Invite/create the admin user(s).
--  B. Insert their auth user id(s):
--       INSERT INTO admins (user_id, email)
--       VALUES ('<auth-user-uuid>', 'admin@example.com');
--  C. The admin.html login screen uses email+password sign-in.
--  D. BEFORE running §4: dedupe members (query in §0 below).
-- ============================================================


-- ============================================================
-- §0. PRE-FLIGHT (run these SELECTs first, fix what they show)
-- ============================================================
-- Duplicate reg_numbers (must be 0 rows before §4):
--   SELECT reg_number, COUNT(*) FROM members
--   GROUP BY reg_number HAVING COUNT(*) > 1;
-- Duplicate emails (informational):
--   SELECT email, COUNT(*) FROM members
--   GROUP BY email HAVING COUNT(*) > 1;
-- Over-long public content (will violate §5 CHECKs):
--   SELECT id FROM contact_messages
--   WHERE char_length(message) > 2000 OR char_length(subject) > 200
--      OR char_length(name) > 120 OR char_length(email) > 254;


-- ============================================================
-- §1. ADMINS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS admins (
  user_id    UUID        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email      TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Helper: true when the caller is an admin. SECURITY DEFINER so it
-- works inside RLS checks regardless of the caller's grants.
-- Define this BEFORE any policy calls it. On a fresh project PostgreSQL
-- resolves policy expressions immediately; creating the policy first would
-- fail with "function public.is_admin() does not exist".
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  has_roles BOOLEAN;
  admin_result BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = 'public.admins'::regclass
      AND attname = 'role'
      AND NOT attisdropped
  ) INTO has_roles;

  IF has_roles THEN
    EXECUTE 'SELECT EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = $1 AND role IN (''owner'', ''manager'')
    )' INTO admin_result USING auth.uid();
  ELSE
    SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
      INTO admin_result;
  END IF;

  RETURN COALESCE(admin_result, FALSE);
END
$$;

-- Admins can see the admin list; nobody else can.
-- NOTE: must go through is_admin(), NOT a direct subquery on admins —
-- a self-referencing subquery recurses into this same policy forever
-- and Postgres rejects every check ("infinite recursion"), which
-- locks ALL admins out, including you.
DROP POLICY IF EXISTS "Admins can read admins" ON admins;
CREATE POLICY "Admins can read admins"
  ON admins FOR SELECT TO authenticated
  USING (public.is_admin());


-- ============================================================
-- §1b. IDEMPOTENCY PREAMBLE — drop everything this migration owns
-- so re-runs never hit "already exists" (42710) errors.
-- ============================================================
DROP POLICY IF EXISTS "Admins can read members"         ON members;
DROP POLICY IF EXISTS "Admins can update members"       ON members;
DROP POLICY IF EXISTS "Admins can delete members"       ON members;
DROP POLICY IF EXISTS "Admins can read payments"        ON payments;
DROP POLICY IF EXISTS "Admins can read contact_messages"  ON contact_messages;
DROP POLICY IF EXISTS "Admins can update contact_messages" ON contact_messages;
DROP POLICY IF EXISTS "Admins can delete contact_messages" ON contact_messages;
-- NOTE: event_comments / blog_posts are optional and handled in
-- conditional DO blocks below. Each block drops both legacy and current
-- policy names before creating its current policy names.
DROP POLICY IF EXISTS "Admins can write events"         ON events;
DROP POLICY IF EXISTS "Admins can write projects"       ON projects;
DROP POLICY IF EXISTS "Admins can write products"       ON products;
DROP POLICY IF EXISTS "Admins can upload media"         ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete media"         ON storage.objects;

ALTER TABLE members  DROP CONSTRAINT IF EXISTS uq_members_reg_number;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS uq_payments_lipana_ref;


-- ============================================================
-- §2. TABLE RLS — replace open anon policies with scoped ones
-- ============================================================

-- ---------- members ----------
DROP POLICY IF EXISTS "Admin can read members"   ON members;
DROP POLICY IF EXISTS "Admin can update members" ON members;
DROP POLICY IF EXISTS "Admin can delete members" ON members;
DROP POLICY IF EXISTS "Public can register as member" ON members;
-- Left behind by an early version of fix_registration.sql; it made every
-- member's phone/email world-readable. Never recreate it.
DROP POLICY IF EXISTS "Public can read own member" ON members;

-- Public registration: INSERT-only, length-checked.
-- TO anon AND authenticated: a visitor who is signed in (e.g. an admin
-- who opened /admin in the same browser) sends their user JWT, so the
-- request runs as `authenticated`. An anon-only policy rejects them with
-- "new row violates row-level security policy" (HTTP 403).
CREATE POLICY "Public can register as member"
  ON members FOR INSERT TO anon, authenticated WITH CHECK (
    char_length(full_name) BETWEEN 1 AND 120
    AND char_length(reg_number) BETWEEN 1 AND 40
    AND char_length(college) BETWEEN 1 AND 120
    AND char_length(course) BETWEEN 1 AND 120
    AND char_length(phone) BETWEEN 1 AND 20
    AND char_length(email) BETWEEN 3 AND 254
    AND membership_status = 'registered'
  );

CREATE POLICY "Admins can read members"
  ON members FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can update members"
  ON members FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete members"
  ON members FOR DELETE TO authenticated USING (public.is_admin());

-- ---------- newsletter ----------
DROP POLICY IF EXISTS "Public can subscribe to newsletter" ON newsletter;
CREATE POLICY "Public can subscribe to newsletter"
  ON newsletter FOR INSERT TO anon, authenticated WITH CHECK (
    char_length(email) BETWEEN 3 AND 254
  );

-- ---------- payments ----------
DROP POLICY IF EXISTS "Public can initiate payment" ON payments;
DROP POLICY IF EXISTS "Admin can read payments"     ON payments;

-- No public INSERT on payments. Only the stk-push / payment-webhook edge
-- functions write here, and they use service_role (bypasses RLS). An anon
-- insert policy let anyone plant fake "completed" rows, or a "pending" row
-- that the one-pending-per-member index then uses to block a member from
-- ever paying.

CREATE POLICY "Admins can read payments"
  ON payments FOR SELECT TO authenticated USING (public.is_admin());

-- ---------- contact_messages ----------
DROP POLICY IF EXISTS "Public can submit contact message" ON contact_messages;
DROP POLICY IF EXISTS "Admin can read contact_messages"   ON contact_messages;
DROP POLICY IF EXISTS "Admin can update contact_messages" ON contact_messages;
DROP POLICY IF EXISTS "Admin can delete contact_messages" ON contact_messages;

CREATE POLICY "Public can submit contact message"
  ON contact_messages FOR INSERT TO anon, authenticated WITH CHECK (
    char_length(name) BETWEEN 1 AND 120
    AND char_length(email) BETWEEN 3 AND 254
    AND char_length(subject) BETWEEN 1 AND 200
    AND char_length(message) BETWEEN 1 AND 2000
  );

CREATE POLICY "Admins can read contact_messages"
  ON contact_messages FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can update contact_messages"
  ON contact_messages FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete contact_messages"
  ON contact_messages FOR DELETE TO authenticated USING (public.is_admin());

-- ---------- event_comments (only if the table exists) ----------
DO $$
BEGIN
  IF to_regclass('public.event_comments') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Public can post event comment" ON event_comments';
    EXECUTE 'DROP POLICY IF EXISTS "Admin can delete event_comments" ON event_comments';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can delete event_comments" ON event_comments';

    EXECUTE $pol$
      CREATE POLICY "Public can post event comment"
        ON event_comments FOR INSERT TO anon WITH CHECK (
          char_length(author_name) BETWEEN 1 AND 120
          AND char_length(content) BETWEEN 1 AND 1000
        )
    $pol$;

    EXECUTE $pol$
      CREATE POLICY "Admins can delete event_comments"
        ON event_comments FOR DELETE TO authenticated USING (public.is_admin())
    $pol$;
  ELSE
    RAISE NOTICE 'Skipping event_comments policies: table does not exist.';
  END IF;
END
$$;

-- ---------- events / projects / products / blog_posts ----------
-- Public keep SELECT (read-only catalogue). All writes → admins.
DROP POLICY IF EXISTS "Admin can insert events"   ON events;
DROP POLICY IF EXISTS "Admin can update events"   ON events;
DROP POLICY IF EXISTS "Admin can delete events"   ON events;
CREATE POLICY "Admins can write events"
  ON events FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can insert projects" ON projects;
DROP POLICY IF EXISTS "Admin can update projects" ON projects;
DROP POLICY IF EXISTS "Admin can delete projects" ON projects;
CREATE POLICY "Admins can write projects"
  ON projects FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can insert products" ON products;
DROP POLICY IF EXISTS "Admin can update products" ON products;
DROP POLICY IF EXISTS "Admin can delete products" ON products;
CREATE POLICY "Admins can write products"
  ON products FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- blog_posts is optional: only touch it if the table exists.
DO $$
BEGIN
  IF to_regclass('public.blog_posts') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admin can insert blog_posts" ON blog_posts';
    EXECUTE 'DROP POLICY IF EXISTS "Admin can update blog_posts" ON blog_posts';
    EXECUTE 'DROP POLICY IF EXISTS "Admin can delete blog_posts" ON blog_posts';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can write blog_posts" ON blog_posts';

    EXECUTE $pol$
      CREATE POLICY "Admins can write blog_posts"
        ON blog_posts FOR ALL TO authenticated
        USING (public.is_admin()) WITH CHECK (public.is_admin())
    $pol$;
  ELSE
    RAISE NOTICE 'Skipping blog_posts policies: table does not exist.';
  END IF;
END
$$;


-- ============================================================
-- §3. UNIQUENESS (prevents duplicate members, replayed payments)
-- ============================================================
-- NOTE: fails loudly if duplicates exist — clean them first (§0).
ALTER TABLE members
  ADD CONSTRAINT uq_members_reg_number UNIQUE (reg_number);

ALTER TABLE payments
  ADD CONSTRAINT uq_payments_lipana_ref UNIQUE (lipana_ref);

-- One pending push per member: closes the double-submit race in
-- stk-push (concurrent requests both see "no pending row"). The edge
-- function maps 23505 on this index to "already pending" (HTTP 429).
-- NOTE: fails if a member already has 2+ pending rows — resolve those
-- first: SELECT member_id, COUNT(*) FROM payments
--            WHERE payment_status = 'pending'
--            GROUP BY member_id HAVING COUNT(*) > 1;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_payment_per_member
  ON payments (member_id) WHERE payment_status = 'pending';


-- ============================================================
-- §4. updated_at MAINTENANCE
-- ============================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_members_updated_at  ON members;
DROP TRIGGER IF EXISTS trg_payments_updated_at ON payments;

-- Only members/payments declare updated_at; the catalogue tables are
-- immutable rows by design and get no trigger.
CREATE TRIGGER trg_members_updated_at
  BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- ============================================================
-- §5. STORAGE — admin-only writes, public reads kept
-- ============================================================
DROP POLICY IF EXISTS "Anon upload event-media"    ON storage.objects;
DROP POLICY IF EXISTS "Anon upload project-media"  ON storage.objects;
DROP POLICY IF EXISTS "Anon upload product-images" ON storage.objects;
DROP POLICY IF EXISTS "Anon upload blog-media"     ON storage.objects;
DROP POLICY IF EXISTS "Anon upload member-media"   ON storage.objects;
DROP POLICY IF EXISTS "Anon delete event-media"    ON storage.objects;
DROP POLICY IF EXISTS "Anon delete project-media"  ON storage.objects;
DROP POLICY IF EXISTS "Anon delete product-images" ON storage.objects;
DROP POLICY IF EXISTS "Anon delete blog-media"     ON storage.objects;
DROP POLICY IF EXISTS "Anon delete member-media"   ON storage.objects;

CREATE POLICY "Admins can upload media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('event-media','project-media','product-images','blog-media','member-media')
    AND public.is_admin()
  );

CREATE POLICY "Admins can delete media"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id IN ('event-media','project-media','product-images','blog-media','member-media')
    AND public.is_admin()
  );


-- ============================================================
-- §6b. PUBLIC MEMBER LOOKUP (non-PII only)
-- Why: anon lost SELECT on members, which broke two public flows:
--   (a) registration uses insert().select() — RETURNING needs SELECT,
--       so every signup failed even though the row was written;
--   (b) the pay-step "Find" lookup queried members directly.
-- This RPC exposes ONLY id + name + reg + status (no phone/email)
-- so the public flows work without re-opening PII reads.
-- ============================================================
CREATE OR REPLACE FUNCTION public.find_member_lookup(p_reg TEXT)
RETURNS TABLE (id UUID, full_name TEXT, reg_number TEXT, membership_status TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.full_name, m.reg_number, m.membership_status
  FROM public.members AS m
  -- Escape LIKE metacharacters so the input is matched literally and
  -- cannot act as a wildcard probe.
  WHERE m.reg_number ILIKE replace(replace(replace(p_reg, '\', '\\'), '%', '\%'), '_', '\_')
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.find_member_lookup(TEXT) TO anon;


-- ============================================================
-- §6. POST-FLIGHT VERIFICATION (all of these must return 0 rows
--     when run as anon, and the admin probes must succeed only
--     after signing in as an admin in the same session)
-- ============================================================
-- -- As anon, expect 0 rows (proves PII is no longer world-readable):
-- SET ROLE anon;
-- SELECT count(*) FROM members;           -- expect 0 (permission denied counts as 0 rows here only if RLS blocks; use EXPLAIN-friendly probe below)
-- RESET ROLE;
--
-- -- Robust probe: these succeed for admins, raise 42501 for anon:
-- --   SELECT * FROM members LIMIT 1;
-- --   DELETE FROM events WHERE false;
-- --   SELECT * FROM contact_messages LIMIT 1;
