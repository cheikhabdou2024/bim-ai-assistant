import { useQuery } from '@tanstack/react-query';
import { bimApi } from '../api/bim.api';

export function useBIMModels(projectId: string | null) {
  return useQuery({
    queryKey: ['bim-models', projectId],
    queryFn: () => bimApi.getModels(projectId!),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}
