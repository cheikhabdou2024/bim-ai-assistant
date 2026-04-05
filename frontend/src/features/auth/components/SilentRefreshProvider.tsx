import { useEffect, ReactNode } from 'react';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';

interface Props { children: ReactNode }

export function SilentRefreshProvider({ children }: Props) {
  const { setAuth, setAccessToken, setInitialized } = useAuthStore();

  useEffect(() => {
    authApi.refresh()
      .then(async ({ accessToken }) => {
        // Set token in store BEFORE calling /users/me so the request
        // interceptor attaches it (prevents 401 → retry loop)
        setAccessToken(accessToken);
        const user = await authApi.me();
        setAuth(user, accessToken);
      })
      .catch(() => {
        // Not authenticated — that's fine
      })
      .finally(() => {
        setInitialized();
      });
  }, [setAuth, setAccessToken, setInitialized]);

  return <>{children}</>;
}
