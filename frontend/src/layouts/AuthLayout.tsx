import { ReactNode } from 'react';

interface AuthLayoutProps { children: ReactNode; title: string; subtitle?: string }

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500">
            <span className="text-2xl font-bold text-white">B</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
          {children}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          BIM AI Assistant — &copy; 2026
        </p>
      </div>
    </div>
  );
}
