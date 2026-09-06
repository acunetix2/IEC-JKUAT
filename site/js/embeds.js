// IEC JKUAT — Embed Utility
// Detects and renders YouTube, Instagram, Twitter/X, Facebook, and generic iframes
// from a URL string entered in admin forms or stored in the database.

// ===== URL DETECTION =====

function detectEmbedType(url) {
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

function normaliseEmbedUrl(url, type) {
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

// ===== RENDER =====

/**
 * renderEmbed(url)
 * Returns an HTML string for the embed, or null if the URL is not embeddable.
 */
function renderEmbed(url) {
  if (!url) return null;
  const type = detectEmbedType(url);
  if (!type) return null;

  if (type === 'twitter') {
    // Twitter oEmbed — rendered via blockquote + script
    return `
      <div class="embed-twitter rounded-2xl overflow-hidden bg-surface-container-low p-4">
        <blockquote class="twitter-tweet" data-dnt="true">
          <a href="${escapeHtml(url)}"></a>
        </blockquote>
        <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"><\/script>
      </div>`;
  }

  if (type === 'instagram') {
    return `
      <div class="embed-instagram rounded-2xl overflow-hidden bg-surface-container-low">
        <iframe src="${escapeHtml(normaliseEmbedUrl(url, type))}"
          class="w-full" style="min-height:480px;border:none;"
          scrolling="no" allowtransparency="true" allow="encrypted-media"
          loading="lazy" title="Instagram post">
        </iframe>
      </div>`;
  }

  // YouTube, Facebook, TikTok, generic iframe
  const embedSrc = normaliseEmbedUrl(url, type);
  const isVideo = ['youtube', 'facebook', 'tiktok'].includes(type);
  const aspectClass = isVideo ? 'aspect-video' : 'min-h-[400px]';

  return `
    <div class="embed-${type} rounded-2xl overflow-hidden bg-black ${aspectClass}">
      <iframe src="${escapeHtml(embedSrc)}"
        class="w-full h-full" style="${isVideo ? '' : 'min-height:400px;'}border:none;"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen loading="lazy"
        title="${type} embed">
      </iframe>
    </div>`;
}

/**
 * renderEmbedList(embedUrls)
 * Takes an array of URL strings and returns rendered HTML for all valid embeds.
 */
function renderEmbedList(embedUrls) {
  if (!Array.isArray(embedUrls) || embedUrls.length === 0) return '';
  const rendered = embedUrls
    .map(url => renderEmbed(url))
    .filter(Boolean);
  if (rendered.length === 0) return '';
  return `<div class="space-y-4">${rendered.join('')}</div>`;
}

// ===== ADMIN PREVIEW =====

/**
 * previewEmbed(inputId, previewContainerId)
 * Called on input blur/change to show a live preview in the admin form.
 */
function previewEmbed(inputId, previewContainerId) {
  const url = document.getElementById(inputId)?.value?.trim();
  const container = document.getElementById(previewContainerId);
  if (!container) return;

  if (!url) {
    container.innerHTML = '';
    container.classList.add('hidden');
    return;
  }

  const html = renderEmbed(url);
  if (html) {
    container.innerHTML = html;
    container.classList.remove('hidden');
  } else {
    container.innerHTML = `<p class="text-xs text-red-400 mt-1">Could not detect embed type. Supported: YouTube, Instagram, Twitter/X, Facebook, TikTok.</p>`;
    container.classList.remove('hidden');
  }
}

// ===== HELPERS =====

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * parseEmbedUrls(raw)
 * Safely parses a JSON string or array of embed URLs stored in the database.
 */
function parseEmbedUrls(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    // Treat as a single URL string
    return raw.trim() ? [raw.trim()] : [];
  }
}
