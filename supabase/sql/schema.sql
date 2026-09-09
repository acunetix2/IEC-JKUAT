-- ============================================================
-- IEC JKUAT — Full Database Schema
-- Run this once in the Supabase SQL Editor on a fresh project.
-- It creates all tables, indexes, RLS policies, and storage
-- buckets needed to run the entire website.
-- ============================================================


-- ============================================================
-- STEP 1: EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- STEP 2: TABLES
-- ============================================================

-- ------------------------------------------------------------
-- members
-- Populated by the public registration form on index.html.
-- The admin dashboard reads from this table.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS members (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name         TEXT        NOT NULL,
  reg_number        TEXT        NOT NULL,
  college           TEXT        NOT NULL,
  course            TEXT        NOT NULL,
  year_of_study     INTEGER     NOT NULL CHECK (year_of_study BETWEEN 1 AND 6),
  phone             TEXT        NOT NULL,
  email             TEXT        NOT NULL,
  membership_status TEXT        NOT NULL DEFAULT 'registered',
  -- 'registered' = signed up, fee not yet confirmed
  -- 'active'     = fee confirmed, full member
  avatar_url        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_members_email       ON members (email);
CREATE INDEX IF NOT EXISTS idx_members_reg_number  ON members (reg_number);
CREATE INDEX IF NOT EXISTS idx_members_status      ON members (membership_status);
CREATE INDEX IF NOT EXISTS idx_members_created_at  ON members (created_at DESC);

-- ------------------------------------------------------------
-- newsletter
-- Populated by the newsletter signup form on index.html footer.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS newsletter (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- payments
-- Records M-Pesa STK push attempts via the lipana.dev edge function.
-- Linked to a member. Status updated by the payment webhook.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id      UUID        REFERENCES members (id) ON DELETE SET NULL,
  amount         INTEGER     NOT NULL,                -- in KES
  phone          TEXT        NOT NULL,
  payment_status TEXT        NOT NULL DEFAULT 'pending',
  -- 'pending' | 'completed' | 'failed' | 'cancelled'
  lipana_ref     TEXT,                                -- transaction reference from lipana.dev
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments (member_id);
CREATE INDEX IF NOT EXISTS idx_payments_status    ON payments (payment_status);

-- ------------------------------------------------------------
-- events
-- Managed via the Supabase dashboard (not the admin page).
-- Displayed on events.html. Media files stored in event-media bucket.
-- embed_urls holds YouTube/Instagram/Twitter links for the modal.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  description TEXT,
  event_date  DATE        NOT NULL,
  category    TEXT,
  -- 'Fintech' | 'AgTech' | 'Leadership' | 'Networking' | 'Hackathon' | 'Workshop' | 'Featured'
  location    TEXT,
  media_urls  JSONB       NOT NULL DEFAULT '[]'::jsonb,
  embed_urls  JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_event_date  ON events (event_date ASC);
CREATE INDEX IF NOT EXISTS idx_events_category    ON events (category);

-- ------------------------------------------------------------
-- event_comments
-- Public comments on individual event modals on events.html.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_comments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  author_name  TEXT        NOT NULL,
  author_email TEXT,
  content      TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_comments_event_id   ON event_comments (event_id);
CREATE INDEX IF NOT EXISTS idx_event_comments_created_at ON event_comments (created_at ASC);

-- ------------------------------------------------------------
-- projects
-- Managed via the Supabase dashboard.
-- Displayed on showcase.html. Media stored in project-media bucket.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  team_lead   TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'Ideation',
  -- 'Ideation' | 'Incubating' | 'MVP Live'
  progress    INTEGER     NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  category    TEXT,
  -- 'Fintech' | 'AgTech' | 'HealthTech' | 'Social Impact' | 'Education' | 'Technology'
  description TEXT,
  media_urls  JSONB       NOT NULL DEFAULT '[]'::jsonb,
  embed_urls  JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_status     ON projects (status);
CREATE INDEX IF NOT EXISTS idx_projects_category   ON projects (category);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects (created_at DESC);

-- ------------------------------------------------------------
-- products
-- Managed via the Supabase dashboard.
-- Displayed on merchandise.html. Images stored in product-images bucket.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT        NOT NULL,
  description        TEXT,
  price              INTEGER     NOT NULL CHECK (price > 0),  -- in KES
  category           TEXT        NOT NULL DEFAULT 'Apparel',
  -- 'Apparel' | 'Accessories'
  image_url          TEXT,
  sizes              JSONB       NOT NULL DEFAULT '[]'::jsonb,
  is_member_exclusive BOOLEAN    NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);

-- ------------------------------------------------------------
-- contact_messages
-- Submitted via the contact form on contact.html.
-- Readable in the Supabase dashboard.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  subject    TEXT        NOT NULL,
  message    TEXT        NOT NULL,
  is_read    BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_is_read    ON contact_messages (is_read);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages (created_at DESC);

-- ------------------------------------------------------------
-- blog_posts
-- Managed via the Supabase dashboard.
-- Images stored in blog-media bucket.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blog_posts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL,
  content      TEXT        NOT NULL,
  author       TEXT,
  category     TEXT,
  -- 'News' | 'Events' | 'Spotlight' | 'Tech' | 'Community'
  image_url    TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category     ON blog_posts (category);


-- ============================================================
-- STEP 3: ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE members          ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter        ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_comments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE products          ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts        ENABLE ROW LEVEL SECURITY;

-- -------- Public READ (anon can read public content) --------
DROP POLICY IF EXISTS "Public can read events" ON events;
CREATE POLICY "Public can read events"
  ON events FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Public can read event_comments" ON event_comments;
CREATE POLICY "Public can read event_comments"
  ON event_comments FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Public can read projects" ON projects;
CREATE POLICY "Public can read projects"
  ON projects FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Public can read products" ON products;
CREATE POLICY "Public can read products"
  ON products FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Public can read blog_posts" ON blog_posts;
CREATE POLICY "Public can read blog_posts"
  ON blog_posts FOR SELECT TO anon USING (true);

-- -------- Public WRITE (anon can submit forms) --------
DROP POLICY IF EXISTS "Public can register as member" ON members;
CREATE POLICY "Public can register as member"
  ON members FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Public can subscribe to newsletter" ON newsletter;
CREATE POLICY "Public can subscribe to newsletter"
  ON newsletter FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Public can initiate payment" ON payments;
CREATE POLICY "Public can initiate payment"
  ON payments FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Public can submit contact message" ON contact_messages;
CREATE POLICY "Public can submit contact message"
  ON contact_messages FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Public can post event comment" ON event_comments;
CREATE POLICY "Public can post event comment"
  ON event_comments FOR INSERT TO anon WITH CHECK (true);

-- -------- Admin WRITE (anon write — temporary until auth is added) --------
-- NOTE: These policies allow anyone with the admin URL to write data.
-- Replace with auth.uid()-based policies once Supabase Auth is set up.

DROP POLICY IF EXISTS "Admin can insert events" ON events;
CREATE POLICY "Admin can insert events"
  ON events FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Admin can update events" ON events;
CREATE POLICY "Admin can update events"
  ON events FOR UPDATE TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Admin can delete events" ON events;
CREATE POLICY "Admin can delete events"
  ON events FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS "Admin can insert projects" ON projects;
CREATE POLICY "Admin can insert projects"
  ON projects FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Admin can update projects" ON projects;
CREATE POLICY "Admin can update projects"
  ON projects FOR UPDATE TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Admin can delete projects" ON projects;
CREATE POLICY "Admin can delete projects"
  ON projects FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS "Admin can insert products" ON products;
CREATE POLICY "Admin can insert products"
  ON products FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Admin can update products" ON products;
CREATE POLICY "Admin can update products"
  ON products FOR UPDATE TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Admin can delete products" ON products;
CREATE POLICY "Admin can delete products"
  ON products FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS "Admin can insert blog_posts" ON blog_posts;
CREATE POLICY "Admin can insert blog_posts"
  ON blog_posts FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Admin can update blog_posts" ON blog_posts;
CREATE POLICY "Admin can update blog_posts"
  ON blog_posts FOR UPDATE TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Admin can delete blog_posts" ON blog_posts;
CREATE POLICY "Admin can delete blog_posts"
  ON blog_posts FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS "Admin can read members" ON members;
CREATE POLICY "Admin can read members"
  ON members FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Admin can update members" ON members;
CREATE POLICY "Admin can update members"
  ON members FOR UPDATE TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Admin can delete members" ON members;
CREATE POLICY "Admin can delete members"
  ON members FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS "Admin can read payments" ON payments;
CREATE POLICY "Admin can read payments"
  ON payments FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Admin can read contact_messages" ON contact_messages;
CREATE POLICY "Admin can read contact_messages"
  ON contact_messages FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Admin can update contact_messages" ON contact_messages;
CREATE POLICY "Admin can update contact_messages"
  ON contact_messages FOR UPDATE TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Admin can delete contact_messages" ON contact_messages;
CREATE POLICY "Admin can delete contact_messages"
  ON contact_messages FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS "Admin can delete event_comments" ON event_comments;
CREATE POLICY "Admin can delete event_comments"
  ON event_comments FOR DELETE TO anon USING (true);

-- -------- Service role (edge functions, webhooks) --------
-- service_role bypasses RLS by default — no extra policies needed.


-- ============================================================
-- STEP 4: STORAGE BUCKETS
-- ============================================================
-- Run these INSERT statements to create the storage buckets.
-- Supabase Storage RLS is separate from table RLS.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-media', 'event-media', true, 52428800,
  ARRAY['image/png','image/jpeg','image/jpg','image/gif','image/webp','video/mp4','video/webm','video/quicktime']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-media', 'project-media', true, 52428800,
  ARRAY['image/png','image/jpeg','image/jpg','image/gif','image/webp','video/mp4','video/webm','video/quicktime']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images', 'product-images', true, 10485760,
  ARRAY['image/png','image/jpeg','image/jpg','image/gif','image/webp']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog-media', 'blog-media', true, 10485760,
  ARRAY['image/png','image/jpeg','image/jpg','image/gif','image/webp']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'member-media', 'member-media', true, 5242880,
  ARRAY['image/png','image/jpeg','image/jpg','image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS: allow public read on all buckets
DROP POLICY IF EXISTS "Public read event-media" ON storage.objects;
CREATE POLICY "Public read event-media"
  ON storage.objects FOR SELECT USING (bucket_id = 'event-media');

DROP POLICY IF EXISTS "Public read project-media" ON storage.objects;
CREATE POLICY "Public read project-media"
  ON storage.objects FOR SELECT USING (bucket_id = 'project-media');

DROP POLICY IF EXISTS "Public read product-images" ON storage.objects;
CREATE POLICY "Public read product-images"
  ON storage.objects FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Public read blog-media" ON storage.objects;
CREATE POLICY "Public read blog-media"
  ON storage.objects FOR SELECT USING (bucket_id = 'blog-media');

DROP POLICY IF EXISTS "Public read member-media" ON storage.objects;
CREATE POLICY "Public read member-media"
  ON storage.objects FOR SELECT USING (bucket_id = 'member-media');

-- Storage RLS: allow anon upload (admin panel and registration)
DROP POLICY IF EXISTS "Anon upload event-media" ON storage.objects;
CREATE POLICY "Anon upload event-media"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'event-media');

DROP POLICY IF EXISTS "Anon upload project-media" ON storage.objects;
CREATE POLICY "Anon upload project-media"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'project-media');

