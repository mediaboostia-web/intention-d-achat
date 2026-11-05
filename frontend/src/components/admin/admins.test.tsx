import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { html, text } from '@/components/ui/test-html';
import type { AdminRow } from '@/lib/tamani/admin-team';
import { AdminsSection } from './AdminsSection';

vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);

const TEAM: AdminRow[] = [
  {
    id: 's_1',
    email: 'moi@test.local',
    name: 'Moi',
    role: 'SUPERADMIN',
    createdAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'a_2',
    email: 'fatou@test.local',
    name: null,
    role: 'ADMIN',
    createdAt: '2026-11-02T08:00:00.000Z',
  },
];

const rowOf = (out: string, email: string) => {
  const items = out.match(/<li[ >][\s\S]*?<\/li>/g) ?? [];
  return items.find((li) => li.includes(email)) ?? '';
};

describe('AdminsSection', () => {
  it('lists each admin with the role and the date the account was opened', () => {
    const t = text(<AdminsSection admins={TEAM} viewerId="s_1" canEdit={false} />);
    expect(t).toContain('2 admins');
    expect(t).toContain('moi@test.local');
    expect(t).toContain('Super-admin');
    expect(t).toContain('fatou@test.local');
    expect(t).toContain('Admin');
    // The back-office's short date (lib/tamani/admin-view).
    expect(t).toContain('2 nov. 2026');
  });

  it('gives a super-admin the add form and « Retirer » on every row but its own', () => {
    const out = html(<AdminsSection admins={TEAM} viewerId="s_1" canEdit />);
    expect(out).toContain('id="add-admin"');
    expect(rowOf(out, 'fatou@test.local')).toContain('Retirer');
    const mine = rowOf(out, 'moi@test.local');
    expect(mine).not.toContain('Retirer');
    expect(text(<div dangerouslySetInnerHTML={{ __html: mine }} />)).toContain("C'est toi");
  });

  it('shows an admin the team with no button', () => {
    const out = html(<AdminsSection admins={TEAM} viewerId="a_2" canEdit={false} />);
    expect(out).not.toContain('<button');
    expect(out).not.toContain('<form');
  });

  it('asks for the confirmation in the page, never with the browser dialog', () => {
    for (const file of ['./AdminRoleControl.tsx', './AddAdminForm.tsx']) {
      const src = readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8');
      expect(src, file).not.toMatch(/\bconfirm\(|window\.confirm|alert\(/);
    }
  });
});
