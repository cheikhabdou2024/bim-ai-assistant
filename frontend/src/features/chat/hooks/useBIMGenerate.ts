import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { bimApi } from '../api/bim.api';
import { BIMData } from '../types/chat.types';

/**
 * Mutation hook for IFC generation.
 *
 * Retry strategy (ADR-012):
 *  - 429 Rate limit    → no retry (user must wait)
 *  - 4xx client errors → no retry (bad request)
 *  - 502 / 503         → 1 automatic retry after 3s (ECS cold start, bim-service CPU spike)
 *  - Network error     → 1 automatic retry after 3s
 */
export function useBIMGenerate() {
  return useMutation({
    mutationFn: (bimData: BIMData) => bimApi.generate(bimData),

    retry: (failureCount, error) => {
      const status = (error as AxiosError)?.response?.status;
      // Hard-fail on any 4xx (including 429 rate limit)
      if (status && status >= 400 && status < 500) return false;
      // One automatic retry for server-side / network failures
      return failureCount < 1;
    },

    retryDelay: 3_000, // wait 3s before retrying
  });
}
