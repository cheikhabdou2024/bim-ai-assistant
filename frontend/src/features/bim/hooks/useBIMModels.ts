import { useQuery } from '@tanstack/react-query';
import { bimApi } from '../api/bim.api';

export function useBIMModels() {
  return useQuery({
    queryKey: ['bim-models'],
    queryFn: () => bimApi.getModels(),
    staleTime: 30_000,
  });
}
