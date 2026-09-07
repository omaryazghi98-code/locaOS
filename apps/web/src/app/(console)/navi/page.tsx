import { apiFetch } from '@/lib/api';
import { NaviCommandCenter } from '@/components/navi/NaviCommandCenter';
import type { RoleKey } from '@locaos/domain/permissions';

interface Me { user: { fullName: string }; active?: { agencyName: string; role: RoleKey } }

export const metadata = { title: 'NAVI — locaOS' };

/**
 * NAVI command center. Lives inside the console shell so auth, role-filtered navigation,
 * language and density behave exactly like every other console page.
 * Data is loaded client-side from the existing operational endpoints (see lib/navi/useNaviData).
 */
export default async function NaviPage() {
  const me = await apiFetch<Me>('/api/auth/me');
  return <NaviCommandCenter userName={me.user.fullName} agency={me.active?.agencyName ?? ''} />;
}
