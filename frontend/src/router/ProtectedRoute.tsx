import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/auth.store';
import { Spinner } from '../shared/components/ui/Spinner';

interface Props { children: React.ReactNode }

export function ProtectedRoute({ children }: Props) {
  const { user, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8 text-primary-500" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
