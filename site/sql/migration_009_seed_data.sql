-- ================================================
-- IEC JKUAT — Seed Data Migration
-- Run this in Supabase SQL Editor to populate the database
-- ================================================

-- ===== EVENTS (with rich media galleries) =====

-- First clear existing seed data to avoid duplicates
DELETE FROM events WHERE title LIKE 'Annual Startup%' OR title LIKE 'Code-X%' OR title LIKE 'Founder%' OR title LIKE 'Precision Farming%' OR title LIKE 'Monthly Mixer%';

INSERT INTO events (title, description, event_date, category, location, media_urls) VALUES
(
  'Annual Startup Pitch Night 2026',
  'JKUAT''s flagship startup competition returns bigger than ever. Watch 20 student-founded startups pitch their ventures to a panel of venture capitalists, angel investors, and industry leaders for a chance to win KES 500,000 in seed funding and a 6-month incubation slot at the IEC Venture Lab.

This year''s edition features startups from five tracks: Fintech, AgTech, HealthTech, Clean Energy, and Social Impact. Each team gets 5 minutes to pitch followed by 3 minutes of Q&A from the judges.

Past winners have gone on to raise over KES 10M in follow-on funding and have been featured in Forbes Africa, TechCrunch, and CNN.

Key highlights:
- 20 startups competing
- KES 500K grand prize
- Live investor Q&A session
- Networking mixer after the event
- Free entry for all JKUAT students',
  '2026-10-15',
  'Featured',
  'JKUAT Innovation Hub, Main Campus',
  '[
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&h=500&fit=crop"
  ]'
),
(
  'Code-X Hackathon: Build for Africa',
  'A 48-hour intensive hackathon bringing together 200+ developers, designers, and product managers from universities across Kenya. This year''s challenge focuses on building cross-border payment solutions for SME merchants in East Africa.

Teams will have access to APIs from Safaricom, Equity Bank, and several fintech partners. Prizes include KES 200,000 in seed funding, a 3-month incubation slot, and direct mentorship from leading fintech founders.

Food, drinks, and internet are provided throughout the event. Bring your laptop, charger, and your best ideas!

What to expect:
- Keynote from a leading fintech founder
- API workshops and technical mentorship
- 48 hours of non-stop building
- Final presentations to a judging panel
- After-party with live music',
  '2026-10-24',
  'Hackathon',
  'Engineering Building Lab 3, JKUAT',
  '[
    "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&h=500&fit=crop"
  ]'
),
(
  'Founder''s Fireside: Scaling from JKUAT to the World',
  'An intimate fireside chat with Dr. Kevin Mwangi, JKUAT Alumni and CEO of TechPillar — a Nairobi-based SaaS company serving 50,000+ businesses across 12 African countries.

Dr. Mwangi will share his journey from a JKUAT computer science student to building a multi-million dollar tech company. Topics include:
- How to validate your startup idea on a student budget
- Building your first MVP with zero coding experience
- Getting your first 100 customers
- When and how to raise funding
- Balancing academics with entrepreneurship

This is a must-attend session for any student founder or aspiring entrepreneur. Limited to 80 seats — first come, first served.',
  '2026-11-05',
  'Leadership',
  'Innovation Hub Lab 2, JKUAT',
  '[
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1511988617509-a57c8a288659?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=500&fit=crop"
  ]'
),
(
  'Precision Farming Workshop: IoT in Agriculture',
  'A hands-on workshop exploring how Internet of Things (IoT) and Artificial Intelligence are transforming agriculture in Kenya. Hosted at the COANRE AgriLab, participants will work with real soil moisture sensors, drone imaging equipment, and AI-powered analytics tools.

This workshop is ideal for engineering, agriculture, and computer science students interested in agritech. No prior experience with IoT required.

Workshop schedule:
- 9:00 AM — Introduction to Precision Agriculture
- 10:30 AM — Hands-on: Deploying soil moisture sensors
- 12:00 PM — Lunch break
- 1:00 PM — Drone imaging and data collection demo
- 3:00 PM — AI-powered crop yield prediction
- 4:30 PM — Networking and project ideation',
  '2026-11-12',
  'AgTech',
  'COANRE AgriLab, JKUAT',
  '[
    "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&h=500&fit=crop"
  ]'
),
(
  'Monthly Mixer: Founders & Funders',
  'Our monthly networking event returns! This is a relaxed evening where student founders can connect with angel investors, venture capitalists, and fellow entrepreneurs. No pitches allowed — just genuine conversations over good food and drinks.

Featured guests this month include:
- Sarah Ochieng, Partner at Seed Africa Ventures
- David Kamau, Founder of M-Kopa (JKUAT Alumni)
- Linda Akinyi, Program Manager at iHub

Whether you have a startup idea or are just curious about entrepreneurship, this is the place to be.',
  '2026-11-20',
  'Networking',
  'Student Center Roof Terrace, JKUAT',
  '[
    "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&h=500&fit=crop"
  ]'
);

