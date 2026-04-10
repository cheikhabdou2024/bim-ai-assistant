import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { conversationsApi } from '../api/chat.api';
import { useStreamChat } from '../hooks/useStreamChat';
import { MessageBubble } from './MessageBubble';
import { BIMPreviewCard } from './BIMPreviewCard';
import { Message } from '../types/chat.types';
import { Button } from '../../../shared/components/ui/Button';

interface AIChatPanelProps {
  conversationId?: string;
}

export function AIChatPanel({ conversationId }: AIChatPanelProps) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { streaming, content, bimDetected, bimData, error, send, abort } = useStreamChat();

  // Load existing messages when conversation is selected
  const { data: conversation } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => conversationsApi.getOne(conversationId!),
    enabled: !!conversationId,
    staleTime: 10_000,
  });

  const messages: Message[] = conversation?.messages ?? [];

  // Auto-scroll to bottom on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, content]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setInput('');
    textareaRef.current?.focus();

    await send({ conversationId, message: text });

    // Reload conversation + sidebar after stream
    if (conversationId) {
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
    }
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!conversationId) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center px-8">
        <div className="mb-4 text-5xl">🏗️</div>
        <h2 className="mb-2 text-xl font-semibold text-gray-800">Chat IA BIM</h2>
        <p className="text-sm text-gray-500 max-w-sm">
          Sélectionnez une conversation ou créez-en une nouvelle pour décrire votre projet BIM.
          L'IA générera un modèle structuré que vous pourrez télécharger en IFC.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !streaming && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-400">
              Décrivez votre projet BIM — l'IA générera un modèle pour vous.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id}>
            <MessageBubble message={msg} />
            {msg.role === 'ASSISTANT' && msg.bimData && (
              <div className="ml-10 mb-4">
                <BIMPreviewCard bimData={msg.bimData} />
              </div>
            )}
          </div>
        ))}

        {/* Live streaming message */}
        {streaming && content && (
          <MessageBubble
            message={{
              id: '__streaming__',
              conversationId: conversationId,
              role: 'ASSISTANT',
              content,
              createdAt: new Date().toISOString(),
            }}
            streaming
          />
        )}

        {/* Waiting dots (started streaming but no content yet) */}
        {streaming && !content && (
          <div className="flex justify-start mb-4">
            <div className="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">
              AI
            </div>
            <div className="rounded-2xl rounded-bl-sm border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <span className="inline-flex gap-0.5">
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
              </span>
            </div>
          </div>
        )}

        {/* BIM detected after stream ends */}
        {!streaming && bimDetected && bimData && (
          <div className="ml-10 mb-4">
            <BIMPreviewCard bimData={bimData} />
          </div>
        )}

        {error && (
          <div className="mx-4 mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Décrivez votre bâtiment… (Entrée pour envoyer, Shift+Entrée pour sauter une ligne)"
            rows={2}
            maxLength={4000}
            disabled={streaming}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
          />
          {streaming ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={abort}
              className="shrink-0 border border-gray-300 text-red-500 hover:bg-red-50"
            >
              ⏹ Stop
            </Button>
          ) : (
            <Button
              size="sm"
              variant="primary"
              disabled={!input.trim()}
              onClick={handleSend}
              className="shrink-0"
            >
              Envoyer
            </Button>
          )}
        </div>
        <p className="mt-1 text-right text-xs text-gray-400">{input.length}/4000</p>
      </div>
    </div>
  );
}
