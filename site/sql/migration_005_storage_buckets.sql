-- ================================================
-- IEC JKUAT — Migration 005: Storage Buckets
-- Run this in Supabase SQL Editor
-- Creates buckets for image/video uploads
-- ================================================

-- ===== 1. Create Storage Buckets =====
-- Bucket: project-media (project images/videos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-media',
  'project-media',
  true,
  52428800, -- 50MB max
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket: event-media (event images/videos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-media',
  'event-media',
  true,
  52428800,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket: blog-media (blog post images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog-media',
  'blog-media',
  true,
  10485760, -- 10MB max for blog images
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket: product-images (merchandise product images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ===== 2. Storage RLS Policies =====

-- Allow public/anonymous SELECT on all buckets
CREATE POLICY "Allow public read project-media"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'project-media');

CREATE POLICY "Allow public read event-media"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'event-media');

CREATE POLICY "Allow public read blog-media"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'blog-media');

CREATE POLICY "Allow public read product-images"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'product-images');

-- Allow service_role (admin) full access to all buckets
CREATE POLICY "Allow service_role all project-media"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'project-media')
WITH CHECK (bucket_id = 'project-media');

CREATE POLICY "Allow service_role all event-media"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'event-media')
WITH CHECK (bucket_id = 'event-media');

CREATE POLICY "Allow service_role all blog-media"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'blog-media')
WITH CHECK (bucket_id = 'blog-media');

CREATE POLICY "Allow service_role all product-images"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');
