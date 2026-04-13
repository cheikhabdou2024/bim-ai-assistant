import { useState } from 'react';
import { useBIMModels } from '../hooks/useBIMModels';
import { useIFCViewer } from '../hooks/useIFCViewer';
import { ViewerModal } from './ViewerModal';
import { BIMModel } from '../types/bim.types';
import { Spinner } from '../../../shared/components/ui/Spinner';

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-700',
  pending:   'bg-yellow-100 text-yellow-700',
  FAILED:    'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Terminé',
  pending:   'En attente',
  FAILED:    'Échec',
};

interface ModelRowProps {
  model: BIMModel
  onView: (model: BIMModel) => void
  isLoadingThis: boolean
}

function ModelRow({ model, onView, isLoadingThis }: ModelRowProps) {
  const statusStyle = STATUS_STYLES[model.status] ?? 'bg-gray-100 text-gray-600';
  const statusLabel = STATUS_LABELS[model.status] ?? model.status;

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">
          {model.fileName ?? model.s3Key ?? 'Modèle sans nom'}
        </p>
        <p className="text-xs text-gray-400">
          {new Date(model.createdAt).toLocaleDateString('fr-FR')}
        </p>
      </div>
      <div className="ml-3 flex items-center gap-2">
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle}`}>
          {statusLabel}
        </span>
        {model.status === 'COMPLETED' && model.s3Key && (
          <button
            onClick={() => onView(model)}
            disabled={isLoadingThis}
            className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600 disabled:opacity-60"
          >
            {isLoadingThis ? <Spinner className="h-3 w-3" /> : (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 10l4.553-2.069A1 1 0 0121 8.869v6.262a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            )}
            Visualiser
          </button>
        )}
      </div>
    </div>
  );
}

interface ProjectModelsPanelProps {
  projectId: string
  projectName: string
  onClose: () => void
}

export function ProjectModelsPanel({ projectId: _projectId, projectName, onClose }: ProjectModelsPanelProps) {
  const { data, isLoading, isError } = useBIMModels();
  const { isLoading: viewerLoading, modelUrl, modelId, openModel, closeViewer, error: viewerError } = useIFCViewer();

  const [activeModel, setActiveModel] = useState<BIMModel | null>(null);

  const handleView = async (model: BIMModel) => {
    setActiveModel(model);
    await openModel(model.id);
  };

  const handleClose = () => {
    closeViewer();
    setActiveModel(null);
  };

  return (
    <>
      {/* Slide-over panel */}
      <div className="fixed inset-0 z-40 flex justify-end" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="h-full w-full max-w-md bg-gray-50 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 bg-white px-5 py-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-gray-900">Modèles BIM</h2>
              <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{projectName}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Fermer"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading && (
              <div className="flex justify-center py-12">
                <Spinner className="h-6 w-6 text-primary-500" />
              </div>
            )}

            {isError && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
                Impossible de charger les modèles. Réessayez.
              </div>
            )}

            {viewerError && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{viewerError}</div>
            )}

            {!isLoading && !isError && data?.data.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
                <svg className="mb-3 h-12 w-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-sm font-medium">Aucun modèle BIM</p>
                <p className="mt-1 text-xs">Générez un modèle depuis le chat IA</p>
              </div>
            )}

            {data?.data.map((model) => (
              <ModelRow
                key={model.id}
                model={model}
                onView={handleView}
                isLoadingThis={viewerLoading && modelId === model.id}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 3D Viewer Modal */}
      {activeModel && modelUrl && (
        <ViewerModal
          model={activeModel}
          downloadUrl={modelUrl}
          onClose={handleClose}
        />
      )}
    </>
  );
}