DROP POLICY IF EXISTS "Anon upload product-images" ON storage.objects;
CREATE POLICY "Anon upload product-images"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Anon upload blog-media" ON storage.objects;
CREATE POLICY "Anon upload blog-media"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'blog-media');

DROP POLICY IF EXISTS "Anon upload member-media" ON storage.objects;
CREATE POLICY "Anon upload member-media"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'member-media');

-- Storage RLS: allow anon delete (admin panel cleanup)
DROP POLICY IF EXISTS "Anon delete event-media" ON storage.objects;
CREATE POLICY "Anon delete event-media"
  ON storage.objects FOR DELETE TO anon
  USING (bucket_id = 'event-media');

DROP POLICY IF EXISTS "Anon delete project-media" ON storage.objects;
CREATE POLICY "Anon delete project-media"
  ON storage.objects FOR DELETE TO anon
  USING (bucket_id = 'project-media');

DROP POLICY IF EXISTS "Anon delete product-images" ON storage.objects;
CREATE POLICY "Anon delete product-images"
  ON storage.objects FOR DELETE TO anon
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Anon delete blog-media" ON storage.objects;
CREATE POLICY "Anon delete blog-media"
  ON storage.objects FOR DELETE TO anon
  USING (bucket_id = 'blog-media');

DROP POLICY IF EXISTS "Anon delete member-media" ON storage.objects;
CREATE POLICY "Anon delete member-media"
  ON storage.objects FOR DELETE TO anon
  USING (bucket_id = 'member-media');


-- ============================================================
-- DONE
-- ============================================================
-- Tables created:
--   members, newsletter, payments, events, event_comments,
--   projects, products, contact_messages, blog_posts
--
-- Storage buckets created:
--   event-media (50MB, images + video)
--   project-media (50MB, images + video)
--   product-images (10MB, images only)
--   blog-media (10MB, images only)
--   member-media (5MB, images only)
--
-- Next steps:
--   1. Go to Supabase → SQL Editor → paste and run this file.
--   2. Update SUPABASE_URL and SUPABASE_ANON_KEY in js/supabase-config.js
--      with your new project's values (Settings → API).
--   3. Deploy the stk-push edge function:
--         supabase functions deploy stk-push --no-verify-jwt
--      and set the LIPANA_SECRET_KEY secret.
--   4. When ready to lock down the admin panel, add Supabase Auth
--      and replace the temporary anon write policies with
--      auth.uid()-based policies.
-- ============================================================
