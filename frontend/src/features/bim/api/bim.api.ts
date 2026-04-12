import apiClient from '../../../shared/api/axios.client';
import { BIMModelsResponse, BIMDownloadUrlResponse } from '../types/bim.types';

export const bimApi = {
  getModels: (projectId: string) =>
    apiClient
      .get<BIMModelsResponse>(`/bim/projects/${projectId}/models`)
      .then((r) => r.data),

  getDownloadUrl: (modelId: string) =>
    apiClient
      .get<BIMDownloadUrlResponse>(`/bim/models/${modelId}/download`)
      .then((r) => r.data),
};
