-- ============================================================
-- IEC JKUAT — Seed Data
-- Run this AFTER schema.sql to populate the database with
-- realistic sample data for development and preview.
--
-- Uses Unsplash images as placeholders. Replace with real
-- IEC photos when available.
-- ============================================================


-- ============================================================
-- EVENTS
-- ============================================================
INSERT INTO events (title, description, event_date, category, location, media_urls, embed_urls) VALUES

(
  'IEC Innovation Night 2026',
  'Our flagship annual showcase where student founders pitch their projects to a panel of investors, mentors and industry professionals. Featuring live demos, networking and the crowning of the IEC Innovator of the Year.',
  '2026-09-18',
  'Featured',
  'JKUAT Main Campus — Innovation Hub',
  '["https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop","https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&h=600&fit=crop"]',
  '[]'
),

(
  'Fintech Hackathon: Silicon Savannah',
  'A 48-hour hackathon focused on building the next generation of financial technology solutions for East Africa. Teams of 2–5 compete for mentorship, incubation support and cash prizes.',
  '2026-10-03',
  'Hackathon',
  'JKUAT Computer Labs, Block C',
  '["https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=600&fit=crop","https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&h=600&fit=crop"]',
  '[]'
),

(
  'Founder Friday: Building Without Resources',
  'A candid conversation series with entrepreneurs who built successful ventures from limited resources. This session features three JKUAT alumni who founded companies while still on campus.',
  '2026-09-25',
  'Leadership',
  'JKUAT Senate Board Room',
  '["https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&h=600&fit=crop"]',
  '[]'
),

(
  'AgTech Innovation Workshop',
  'A hands-on workshop exploring the intersection of agriculture and technology. Learn about precision farming, IoT sensors, drone applications and data-driven farming solutions designed for Kenyan smallholder farmers.',
  '2026-10-15',
  'AgTech',
  'JKUAT Agriculture Department, Block A',
  '["https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&h=600&fit=crop"]',
  '[]'
),

(
  'IEC Networking Mixer',
  'Connect with fellow students, alumni, mentors and industry professionals in an informal setting. Bring your business cards, your ideas and your appetite — refreshments provided.',
  '2026-11-07',
  'Networking',
  'JKUAT Student Centre Grounds',
  '["https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop"]',
  '[]'
),

(
  'HealthTech Ideathon',
  'A one-day ideation sprint where multi-disciplinary teams tackle real healthcare challenges faced by communities around JKUAT. No coding required — ideas from any discipline welcome.',
  '2026-11-20',
  'Workshop',
  'JKUAT Medical School Auditorium',
  '["https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&h=600&fit=crop"]',
  '[]'
);


-- ============================================================
-- PROJECTS
-- ============================================================
INSERT INTO projects (name, team_lead, status, progress, category, description, media_urls, embed_urls) VALUES

(
  'EcoIrrigate',
  'Cyrus Wanyonyi',
  'Incubating',
  68,
  'AgTech',
  'A low-cost IoT-based smart irrigation system designed for smallholder farmers in semi-arid regions of Kenya. Uses soil moisture sensors, weather data and a mobile app to reduce water usage by up to 40% while improving crop yields.',
  '["https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&h=600&fit=crop","https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&h=400&fit=crop"]',
  '[]'
),

(
  'SmartCampus Wallet',
  'Amara Ochieng',
  'MVP Live',
  90,
  'Fintech',
  'A digital payment and budgeting app built specifically for JKUAT students. Enables peer-to-peer payments, cafeteria payments, printing credits and budget tracking — all from a single app. Currently has 300+ active users on campus.',
  '["https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=600&fit=crop","https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&h=400&fit=crop"]',
  '[]'
),

(
  'M-Daktari',
  'Fatima Hassan',
  'MVP Live',
  82,
  'HealthTech',
  'A telemedicine platform connecting rural communities with qualified doctors via USSD and smartphone. Eliminates the need for internet connectivity for basic consultations. Piloted in 3 counties with over 1,200 consultations completed.',
  '["https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&h=600&fit=crop"]',
  '[]'
),

(
  'BioTrack',
  'Kevin Omolo',
  'Ideation',
  22,
  'HealthTech',
  'A wearable biosensor system for early detection of malaria and other vector-borne diseases through continuous blood biomarker monitoring. Currently in research phase with the JKUAT Medical School.',
  '["https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&h=400&fit=crop"]',
  '[]'
),

(
  'SolarStream',
  'Nancy Wambui',
  'Ideation',
  18,
  'Social Impact',
  'Affordable off-grid solar power kits designed for informal settlements and rural homes. Includes pay-as-you-go financing through M-Pesa, making clean energy accessible to households currently dependent on kerosene.',
  '["https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=400&fit=crop"]',
  '[]'
),

(
  'ElimuCloud',
  'Peter Kamau',
  'Incubating',
  55,
  'Education',
  'An offline-first learning management system designed for schools and colleges with poor or no internet connectivity. Content is synced via Bluetooth mesh networking between devices. Piloting in 5 secondary schools in Kiambu County.',
  '["https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&h=600&fit=crop","https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop"]',
  '[]'
),

(
  'E-Boda',
  'James Kiprop',
  'Incubating',
  48,
  'Technology',
  'A data-driven platform for boda boda (motorcycle taxi) operators and fleet owners. Provides route optimisation, earnings tracking, insurance products and access to micro-loans based on ride history.',
  '["https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&h=400&fit=crop"]',
  '[]'
),

