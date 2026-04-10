import { Conversation } from '../types/chat.types';
import { useConversations } from '../hooks/useConversations';
import { useCreateConversation } from '../hooks/useCreateConversation';
import { useDeleteConversation } from '../hooks/useDeleteConversation';
import { Button } from '../../../shared/components/ui/Button';

interface ConversationListProps {
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const { data: conversations = [], isLoading } = useConversations();
  const { mutate: createConv, isPending: creating } = useCreateConversation();
  const { mutate: deleteConv } = useDeleteConversation();

  const handleNew = () => {
    createConv(undefined, {
      onSuccess: (conv) => onSelect(conv.id),
    });
  };

  const handleDelete = (e: React.MouseEvent, conv: Conversation) => {
    e.stopPropagation();
    if (!confirm(`Supprimer "${conv.title}" ?`)) return;
    deleteConv(conv.id, {
      onSuccess: () => {
        if (selectedId === conv.id) onSelect('');
      },
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="p-3 border-b border-gray-200">
        <Button
          size="sm"
          variant="primary"
          loading={creating}
          onClick={handleNew}
          className="w-full"
        >
          + Nouvelle conversation
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="p-4 text-center text-sm text-gray-400">Chargement…</div>
        )}

        {!isLoading && conversations.length === 0 && (
          <div className="p-4 text-center text-sm text-gray-400">
            Aucune conversation.<br />Créez-en une !
          </div>
        )}

        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`group flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
              selectedId === conv.id
                ? 'bg-primary-50 text-primary-700 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="truncate">{conv.title}</span>
            <button
              onClick={(e) => handleDelete(e, conv)}
              className="shrink-0 hidden group-hover:block rounded p-0.5 text-gray-400 hover:text-red-500 hover:bg-red-50"
              title="Supprimer"
            >
              ✕
            </button>
          </button>
        ))}
      </div>
    </div>
  );
}
