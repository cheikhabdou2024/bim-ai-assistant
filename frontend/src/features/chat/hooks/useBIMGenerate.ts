import { useMutation } from '@tanstack/react-query';
import { bimApi } from '../api/bim.api';
import { BIMData } from '../types/chat.types';

export function useBIMGenerate() {
  return useMutation({
    mutationFn: (bimData: BIMData) => bimApi.generate(bimData),
  });
}