(
  'SoilSense',
  'Grace Njeri',
  'Ideation',
  12,
  'AgTech',
  'Machine learning-powered soil analysis using a low-cost handheld spectroscopy device. Farmers get instant soil health reports and fertiliser recommendations via SMS — no lab required.',
  '[]',
  '[]'
);


-- ============================================================
-- PRODUCTS
-- ============================================================
INSERT INTO products (name, description, price, category, image_url, sizes, is_member_exclusive) VALUES

(
  'IEC Signature Hoodie',
  'Premium heavyweight fleece hoodie with embroidered IEC logo on chest and "Silicon Savannah" screen print on the back. Made from 320gsm cotton-polyester blend. Warm, comfortable and built to last.',
  2500,
  'Apparel',
  'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&h=600&fit=crop',
  '["S","M","L","XL","XXL"]',
  false
),

(
  'Venture First Tee',
  'Soft 100% combed cotton crew neck tee. Minimalist IEC JKUAT wordmark printed on the chest. Available in black. The everyday uniform for builders.',
  1200,
  'Apparel',
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=600&fit=crop',
  '["S","M","L","XL"]',
  false
),

(
  'Founder''s Edition Polo',
  'Smart casual polo shirt with embroidered IEC crest on the chest. Perfect for pitch days, networking events and anything that requires looking sharper than your average student.',
  1800,
  'Apparel',
  'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=600&h=600&fit=crop',
  '["S","M","L","XL"]',
  true
),

(
  'IEC Track Jacket',
  'Lightweight zip-up track jacket with IEC stripe detail on the sleeves and a subtle logo on the chest. Great for early morning sessions at the Innovation Hub.',
  2200,
  'Apparel',
  'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&h=600&fit=crop',
  '["S","M","L","XL"]',
  false
),

(
  'IEC Snapback Cap',
  'Structured snapback with a flat brim and IEC logo embroidered on the front panel. One size fits most.',
  900,
  'Accessories',
  'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&h=600&fit=crop',
  '[]',
  false
),

(
  'Innovator Backpack',
  '20L tech backpack with padded 15" laptop sleeve, USB charging port pass-through, water bottle pocket and an IEC embroidered patch on the front. Built for the daily grind.',
  3500,
  'Accessories',
  'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=600&fit=crop',
  '[]',
  true
),

(
  'Silicon Savannah Mug',
  '350ml ceramic mug with "Silicon Savannah" bold print. Dishwasher safe. Perfect for the 2am coding sessions.',
  600,
  'Accessories',
  'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600&h=600&fit=crop',
  '[]',
  false
),

(
  'IEC Sticker Pack (5pcs)',
  'Five premium die-cut vinyl stickers: IEC logo, "Build Things", "Ship It", Silicon Savannah outline map, and a rocket icon. Weatherproof and laptop-safe.',
  250,
  'Accessories',
  'https://images.unsplash.com/photo-1618519764620-7403abdbdfe9?w=600&h=600&fit=crop',
  '[]',
  false
);


-- ============================================================
-- SAMPLE MEMBERS (for admin dashboard preview)
-- ============================================================
INSERT INTO members (full_name, reg_number, college, course, year_of_study, phone, email, membership_status) VALUES
('Jane Mwangi',   'SCT211-0001/2023', 'COPAS — Pure & Applied Sciences',                   'BSc Computer Science',          3, '0712345601', 'jane.mwangi@students.jkuat.ac.ke',    'active'),
('Brian Otieno',  'SCT211-0002/2023', 'COETEC — Engineering & Technology',                  'BSc Electrical Engineering',    2, '0712345602', 'brian.otieno@students.jkuat.ac.ke',   'active'),
('Amina Hassan',  'SCT211-0003/2022', 'COHES — Health Sciences',                            'BSc Nursing',                   4, '0712345603', 'amina.hassan@students.jkuat.ac.ke',   'registered'),
('Kevin Njoroge', 'SCT211-0004/2024', 'COANRE — Agriculture, Natural Resources & Environment','BSc Agriculture',              1, '0712345604', 'kevin.njoroge@students.jkuat.ac.ke',  'active'),
('Faith Wanjiku', 'SCT211-0005/2023', 'COHRED — Human Resource & Enterprise Development',   'BBM Business Management',       2, '0712345605', 'faith.wanjiku@students.jkuat.ac.ke',  'registered'),
('Dennis Mwenda', 'SCT211-0006/2022', 'COETEC — Engineering & Technology',                  'BSc Mechanical Engineering',    4, '0712345606', 'dennis.mwenda@students.jkuat.ac.ke',  'active'),
('Lydia Chebet',  'SCT211-0007/2024', 'COPAS — Pure & Applied Sciences',                   'BSc Mathematics',               1, '0712345607', 'lydia.chebet@students.jkuat.ac.ke',   'registered'),
('Samuel Kimani', 'SCT211-0008/2023', 'COETEC — Engineering & Technology',                  'BSc Civil Engineering',         3, '0712345608', 'samuel.kimani@students.jkuat.ac.ke',  'active');


-- ============================================================
-- DONE
-- ============================================================
-- To use this seed data:
--   1. Run schema.sql first (creates tables + RLS).
--   2. Then run this file in the Supabase SQL Editor.
--
-- The site will now show real data from the database instead
-- of hardcoded mock data on all pages.
--
-- Replace Unsplash image URLs with real IEC photos by:
--   a. Uploading photos via the admin panel.
--   b. Updating the image_url / media_urls columns in Supabase.
-- ============================================================
