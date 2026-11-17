-- Migration: admin portal content and project publishing.
-- Apply after schema.sql and migration_production_hardening.sql.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT TRUE;

DROP POLICY IF EXISTS "Public can read projects" ON public.projects;
DROP POLICY IF EXISTS "Public read published projects" ON public.projects;
CREATE POLICY "Public read published projects"
  ON public.projects FOR SELECT TO anon, authenticated
  USING (is_published = TRUE);

CREATE TABLE IF NOT EXISTS public.executives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL UNIQUE,
  level TEXT NOT NULL CHECK (level IN ('advisor', 'executive', 'lead')),
  photo_path TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.executives ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.executives TO anon, authenticated;

DROP POLICY IF EXISTS "Public can read active executives" ON public.executives;
CREATE POLICY "Public can read active executives"
  ON public.executives FOR SELECT TO anon, authenticated
  USING (is_active = TRUE);

INSERT INTO public.executives (name, role, level, display_order)
VALUES
  ('', 'Club Patron', 'advisor', 1),
  ('', 'Chairperson', 'executive', 2),
  ('', 'Vice Chairperson', 'executive', 3),
  ('', 'Secretary', 'lead', 4),
  ('', 'Treasurer', 'lead', 5),
  ('', 'Technology Lead', 'lead', 6),
  ('', 'Events Lead', 'lead', 7),
  ('', 'Public Relations Lead', 'lead', 8)
ON CONFLICT (role) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'iec-executive-profiles',
  'iec-executive-profiles',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read executive profiles" ON storage.objects;
CREATE POLICY "Public read executive profiles"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'iec-executive-profiles');

CREATE OR REPLACE FUNCTION public.touch_executives_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_executives_updated_at ON public.executives;
CREATE TRIGGER trg_executives_updated_at
  BEFORE UPDATE ON public.executives
  FOR EACH ROW EXECUTE FUNCTION public.touch_executives_updated_at();
