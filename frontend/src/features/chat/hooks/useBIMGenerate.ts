import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { bimApi } from '../api/bim.api';
import { BIMData } from '../types/chat.types';

/**
 * Custom error thrown when bim-service rejects the payload (Pydantic 422).
 * Distinct from AxiosError so classifyError can handle it cleanly.
 */
export class BIMValidationError extends Error {
  readonly errors: string[];
  constructor(errors: string[]) {
    super('BIM validation failed');
    this.name = 'BIMValidationError';
    this.errors = errors;
  }
}

/**
 * Mutation hook for IFC generation.
 *
 * Flow:
 *   1. POST /bim/validate  → fast schema check (Pydantic 422 before 35s generation)
 *   2. POST /bim/generate  → IFC build + S3 upload
 *
 * Retry strategy (ADR-012):
 *   - BIMValidationError → no retry (bad AI data — user must re-prompt)
 *   - 429 Rate limit      → no retry
 *   - Other 4xx           → no retry
 *   - 502 / 503 / network → 1 automatic retry after 3s (ECS cold start, bim-service spike)
 */
export function useBIMGenerate() {
  return useMutation({
    mutationFn: async (bimData: BIMData) => {
      // ── Step 1: validate ─────────────────────────────────────────────────
      // Catches out-of-range values (height > 20, width > 500, etc.) before
      // wasting 35 seconds on a doomed generation request.
      const validation = await bimApi.validate(bimData);
      if (!validation.valid) {
        throw new BIMValidationError(validation.errors);
      }

      // ── Step 2: generate ─────────────────────────────────────────────────
      return bimApi.generate(bimData);
    },

    retry: (failureCount, error) => {
      // Never retry validation errors or client errors
      if (error instanceof BIMValidationError) return false;
      const status = (error as AxiosError)?.response?.status;
      if (status && status >= 400 && status < 500) return false;
      // One auto-retry for server-side / network failures
      return failureCount < 1;
    },

    retryDelay: 3_000,
  });
}
