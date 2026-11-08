// IEC JKUAT — public layout route. Stubbed to just render nested routes for
// now; Nav / Footer / MobileMenu + shared hooks arrive in a later feature.

import { Outlet } from 'react-router-dom';

export default function SiteLayout() {
  return <Outlet />;
}
