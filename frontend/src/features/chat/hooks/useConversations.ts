import { useQuery } from '@tanstack/react-query';
import { conversationsApi } from '../api/chat.api';

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => conversationsApi.getAll(),
    staleTime: 30_000,
  });
}
