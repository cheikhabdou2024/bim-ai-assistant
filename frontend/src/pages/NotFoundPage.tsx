import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      {/* Illustration */}
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-blue-50">
        <svg className="h-12 w-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      {/* Code */}
      <p className="mb-2 text-6xl font-extrabold text-blue-600">404</p>

      {/* Title */}
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Page introuvable</h1>
      <p className="mb-8 max-w-sm text-sm text-gray-500">
        Cette page n'existe pas ou a été déplacée.
        Retournez au tableau de bord pour continuer.
      </p>

      {/* Actions */}
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Tableau de bord
        </Link>
        <Link
          to="/chat"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        >
          Chat IA
        </Link>
      </div>

      {/* Brand */}
      <p className="mt-12 text-xs text-gray-300">BIM AI Assistant</p>
    </div>
  );
}
