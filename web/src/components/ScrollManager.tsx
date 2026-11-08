// IEC JKUAT — scroll position on client-side navigation.
// The old multi-page site started every page at the top and let the browser
// jump to #anchors (e.g. /index.html#join). React Router does neither, so:
//   - a link with a hash (/#join) scrolls to that element once it renders;
//   - any other PUSH/REPLACE navigation starts at the top;
//   - back/forward (POP) without a hash is left to the browser's own
//     scroll restoration.

import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

export default function ScrollManager() {
  const { pathname, search, hash } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    if (hash) {
      const id = decodeURIComponent(hash.slice(1));
      let tries = 0;
      let timer = 0;
      // The target may not exist until the new route's first render
      // commits; retry briefly instead of assuming it is already there.
      const tick = () => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (tries++ < 20) {
          timer = window.setTimeout(tick, 50);
        }
      };
      timer = window.setTimeout(tick, 0);
      return () => window.clearTimeout(timer);
    }
    if (navType !== 'POP') window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, search, hash, navType]);

  return null;
}
