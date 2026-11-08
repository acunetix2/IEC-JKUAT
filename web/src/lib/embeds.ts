// IEC JKUAT — Embed Utility (pure functions; no escapeHtml — JSX auto-escapes)
// Detects and normalises YouTube, Instagram, Twitter/X, Facebook, TikTok and
// generic iframe URLs stored in the database or entered in admin forms.

export type EmbedType = 'youtube' | 'instagram' | 'twitter' | 'facebook' | 'tiktok' | 'iframe';

// ===== URL DETECTION =====

export function detectEmbedType(url: string): EmbedType | null {
  if (!url || typeof url !== 'string') return null;
  url = url.trim();

  // YouTube — watch, short, embed, youtu.be
  if (/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)/.test(url)) return 'youtube';

  // Instagram — post, reel, TV
  if (/instagram\.com\/(?:p|reel|tv)\//.test(url)) return 'instagram';

  // Twitter / X — /status/
  if (/(?:twitter\.com|x\.com)\/.+\/status\//.test(url)) return 'twitter';

  // Facebook — video or post
  if (/facebook\.com\//.test(url)) return 'facebook';

  // TikTok
  if (/tiktok\.com\/@.+\/video\//.test(url)) return 'tiktok';

  // Generic iframe-safe URL (http/https)
  if (/^https?:\/\//.test(url)) return 'iframe';

  return null;
}

// ===== URL NORMALISATION =====

export function normaliseEmbedUrl(url: string, type: EmbedType): string {
  url = url.trim();

  if (type === 'youtube') {
    // Extract video ID from any YouTube URL format
    const match = url.match(
      /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
    );
    if (match) return `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1`;
  }

  if (type === 'instagram') {
    // Strip trailing slash, add /embed/
    return url.replace(/\/$/, '') + '/embed/';
  }

  if (type === 'facebook') {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`;
  }

  if (type === 'tiktok') {
    const match = url.match(/video\/(\d+)/);
    if (match) return `https://www.tiktok.com/embed/${match[1]}`;
  }

  // Twitter and generic return the original URL
  return url;
}

/**
 * parseEmbedUrls(raw)
 * Safely parses a JSON string or array of embed URLs stored in the database.
 */
export function parseEmbedUrls(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      // Treat as a single URL string
      return raw.trim() ? [raw.trim()] : [];
    }
  }
  return [];
}
