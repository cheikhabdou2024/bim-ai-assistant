import { useEffect } from 'react';
import { IFCViewer } from './IFCViewer';
import { BIMModel } from '../types/bim.types';

interface ViewerModalProps {
  model: BIMModel
  downloadUrl: string
  onClose: () => void
}

export function ViewerModal({ model, downloadUrl, onClose }: ViewerModalProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-gray-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-5 py-3">
          <div>
            <h2 className="font-medium text-white">
              {model.fileName ?? 'Modèle BIM'}
            </h2>
            <p className="text-xs text-gray-400">
              {new Date(model.createdAt).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={downloadUrl}
              download={model.fileName ?? 'model.ifc'}
              className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
            >
              Télécharger
            </a>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
              aria-label="Fermer"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Viewer */}
        <div className="flex-1 overflow-hidden p-3">
          <IFCViewer url={downloadUrl} />
        </div>
      </div>
    </div>
  );
}