-- ===== PROJECTS (with media galleries) =====

DELETE FROM projects WHERE name IN ('Eco-Irrigate', 'SolarCycle', 'BioTrack', 'SmartCampus Wallet', 'M-Daktari', 'E-Boda', 'SolarStream', 'ElimuCloud');

INSERT INTO projects (name, team_lead, status, progress, category, description, media_urls) VALUES
(
  'Eco-Irrigate',
  'Cyrus Wanyonyi',
  'Incubating',
  65,
  'AgTech',
  'AI-powered precision farming solution that uses low-cost soil moisture sensors and satellite data to automate irrigation for smallholder farmers. Reduces water waste by 40% and increases crop yields by nearly double. Currently piloting with 200+ farmers in Kiambu County.',
  '[
    "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=500&fit=crop"
  ]'
),
(
  'SolarCycle',
  'Grace Njeri',
  'MVP Live',
  90,
  'Clean Energy',
  'Affordable solar-powered electric bike conversion kits for urban logistics workers. Converts any standard bicycle into an electric bike in under 30 minutes. Reduces transportation costs by 60% and eliminates carbon emissions. 500+ units deployed in Nairobi and Mombasa.',
  '[
    "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800&h=500&fit=crop"
  ]'
),
(
  'BioTrack',
  'Kevin Omolo',
  'Ideation',
  20,
  'HealthTech',
  'Blockchain-based pharmaceutical supply chain tracking system that combats counterfeit drugs in East Africa. Uses QR codes and smart contracts to verify drug authenticity from manufacturer to patient. Addressing a $5B problem in the region.',
  '[]'
),
(
  'SmartCampus Wallet',
  'Amara Ochieng',
  'Incubating',
  45,
  'Fintech',
  'A closed-loop payment ecosystem for university campuses. Students can pay for meals, printing, laundry, and event tickets using a single digital wallet. Eliminates the need for cash on campus. Integrated with campus ID cards.',
  '[
    "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=500&fit=crop"
  ]'
),
(
  'M-Daktari',
  'Fatima Hassan',
  'MVP Live',
  80,
  'HealthTech',
  'Remote diagnostic tool for maternal health in rural clinics. Uses AI-powered ultrasound analysis to detect pregnancy complications early. Works offline and syncs when connected. Deployed in 15 clinics across 3 counties, serving 2,000+ expectant mothers.',
  '[
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=500&fit=crop"
  ]'
),
(
  'E-Boda',
  'James Kiprop',
  'Incubating',
  55,
  'Technology',
  'Affordable electric bike conversion kits for urban logistics. Converts traditional boda bodas (motorcycle taxis) to electric, reducing fuel costs by 70%. Includes swappable battery stations across Nairobi. 100+ boda boda riders signed up for pilot.',
  '[
    "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=500&fit=crop"
  ]'
),
(
  'SolarStream',
  'Nancy Wambui',
  'Ideation',
  15,
  'Social Impact',
  'Micro-utility platform for pay-as-you-go solar irrigation pumps. Smallholder farmers can access solar-powered water pumps with daily micro-payments via M-Pesa. No upfront cost. Targets 10,000 farmers in water-scarce regions across Kenya.',
  '[]'
),
(
  'ElimuCloud',
  'Peter Kamau',
  'MVP Live',
  75,
  'Education',
  'Gamified curriculum delivery platform designed for low-bandwidth environments. Works offline and syncs via SMS when internet is unavailable. Used by 50+ secondary schools across Kenya, reaching 20,000+ students. Features AI-powered personalized learning paths.',
  '[
    "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&h=500&fit=crop"
  ]'
);

-- ===== BLOG POSTS =====

DELETE FROM blog_posts WHERE title LIKE 'IEC JKUAT Launches%' OR title LIKE 'Student Spotlight%' OR title LIKE 'Recap%';

