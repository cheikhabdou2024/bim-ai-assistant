import { useState } from 'react';
import { ConversationList } from '../../features/chat/components/ConversationList';
import { AIChatPanel } from '../../features/chat/components/AIChatPanel';

export function ChatPage() {
  const [selectedId,    setSelectedId]    = useState<string | undefined>();
  const [sidebarOpen,   setSidebarOpen]   = useState(false);

  return (
    /*
     * Height: viewport minus header (4rem). On mobile the header can be taller
     * when the hamburger menu is open, but overflow-hidden clips cleanly.
     */
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

      {/* ── Mobile sidebar overlay ─────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar — Conversation list ────────────────────────────────────── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-gray-200 bg-white
          transition-transform duration-200
          md:static md:z-auto md:w-64 md:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-700">Conversations</h2>
          {/* Close button — mobile only */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 md:hidden"
            aria-label="Fermer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          <ConversationList
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id || undefined);
              setSidebarOpen(false); // auto-close on mobile after selection
            }}
          />
        </div>
      </aside>

      {/* ── Main — Chat panel ──────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile toolbar — conversations toggle */}
        <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            Conversations
          </button>
        </div>

        <AIChatPanel conversationId={selectedId} />
      </main>
    </div>
  );
}
