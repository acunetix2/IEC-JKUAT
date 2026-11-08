// IEC JKUAT — Supabase Storage Utilities
// Handles file uploads to Supabase Storage buckets.
// Buckets: project-media, event-media, blog-media, product-images

import { supabase } from './supabase';

export const STORAGE_BUCKETS = {
  project: 'project-media',
  event: 'event-media',
  blog: 'blog-media',
  product: 'product-images',
} as const;

// Upload a file to a storage bucket. Returns the public URL of the uploaded file.
const ALLOWED_MIME_TYPES = new Set<string>([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

export async function uploadMedia(file: File, bucket: string, folder = ''): Promise<string> {
  // Validate MIME type first (SVG/HTML/etc. are never valid uploads —
  // they can carry executable script when served from storage).
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error(`Unsupported file type: ${file.type || 'unknown'}. Upload JPG, PNG, GIF, WebP, MP4 or WebM.`);
  }

  // Validate file size (50MB max for media, 10MB for images)
  const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(`File too large. Max ${file.type.startsWith('video/') ? '50MB' : '10MB'} for ${file.type.split('/')[0]}s.`);
  }

  // Generate unique filename (extension sanitized: no path separators,
  // no whitespace — prevents path games via crafted filenames)
  const ext = (file.name.split('.').pop() || '').replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'bin';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const fileName = `${folder ? folder + '/' : ''}${timestamp}_${random}.${ext}`;

  const { data, error } = await supabase.storage.from(bucket).upload(fileName, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw error;

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(data.path);

  return publicUrl;
}

// Check if a URL is a video
export function isVideoUrl(url: string): boolean {
  if (!url) return false;
  const ext = url.split('.').pop()?.toLowerCase();
  return ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext || '');
}

// Check if a URL is an image
export function isImageUrl(url: string): boolean {
  if (!url) return false;
  const ext = url.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '');
}
