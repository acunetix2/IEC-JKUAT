// IEC JKUAT — media URL helpers shared by list + detail pages.
// Fallbacks kept identical to the source so list thumbnails and detail heroes
// always match.

import { isImageUrl } from './storage';

export const EVENT_FALLBACK_IMG =
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop';
export const PROJECT_FALLBACK_IMG =
  'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&h=600&fit=crop';

// Parse a JSON string or array of media URLs stored in the database.
export function parseMediaUrls(raw: unknown): string[] {
  try {
    if (Array.isArray(raw)) return raw as string[];
    if (typeof raw === 'string') return JSON.parse(raw || '[]');
  } catch {
    /* ignore malformed JSON */
  }
  return [];
}

// Extension check that tolerates ?query and #hash suffixes (Unsplash /
// Supabase signed URLs).
export function isPreviewImage(u: string): boolean {
  if (!u) return false;
  const clean = String(u).split('?')[0].split('#')[0];
  try {
    return isImageUrl(clean);
  } catch {
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(clean);
  }
}
