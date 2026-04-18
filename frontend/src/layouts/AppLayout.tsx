import { ReactNode, useCallback, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/auth.store';
import { useLogout } from '../features/auth/hooks/useLogout';
import { Button } from '../shared/components/ui/Button';
import { PageTransition } from '../shared/components/PageTransition';

interface AppLayoutProps { children: ReactNode }

export function AppLayout({ children }: AppLayoutProps) {
  const user        = useAuthStore((s) => s.user);
  const location    = useLocation();
  const { mutate: logout, isPending } = useLogout();
  const handleLogout = useCallback(() => logout(), [logout]);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { to: '/dashboard', label: 'Projets' },
    { to: '/chat',      label: 'Chat IA' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">

          {/* Logo */}
          <Link to="/dashboard" className="font-display text-xl font-bold text-primary-500">
            BIM AI
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors
                  ${location.pathname === to
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-600 sm:block">{user?.name}</span>
            <Button
              variant="ghost"
              size="sm"
              loading={isPending}
              onClick={handleLogout}
              className="hidden sm:inline-flex"
            >
              Déconnexion
            </Button>

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 md:hidden"
              aria-label="Menu"
            >
              {mobileOpen
                ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )
                : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )
              }
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileOpen && (
          <div className="border-t border-gray-100 bg-white px-4 pb-4 md:hidden">
            <div className="mb-3 flex flex-col gap-1 pt-2">
              {navLinks.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors
                    ${location.pathname === to
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  {label}
                </Link>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <span className="text-sm text-gray-500">{user?.name}</span>
              <Button variant="ghost" size="sm" loading={isPending} onClick={handleLogout}>
                Déconnexion
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:py-8">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
