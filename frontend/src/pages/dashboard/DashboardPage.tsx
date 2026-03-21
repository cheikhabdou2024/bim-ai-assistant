import { useAuthStore } from '../../features/auth/store/auth.store';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-gray-900">
          Bonjour, {user.name}
        </h1>
        <p className="mt-1 text-gray-500">Bienvenue sur votre espace BIM AI</p>
      </div>

      {/* Placeholder Sprint 2 */}
      <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
          <span className="text-3xl">🏗️</span>
        </div>
        <h2 className="font-display text-xl font-semibold text-gray-700">
          Vos projets BIM arrivent bientôt
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          La gestion de projets sera disponible en Sprint 2.
          <br />
          L'IA de génération BIM arrivera en Sprint 3.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <span className="rounded-full bg-secondary-500/10 px-3 py-1 text-xs font-medium text-secondary-500">
            Sprint 1 — Auth ✅
          </span>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-400">
            Sprint 2 — Projects
          </span>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-400">
            Sprint 3 — AI Chat
          </span>
        </div>
      </div>
    </div>
  );
}
