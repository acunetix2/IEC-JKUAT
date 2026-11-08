// IEC JKUAT — single social/media embed.
// Mirrors renderEmbed() from embeds.js, but returns JSX: the src/href from
// normaliseEmbedUrl are set as JSX attributes (no escapeHtml — JSX escapes).
// Container classes and inline min-heights are preserved so the ported light
// CSS (which keys on embed-* / aspect-video) resolves identically.

import { useEffect } from 'react';
import { detectEmbedType, normaliseEmbedUrl } from '../lib/embeds';

declare global {
  interface Window {
    twttr?: { widgets?: { load: () => void } };
  }
}

const TWITTER_SCRIPT_SRC = 'https://platform.twitter.com/widgets.js';

export default function Embed({ url }: { url: string }) {
  const type = url ? detectEmbedType(url) : null;

  // Twitter needs widgets.js loaded exactly once; on mount (and on later
  // tweet mounts) ask an already-present widgets runtime to re-scan. The tag
  // is left in the DOM across unmounts.
  useEffect(() => {
    if (type !== 'twitter') return;

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${TWITTER_SCRIPT_SRC}"]`);
    if (existing) {
      if (window.twttr?.widgets) window.twttr.widgets.load();
      return;
    }

    const script = document.createElement('script');
    script.src = TWITTER_SCRIPT_SRC;
    script.async = true;
    script.charset = 'utf-8';
    document.body.appendChild(script);
  }, [type, url]);

  if (!type) return null;

  if (type === 'twitter') {
    return (
      <div className="embed-twitter rounded-2xl overflow-hidden bg-surface-container-low p-4">
        <blockquote className="twitter-tweet" data-dnt="true">
          <a href={url}></a>
        </blockquote>
      </div>
    );
  }

  if (type === 'instagram') {
    return (
      <div className="embed-instagram rounded-2xl overflow-hidden bg-surface-container-low">
        <iframe
          src={normaliseEmbedUrl(url, type)}
          className="w-full"
          style={{ minHeight: '480px', border: 'none' }}
          scrolling="no"
          allow="encrypted-media"
          loading="lazy"
          title="Instagram post"
        ></iframe>
      </div>
    );
  }

  // YouTube, Facebook, TikTok, generic iframe
  const embedSrc = normaliseEmbedUrl(url, type);
  const isVideo = type === 'youtube' || type === 'facebook' || type === 'tiktok';
  const aspectClass = isVideo ? 'aspect-video' : 'min-h-[400px]';

  return (
    <div className={`embed-${type} rounded-2xl overflow-hidden bg-black ${aspectClass}`}>
      <iframe
        src={embedSrc}
        className="w-full h-full"
        style={isVideo ? { border: 'none' } : { minHeight: '400px', border: 'none' }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        title={`${type} embed`}
      ></iframe>
    </div>
  );
}
