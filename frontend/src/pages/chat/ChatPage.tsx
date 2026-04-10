import { useState } from 'react';
import { ConversationList } from '../../features/chat/components/ConversationList';
import { AIChatPanel } from '../../features/chat/components/AIChatPanel';

export function ChatPage() {
  const [selectedId, setSelectedId] = useState<string | undefined>();

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Sidebar — Conversation list */}
      <aside className="hidden w-64 shrink-0 border-r border-gray-200 md:flex md:flex-col">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-700">Conversations</h2>
        </div>
        <div className="flex-1 overflow-hidden">
          <ConversationList
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id || undefined)}
          />
        </div>
      </aside>

      {/* Main — Chat panel */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <AIChatPanel conversationId={selectedId} />
      </main>
    </div>
  );
}
