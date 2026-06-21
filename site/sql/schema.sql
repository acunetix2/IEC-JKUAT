-- ================================================
-- IEC JKUAT — Complete Database Reset & Schema
-- Run this in Supabase SQL Editor
-- ================================================

-- ===== STEP 1: DROP EVERYTHING EXISTING =====

-- Drop tables (order matters due to foreign key in payments.member_id)
DROP TABLE IF EXISTS blog_posts CASCADE;
DROP TABLE IF EXISTS contact_messages CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS newsletter CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS events CASCADE;

-- ===== STEP 2: CREATE FRESH TABLES =====

-- Members (registration form)
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  reg_number TEXT NOT NULL,
  college TEXT NOT NULL,
  course TEXT NOT NULL,
  year_of_study INTEGER NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  membership_status TEXT NOT NULL DEFAULT 'registered',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Newsletter subscribers
CREATE TABLE newsletter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payment transactions (M-Pesa via lipana.dev)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  phone TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  lipana_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projects (for admin dashboard)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  team_lead TEXT NOT NULL,
  status TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Events (for admin dashboard)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Blog posts (for public blog + admin)
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT,
  category TEXT,
  image_url TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contact messages (from contact.html form)
CREATE TABLE contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== STEP 3: ROW LEVEL SECURITY =====

ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Anon users can insert
CREATE POLICY "Allow anon insert members" ON members
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon insert newsletter" ON newsletter
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon insert payments" ON payments
  FOR INSERT TO anon WITH CHECK (true);

-- Anon users can read projects and events (for the showcase page)
CREATE POLICY "Allow anon select projects" ON projects
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon select events" ON events
  FOR SELECT TO anon USING (true);

-- Anon can read blog posts
CREATE POLICY "Allow anon select blog_posts" ON blog_posts
  FOR SELECT TO anon USING (true);

-- Anon can insert contact messages
CREATE POLICY "Allow anon insert contact_messages" ON contact_messages
  FOR INSERT TO anon WITH CHECK (true);

-- Service role has full access
CREATE POLICY "Allow service_role all members" ON members
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role all newsletter" ON newsletter
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role all payments" ON payments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role all projects" ON projects
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role all events" ON events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role all blog_posts" ON blog_posts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role all contact_messages" ON contact_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ===== STEP 4: SEED SAMPLE DATA =====

-- Sample projects
INSERT INTO projects (name, team_lead, status, progress, category) VALUES
  ('Eco-Irrigate', 'Cyrus Wanyonyi', 'Incubating', 65, 'AgTech'),
  ('SolarCycle', 'Grace Njeri', 'MVP Live', 90, 'Clean Energy'),
  ('BioTrack', 'Kevin Omolo', 'Ideation', 20, 'HealthTech'),
  ('SmartCampus Wallet', 'Amara Ochieng', 'Incubating', 45, 'Fintech'),
  ('M-Daktari', 'Fatima Hassan', 'MVP Live', 80, 'HealthTech'),
  ('E-Boda', 'James Kiprop', 'Incubating', 55, 'Technology'),
  ('SolarStream', 'Nancy Wambui', 'Ideation', 15, 'Social Impact'),
  ('ElimuCloud', 'Peter Kamau', 'MVP Live', 75, 'Education');

-- Sample events
INSERT INTO events (title, description, event_date, category) VALUES
  ('Annual Startup Pitch Night', 'Flagship event with student founders pitching to VCs', '2026-10-15', 'Featured'),
  ('Code-X JKUAT: Build for Africa', '48-hour hackathon on cross-border payment solutions', '2026-10-24', 'Hackathon'),
  ('Founder''s Fireside: Scaling from JKUAT', 'Guest session with Dr. Kevin Mwangi', '2026-11-05', 'Leadership'),
  ('Precision Farming Workshop', 'IoT and AI in sustainable agriculture', '2026-11-12', 'AgTech'),
  ('Monthly Mixer: Founders & Funders', 'Connect with local angel investors', '2026-11-20', 'Networking');
