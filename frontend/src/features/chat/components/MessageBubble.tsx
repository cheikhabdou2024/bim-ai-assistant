import { Message } from '../types/chat.types';

interface MessageBubbleProps {
  message: Message;
  /** When true, show animated streaming cursor */
  streaming?: boolean;
}

/**
 * Renders message content with basic formatting:
 * - Code blocks (```) → <pre> element
 * - BIM JSON blocks → highlighted (BIMPreviewCard handles the action)
 * - Regular text → whitespace-pre-wrap
 */
function renderContent(content: string) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```')) {
      const inner = part.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      const isBIM = (() => {
        try {
          const p = JSON.parse(inner);
          return p?.type === 'building';
        } catch {
          return false;
        }
      })();

      return (
        <pre
          key={i}
          className={`mt-2 rounded-lg p-3 text-xs overflow-x-auto ${
            isBIM
              ? 'bg-blue-50 border border-blue-200 text-blue-900'
              : 'bg-gray-900 text-gray-100'
          }`}
        >
          <code>{inner}</code>
        </pre>
      );
    }
    return (
      <span key={i} className="whitespace-pre-wrap">
        {part}
      </span>
    );
  });
}

export function MessageBubble({ message, streaming = false }: MessageBubbleProps) {
  const isUser = message.role === 'USER';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="mr-2 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">
          AI
        </div>
      )}

      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-primary-500 text-white rounded-br-sm'
            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
        }`}
      >
        {renderContent(message.content)}
        {streaming && (
          <span className="ml-1 inline-flex gap-0.5">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
          </span>
        )}
      </div>

      {isUser && (
        <div className="ml-2 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600">
          Moi
        </div>
      )}
    </div>
  );
}
