// Opt-in stand-in for next/navigation in component tests.
//
// Usage (at module level of a test file):
//   vi.mock('next/navigation', async () => (await import('@/test-utils/next-navigation')).navigation);
//   const { replace } = mockNextNavigation({ pathname: '/login', search: 'next=%2Fapp' });
//
// Each mockNextNavigation() call sets the URL the hooks read and returns
// fresh push/replace spies.
import { vi } from 'vitest';

const state = {
  pathname: '/',
  search: '',
  push: vi.fn(),
  replace: vi.fn(),
};

export const navigation = {
  usePathname: () => state.pathname,
  useSearchParams: () => new URLSearchParams(state.search),
  useRouter: () => ({
    push: state.push,
    replace: state.replace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  },
};

export function mockNextNavigation({
  pathname = '/',
  search = '',
}: { pathname?: string; search?: string } = {}) {
  state.pathname = pathname;
  state.search = search;
  state.push = vi.fn();
  state.replace = vi.fn();
  return { push: state.push, replace: state.replace };
}
