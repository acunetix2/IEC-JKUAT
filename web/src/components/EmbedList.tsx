// IEC JKUAT — list of embeds.
// Mirrors renderEmbedList(): maps each URL through <Embed>, drops the
// non-embeddable ones, and wraps the survivors in a space-y-4 stack.

import { detectEmbedType } from '../lib/embeds';
import Embed from './Embed';

export default function EmbedList({ urls }: { urls: string[] }) {
  if (!Array.isArray(urls) || urls.length === 0) return null;

  const embeddable = urls.filter((url) => url && detectEmbedType(url));
  if (embeddable.length === 0) return null;

  return (
    <div className="space-y-4">
      {embeddable.map((url, i) => (
        <Embed key={`${i}-${url}`} url={url} />
      ))}
    </div>
  );
}
