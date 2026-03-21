import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './shared/lib/query-client';
import { SilentRefreshProvider } from './features/auth/components/SilentRefreshProvider';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import { router } from './router';

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SilentRefreshProvider>
          <RouterProvider router={router} />
        </SilentRefreshProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
