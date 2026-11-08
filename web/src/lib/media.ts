// IEC JKUAT — media URL helpers shared by list + detail pages.
// Fallbacks kept identical to the source so list thumbnails and detail heroes
// always match.

import { isImageUrl } from './storage';

export const EVENT_FALLBACK_IMG =
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop';
export const PROJECT_FALLBACK_IMG =
  'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&h=600&fit=crop';

// Read a JSONB list column (media_urls, embed_urls, sizes). Accepts a real
// array (seed rows) or a JSON string of an array (rows saved by the old
// admin page). Never throws; anything unparseable reads as [].
export function parseJsonList(raw: unknown): string[] {
  let v: unknown = raw;
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v || '[]');
    } catch {
      return [];
    }
  }
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : [];
}

// Kept for existing callers; same behaviour as parseJsonList.
export const parseMediaUrls = parseJsonList;

const VIDEO_EXT = /\.(mp4|webm|mov|avi|mkv)$/i;

function stripQuery(u: string): string {
  return String(u).split('?')[0].split('#')[0];
}

// media_urls only ever holds uploaded photos/videos (admin upload accepts
// image/* and mp4/webm/quicktime) plus seed URLs. Anything that is not a
// video is a photo. The old site required an image file extension, so
// extension-less Unsplash URLs in the seed data were all skipped and every
// project card showed the same fallback photo.
export function isPreviewImage(u: string): boolean {
  if (!u) return false;
  const clean = stripQuery(u);
  if (VIDEO_EXT.test(clean)) return false;
  return isImageUrl(clean) || !/\.[a-z0-9]{2,5}$/i.test(clean.split('/').pop() || '');
}

export function isVideoMedia(u: string): boolean {
  return Boolean(u) && VIDEO_EXT.test(stripQuery(u));
}
