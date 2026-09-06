// site/js/main.js — Shared page initialization for all IEC JKUAT pages.
//
// NOTE: the old header-shadow behavior was removed — it queried
// `header`/`nav.fixed`, but every page uses `nav#nav` with its own
// scroll listener, so it never fired anywhere. Each page owns its
// nav behavior inline; this file remains as the shared entry point
// for future cross-page initialization.

document.addEventListener('DOMContentLoaded', () => {
  // Reserved for shared init (currently nothing global to run).
});
