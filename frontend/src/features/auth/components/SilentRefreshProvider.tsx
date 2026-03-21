import { useEffect, ReactNode } from 'react';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';

interface Props { children: ReactNode }

export function SilentRefreshProvider({ children }: Props) {
  const { setAuth, setInitialized } = useAuthStore();

  useEffect(() => {
    authApi.refresh()
      .then(async ({ accessToken }) => {
        const user = await authApi.me();
        setAuth(user, accessToken);
      })
      .catch(() => {
        // Not authenticated — that's fine
      })
      .finally(() => {
        setInitialized();
      });
  }, [setAuth, setInitialized]);

  return <>{children}</>;
}
