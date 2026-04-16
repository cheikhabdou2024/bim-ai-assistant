import { useCallback, useState } from 'react';
import { bimApi } from '../api/bim.api';

export interface IFCViewerState {
  isLoading: boolean
  error: string | null
  modelUrl: string | null
  modelId: string | null
}

export function useIFCViewer() {
  const [state, setState] = useState<IFCViewerState>({
    isLoading: false,
    error: null,
    modelUrl: null,
    modelId: null,
  });

  const openModel = useCallback(async (modelId: string): Promise<string | null> => {
    setState({ isLoading: true, error: null, modelUrl: null, modelId });
    try {
      const { url } = await bimApi.getDownloadUrl(modelId);
      setState({ isLoading: false, error: null, modelUrl: url, modelId });
      return url;
    } catch {
      setState({ isLoading: false, error: 'Impossible de charger le modèle BIM', modelUrl: null, modelId });
      return null;
    }
  }, []);

  const closeViewer = useCallback(() => {
    setState({ isLoading: false, error: null, modelUrl: null, modelId: null });
  }, []);

  return { ...state, openModel, closeViewer };
}
