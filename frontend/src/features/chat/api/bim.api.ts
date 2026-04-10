import apiClient from '../../../shared/api/axios.client';
import { BIMData, BIMGenerateResponse, BIMValidateResponse } from '../types/chat.types';

export const bimApi = {
  /**
   * Validate a BIM JSON structure via the NestJS proxy → bim-service/validate.
   * Returns { valid, errors }.
   */
  validate: (bimData: BIMData) =>
    apiClient
      .post<BIMValidateResponse>('/bim/validate', { bimData })
      .then((r) => r.data),

  /**
   * Generate an IFC file from validated BIM data via NestJS proxy → bim-service/generate.
   * Returns { s3Key, downloadUrl } (presigned URL, 1h expiry).
   * ADR-011: bimData is already persisted in DB before this is called.
   */
  generate: (bimData: BIMData) =>
    apiClient
      .post<BIMGenerateResponse>('/bim/generate', { bimData })
      .then((r) => r.data),
};
