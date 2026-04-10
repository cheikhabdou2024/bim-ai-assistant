import { useState, useRef, useCallback } from 'react';
import { streamMessage } from '../api/chat.api';
import { BIMData, SendMessageDto } from '../types/chat.types';

interface StreamChatState {
  streaming: boolean;
  content: string;
  bimDetected: boolean;
  bimData: BIMData | null;
  error: string | null;
}

const initialState: StreamChatState = {
  streaming: false,
  content: '',
  bimDetected: false,
  bimData: null,
  error: null,
};

/**
 * Reads SSE chunks from ReadableStream and accumulates content.
 *
 * Format: 'data: {"chunk":"..."}\n\n' or 'data: [DONE]\n\n'
 *
 * Tech Lead Dev review point #2: buffers partial chunks to handle
 * network fragmentation (a 'data:' line may arrive split across 2 TCP packets).
 */
async function* readSSEStream(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Split on double newline — each SSE event ends with \n\n
      const parts = buffer.split('\n\n');
      // Last part may be incomplete — keep it in buffer
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith('data:')) continue;

        const data = line.slice(5).trim();
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data) as { chunk?: string; error?: string };
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.chunk) yield parsed.chunk;
        } catch (e) {
          if (e instanceof Error && e.message !== '') throw e;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function extractBIMJson(content: string): BIMData | null {
  const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1].trim());
    if (parsed?.type === 'building') return parsed as BIMData;
  } catch {
    // not valid JSON — ignore
  }
  return null;
}

export function useStreamChat() {
  const [state, setState] = useState<StreamChatState>(initialState);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async (dto: SendMessageDto): Promise<string> => {
    // Cancel any in-progress stream
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState({ streaming: true, content: '', bimDetected: false, bimData: null, error: null });

    let fullContent = '';

    try {
      const stream = await streamMessage(dto, abortRef.current.signal);

      for await (const chunk of readSSEStream(stream)) {
        fullContent += chunk;
        setState((prev) => ({ ...prev, content: fullContent }));
      }

      // Detect BIM JSON after stream completes
      const bimData = extractBIMJson(fullContent);
      setState((prev) => ({
        ...prev,
        streaming: false,
        bimDetected: !!bimData,
        bimData,
      }));

      return fullContent;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur de connexion';
      setState((prev) => ({ ...prev, streaming: false, error: message }));
      return fullContent;
    }
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => ({ ...prev, streaming: false }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return { ...state, send, abort, reset };
}
