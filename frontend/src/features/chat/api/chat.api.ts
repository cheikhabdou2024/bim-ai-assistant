import { useAuthStore } from '../../auth/store/auth.store';
import {
  Conversation,
  ConversationWithMessages,
  SendMessageDto,
} from '../types/chat.types';

const BASE_URL = '/api';

function getAuthHeaders(): HeadersInit {
  const token = useAuthStore.getState().accessToken;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Stream a chat message using fetch() + ReadableStream (ADR-010).
 * Returns the raw ReadableStream from the SSE response body.
 * Caller must read and parse 'data: {...}\n\n' format.
 */
export async function streamMessage(
  dto: SendMessageDto,
  signal?: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(`${BASE_URL}/chat/stream`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
    signal,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erreur réseau' }));
    throw new Error(error.message ?? `HTTP ${response.status}`);
  }

  if (!response.body) {
    throw new Error('Pas de corps de réponse SSE');
  }

  return response.body;
}

// ── REST endpoints (axios not needed — simple fetch) ──────────────────────────

export const conversationsApi = {
  getAll: async (): Promise<Conversation[]> => {
    const res = await fetch(`${BASE_URL}/conversations`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Erreur chargement conversations');
    return res.json();
  },

  getOne: async (id: string): Promise<ConversationWithMessages> => {
    const res = await fetch(`${BASE_URL}/conversations/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Conversation introuvable');
    return res.json();
  },

  create: async (): Promise<Conversation> => {
    const res = await fetch(`${BASE_URL}/conversations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error('Erreur création conversation');
    return res.json();
  },

  remove: async (id: string): Promise<void> => {
    const res = await fetch(`${BASE_URL}/conversations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Erreur suppression conversation');
  },
};
