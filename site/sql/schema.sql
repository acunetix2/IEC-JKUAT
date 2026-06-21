-- ================================================
-- IEC JKUAT — Complete Database Reset & Schema
-- Run this in Supabase SQL Editor
-- ================================================

-- ===== STEP 1: DROP EVERYTHING EXISTING =====

-- Drop tables (order matters due to foreign key in payments.member_id)
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS blog_posts CASCADE;
DROP TABLE IF EXISTS contact_messages CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS newsletter CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS events CASCADE;

-- ===== STEP 2: CREATE FRESH TABLES =====

-- Members (registration form)
CREATE TABLE IF NOT EXISTS members (
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
CREATE TABLE IF NOT EXISTS newsletter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payment transactions (M-Pesa via lipana.dev)
CREATE TABLE IF NOT EXISTS payments (
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
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  team_lead TEXT NOT NULL,
  status TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  description TEXT,
  media_urls JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Events (for admin dashboard)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  category TEXT,
  location TEXT,
  media_urls JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Products (for merchandise store)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  category TEXT NOT NULL DEFAULT 'Apparel',
  image_url TEXT,
  sizes JSONB DEFAULT '[]'::jsonb,
  is_member_exclusive BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cart items (for merchandise checkout)
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  size TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Blog posts (for public blog + admin)
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT,
  category TEXT,
  image_url TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cart items
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  size TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contact messages (from contact.html form)
CREATE TABLE IF NOT EXISTS contact_messages (
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
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
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

CREATE POLICY "Allow anon select products" ON products
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow service_role all events" ON events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role all products" ON products
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role all cart_items" ON cart_items
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
INSERT INTO events (title, description, event_date, category, location, media_urls) VALUES
  ('Annual Startup Pitch Night', 'Flagship event with student founders pitching to VCs for seed funding. Watch JKUAT''s brightest entrepreneurs compete for KES 500K in prize money.', '2026-10-15', 'Featured', 'JKUAT Innovation Hub, Main Campus', '["https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800","https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800","https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800"]'),
  ('Code-X JKUAT: Build for Africa', '48-hour hackathon focusing on cross-border payment solutions for SME merchants. Prizes include seed funding and incubation space.', '2026-10-24', 'Hackathon', 'Engineering Building Lab 3', '["https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800","https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800"]'),
  ('Founder''s Fireside: Scaling from JKUAT', 'Guest session with Dr. Kevin Mwangi, JKUAT Alumni and CEO of TechPillar. Learn how to scale your startup from campus to the world.', '2026-11-05', 'Leadership', 'Innovation Hub Lab 2', '["https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800"]'),
  ('Precision Farming Workshop', 'Exploring IoT and AI in sustainable agriculture with hands-on drone demonstrations and sensor deployment.', '2026-11-12', 'AgTech', 'COANRE AgriLab', '["https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800","https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800"]'),
  ('Monthly Mixer: Founders & Funders', 'Connect with local angel investors in a relaxed environment. No pitches, just conversations.', '2026-11-20', 'Networking', 'Student Center Roof Terrace', '[]');

-- Sample products (merchandise)
INSERT INTO products (name, description, price, category, image_url, sizes, is_member_exclusive) VALUES
  ('IEC Tech Hoodie', 'Heavyweight cotton hoodie with embroidered IEC JKUAT logo. Built for deep-work sessions.', 3500, 'Apparel', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400', '["S","M","L","XL"]', false),
  ('Founder''s Track Tee', 'Limited edition oversized fit t-shirt. Only available to registered club members.', 1800, 'Apparel', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', '["S","M","L"]', true),
  ('Innovation Hub Tote', 'Premium canvas bag with internal laptop pocket. Perfect for carrying your gear to the lab.', 1200, 'Accessories', 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400', '[]', false),
  ('Silicon Savannah Cap', 'Structured 5-panel cap with premium 3D embroidery and adjustable strap.', 1500, 'Accessories', 'https://images.unsplash.com/photo-1588850561407-ed78c334e67a?w=400', '[]', false);

-- Sample blog posts
INSERT INTO blog_posts (title, content, author, category, image_url, published_at) VALUES
  ('IEC JKUAT Launches 2026 Venture Pulse Program', 'The Innovation & Entrepreneurship Club at JKUAT is proud to announce the launch of our 2026 Venture Pulse program. This year, we are introducing three new tracks: Fintech Innovation, AgTech Solutions, and HealthTech Disruption. Each track offers hands-on workshops, mentorship from industry experts, and the opportunity to pitch for seed funding at our annual Pitch Night.

Our goal is to bridge the gap between academic research and commercial viability. With over 40 active projects and 15 startups already founded, the IEC ecosystem continues to grow. We invite all JKUAT students to join us in making 2026 our most impactful year yet.

Key dates for the program:
- Track Registration: Open now
- Weekly Workshops: Every Wednesday at 3 PM
- Mid-Semester Demo Day: September 2026
- Annual Pitch Night: October 15, 2026', 'IEC JKUAT Editorial', 'News', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600', '2026-06-15'),

  ('Student Spotlight: How Eco-Irrigate is Transforming Kenyan Agriculture', 'When Cyrus Wanyonyi noticed smallholder farmers in his hometown struggling with water scarcity, he knew technology could help. Alongside a team of fellow JKUAT engineering students, he founded Eco-Irrigate — an AI-powered precision farming solution that uses low-cost soil moisture sensors and satellite data to automate irrigation.

"The system reduces water waste by 40% and increases crop yields by nearly double," says Cyrus, a final-year Electrical Engineering student. "We tested it on 50 farms in Kiambu County and the results were remarkable."

The project, incubated under IEC JKUAT''s Venture Pulse program, has already attracted interest from the Ministry of Agriculture and several agri-tech investors. The team is now working on scaling the solution across Kenya and eventually the entire East African region.

Cyrus shares his advice for fellow students: "Don''t wait until graduation to start. IEC gave us the mentorship, network, and resources to turn our idea into reality. Just start."', 'IEC JKUAT Editorial', 'Spotlight', 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=600', '2026-06-10'),

  ('Recap: Code-X Hackathon 2026 Draws Record Participation', 'Over 120 students from 14 universities across Kenya gathered at JKUAT for the annual Code-X Hackathon, making it our largest turnout yet. The 48-hour coding marathon challenged participants to build solutions for cross-border payment challenges faced by SME merchants in East Africa.

Teams competed in three categories: mobile payments, blockchain-based settlements, and AI-powered fraud detection. The winning team, "SwiftPay", walked away with KES 200,000 in seed funding and a three-month incubation slot at the IEC Venture Lab.

"The energy was incredible," said Dr. Kevin Onyango, Dean of COETEC and chief judge. "The quality of solutions we saw this year was outstanding. Kenya''s tech future is in good hands."

A photo gallery from the event is available below. We thank all participants, judges, sponsors, and volunteers who made this event possible.', 'Events Team', 'Events', 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600', '2026-05-28');
