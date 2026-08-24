import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Shell from '@/components/Shell';
import type { RoleKey } from '@locaos/domain/permissions';

interface Me {
  user: { fullName: string };
  active?: { agencyName: string; role: RoleKey };
}

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  let me: Me;
  try {
    me = await apiFetch<Me>('/api/auth/me');
  } catch {
    redirect('/login');
  }

  return (
    <Shell
      user={me.user.fullName}
      agency={me.active?.agencyName ?? ''}
      role={me.active?.role ?? 'agent'}
    >
      {children}
    </Shell>
  );
}
