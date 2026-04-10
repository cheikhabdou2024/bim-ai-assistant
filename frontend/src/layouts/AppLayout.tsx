import { ReactNode, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/auth.store';
import { useLogout } from '../features/auth/hooks/useLogout';
import { Button } from '../shared/components/ui/Button';

interface AppLayoutProps { children: ReactNode }

export function AppLayout({ children }: AppLayoutProps) {
  const user = useAuthStore((s) => s.user);
  const { mutate: logout, isPending } = useLogout();
  const handleLogout = useCallback(() => logout(), [logout]);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link to="/dashboard" className="font-display text-xl font-bold text-primary-500">
            BIM AI
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/dashboard"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              Projets
            </Link>
            <Link
              to="/chat"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              Chat IA 🤖
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <Button variant="ghost" size="sm" loading={isPending} onClick={handleLogout}>
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
