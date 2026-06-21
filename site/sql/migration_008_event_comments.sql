-- ================================================
-- IEC JKUAT — Migration 008: Event Comments
-- Run this in Supabase SQL Editor
-- ================================================

-- Drop if exists
DROP TABLE IF EXISTS event_comments CASCADE;

-- Create comments table
CREATE TABLE IF NOT EXISTS event_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_email TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by event
CREATE INDEX IF NOT EXISTS idx_event_comments_event_id ON event_comments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_comments_created_at ON event_comments(created_at DESC);

-- Enable RLS
ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;

-- Anon can read all comments
CREATE POLICY "Allow anon select event_comments" ON event_comments
  FOR SELECT TO anon USING (true);

-- Anon can insert comments
CREATE POLICY "Allow anon insert event_comments" ON event_comments
  FOR INSERT TO anon WITH CHECK (true);

-- Service role has full access
CREATE POLICY "Allow service_role all event_comments" ON event_comments
  FOR ALL TO service_role USING (true) WITH CHECK (true);
