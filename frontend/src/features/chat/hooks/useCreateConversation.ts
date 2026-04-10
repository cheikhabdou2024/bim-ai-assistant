import { useMutation, useQueryClient } from '@tanstack/react-query';
import { conversationsApi } from '../api/chat.api';

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => conversationsApi.create(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