INSERT INTO blog_posts (title, content, author, category, image_url, published_at) VALUES
(
  'IEC JKUAT Launches 2026 Venture Pulse Program with Record Funding',
  'The Innovation & Entrepreneurship Club at JKUAT is proud to announce the launch of our 2026 Venture Pulse program — our most ambitious year yet. This year, we are introducing three new tracks: Fintech Innovation, AgTech Solutions, and HealthTech Disruption. Each track offers hands-on workshops, mentorship from industry experts, and the opportunity to pitch for seed funding at our annual Pitch Night.

The 2026 program comes with a record KES 2M in total prize money, thanks to partnerships with Safaricom, Equity Bank, and the Kenyan Ministry of ICT.

"Our goal is to bridge the gap between academic research and commercial viability," said Dr. James Ochieng, Club Patron. "With over 40 active projects and 15 startups already founded, the IEC ecosystem continues to grow. We invite all JKUAT students to join us in making 2026 our most impactful year yet."

Key dates for the program:
- Track Registration: Open now
- Weekly Workshops: Every Wednesday at 3 PM
- Mid-Semester Demo Day: September 2026
- Annual Pitch Night: October 15, 2026',
  'IEC JKUAT Editorial',
  'News',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=500&fit=crop',
  '2026-06-15'
),
(
  'Student Spotlight: How Eco-Irrigate is Transforming Kenyan Agriculture',
  'When Cyrus Wanyonyi noticed smallholder farmers in his hometown struggling with water scarcity, he knew technology could help. Alongside a team of fellow JKUAT engineering students, he founded Eco-Irrigate — an AI-powered precision farming solution that uses low-cost soil moisture sensors and satellite data to automate irrigation.

"The system reduces water waste by 40% and increases crop yields by nearly double," says Cyrus, a final-year Electrical Engineering student. "We tested it on 50 farms in Kiambu County and the results were remarkable."

The project, incubated under IEC JKUAT''s Venture Pulse program, has already attracted interest from the Ministry of Agriculture and several agri-tech investors. The team is now working on scaling the solution across Kenya and eventually the entire East African region.

Cyrus shares his advice for fellow students: "Don''t wait until graduation to start. IEC gave us the mentorship, network, and resources to turn our idea into reality. Just start."',
  'IEC JKUAT Editorial',
  'Spotlight',
  'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&h=500&fit=crop',
  '2026-06-10'
),
(
  'Recap: Code-X Hackathon 2026 Draws Record Participation from 14 Universities',
  'Over 120 students from 14 universities across Kenya gathered at JKUAT for the annual Code-X Hackathon, making it our largest turnout yet. The 48-hour coding marathon challenged participants to build solutions for cross-border payment challenges faced by SME merchants in East Africa.

Teams competed in three categories: mobile payments, blockchain-based settlements, and AI-powered fraud detection. The winning team, "SwiftPay", walked away with KES 200,000 in seed funding and a three-month incubation slot at the IEC Venture Lab.

"The energy was incredible," said Dr. Kevin Onyango, Dean of COETEC and chief judge. "The quality of solutions we saw this year was outstanding. Kenya''s tech future is in good hands."

A photo gallery from the event is available below. We thank all participants, judges, sponsors, and volunteers who made this event possible.',
  'Events Team',
  'Events',
  'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&h=500&fit=crop',
  '2026-05-28'
);

-- ===== SAMPLE EVENT COMMENTS =====

-- Comments reference the first event (Pitch Night) by its title
-- Run these AFTER the events INSERT above
DO $$
DECLARE
  pitch_event_id UUID;
BEGIN
  SELECT id INTO pitch_event_id FROM events WHERE title = 'Annual Startup Pitch Night 2026' LIMIT 1;
  
  IF pitch_event_id IS NOT NULL THEN
    INSERT INTO event_comments (event_id, author_name, content, created_at) VALUES
      (pitch_event_id, 'Grace Wanjiku', 'Can''t wait for this! My team has been preparing for months. The prize money this year is incredible!', '2026-09-01 10:30:00+03'),
      (pitch_event_id, 'Peter Kamau', 'Will there be recordings available for those who can''t attend in person?', '2026-09-02 14:15:00+03'),
      (pitch_event_id, 'Dr. James Ochieng', '@Peter Kamau Yes! The entire event will be live-streamed and recordings will be available on our YouTube channel within 48 hours.', '2026-09-02 16:00:00+03'),
      (pitch_event_id, 'Sarah Muthoni', 'I attended last year as a spectator and it was amazing. This year I''ll be pitching! So nervous but excited.', '2026-09-05 09:45:00+03'),
      (pitch_event_id, 'Kevin Omolo', 'Good luck to all the teams! The mentorship from IEC has been invaluable for our journey.', '2026-09-10 11:20:00+03');
  END IF;
END $$;
