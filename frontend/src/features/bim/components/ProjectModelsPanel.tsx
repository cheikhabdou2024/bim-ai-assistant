import { useBIMModels } from '../hooks/useBIMModels';
import { useIFCViewer } from '../hooks/useIFCViewer';
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

// ── ModelRow ──────────────────────────────────────────────────────────────────

interface ModelRowProps {
  model: BIMModel;
  onDownload: (model: BIMModel) => void;
  isLoadingThis: boolean;
}

function ModelRow({ model, onDownload, isLoadingThis }: ModelRowProps) {
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
            onClick={() => onDownload(model)}
            disabled={isLoadingThis}
            className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-60 transition-colors"
          >
            {isLoadingThis
              ? <Spinner className="h-3 w-3" />
              : (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )
            }
            Télécharger
          </button>
        )}
      </div>
    </div>
  );
}

// ── ProjectModelsPanel ────────────────────────────────────────────────────────

interface ProjectModelsPanelProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

export function ProjectModelsPanel({ projectId: _projectId, projectName, onClose }: ProjectModelsPanelProps) {
  const { data, isLoading, isError } = useBIMModels();
  const { isLoading: dlLoading, modelId, openModel, error: dlError } = useIFCViewer();

  /** Fetch presigned URL then trigger browser download */
  const handleDownload = async (model: BIMModel) => {
    const url = await openModel(model.id);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = model.fileName ?? 'model.ifc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex h-full w-full max-w-md flex-col bg-gray-50 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-gray-900">Modèles BIM</h2>
            <p className="mt-0.5 max-w-xs truncate text-xs text-gray-500">{projectName}</p>
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

        {/* Info banner — BIM software hint */}
        <div className="mx-4 mt-4 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-blue-700">
            Ouvrez le fichier IFC dans un logiciel BIM :
            {' '}<strong>Autodesk Viewer</strong>, BIMvision, FreeCAD, ou Revit.
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {isLoading && (
            <div className="flex justify-center py-12">
              <Spinner className="h-6 w-6 text-blue-500" />
            </div>
          )}

          {isError && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
              Impossible de charger les modèles. Réessayez.
            </div>
          )}

          {dlError && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{dlError}</div>
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
              onDownload={handleDownload}
              isLoadingThis={dlLoading && modelId === model.id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
