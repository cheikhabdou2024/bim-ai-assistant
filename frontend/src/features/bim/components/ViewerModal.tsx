import { useEffect, useState } from 'react';
import { IFCViewer, IfcNode, SelectedObject } from './IFCViewer';
import { ModelTree } from './ModelTree';
import { PropertiesPanel } from './PropertiesPanel';
import { BIMModel } from '../types/bim.types';

interface ViewerModalProps {
  model: BIMModel;
  downloadUrl: string;
  onClose: () => void;
}

export function ViewerModal({ model, downloadUrl, onClose }: ViewerModalProps) {
  const [structure,   setStructure]   = useState<IfcNode | null>(null);
  const [selected,    setSelected]    = useState<SelectedObject | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50">
      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm">
        {/* Left: sidebar toggle + filename */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Basculer la barre latérale"
            title="Arborescence du modèle"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>

          {/* BIM cube icon */}
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-blue-600 text-white">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">
              {model.fileName ?? 'Modèle BIM'}
            </p>
          </div>

          <span className="hidden shrink-0 text-xs text-gray-400 sm:block">
            {new Date(model.createdAt).toLocaleDateString('fr-FR', {
              day: '2-digit', month: 'short', year: 'numeric',
            })}
          </span>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          <a
            href={downloadUrl}
            download={model.fileName ?? 'model.ifc'}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Télécharger
          </a>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Fermer"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* Sidebar — model tree */}
        {sidebarOpen && (
          <aside className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Structure du modèle
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <ModelTree
                structure={structure}
                selectedId={selected?.expressID ?? null}
                onSelect={(id) => {
                  // tree click: just highlight; properties will show if user clicks in 3D
                  // For now just track selection
                  setSelected((prev) =>
                    prev?.expressID === id ? prev : null,
                  );
                }}
              />
            </div>
          </aside>
        )}

        {/* Main 3D canvas — relative so IFCViewer uses absolute inset-0 */}
        <main className="relative min-w-0 flex-1 overflow-hidden">
          <IFCViewer
            url={downloadUrl}
            onStructureReady={setStructure}
            onObjectSelect={setSelected}
          />
        </main>

        {/* Properties panel (appears when an object is selected) */}
        {selected && (
          <PropertiesPanel
            selected={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </div>

      {/* ── Status bar ───────────────────────────────────────────────────────── */}
      <footer className="flex h-7 shrink-0 items-center gap-4 border-t border-gray-200 bg-white px-4">
        {selected ? (
          <span className="text-[11px] text-gray-500">
            Sélectionné : <strong className="text-gray-700">{selected.name}</strong>
            &nbsp;—&nbsp;ID {selected.expressID}
          </span>
        ) : (
          <span className="text-[11px] text-gray-400">
            Cliquez sur un élément pour afficher ses propriétés
          </span>
        )}

        <span className="ml-auto text-[11px] text-gray-300">
          BIM AI Assistant
        </span>
      </footer>
    </div>
  );
}
