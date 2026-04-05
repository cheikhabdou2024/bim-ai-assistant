import { Project } from '../types/project.types';
import { Button } from '../../../shared/components/ui/Button';

interface DeleteProjectDialogProps {
  project: Project
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function DeleteProjectDialog({
  project,
  loading,
  onConfirm,
  onClose,
}: DeleteProjectDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-2 font-display text-xl font-semibold text-gray-900">
          Supprimer le projet
        </h2>
        <p className="mb-6 text-sm text-gray-500">
          Êtes-vous sûr de vouloir supprimer{' '}
          <span className="font-medium text-gray-700">« {project.name} »</span> ?
          Cette action est irréversible.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            onClick={onConfirm}
            loading={loading}
            className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
          >
            Supprimer
          </Button>
        </div>
      </div>
    </div>
  );
}
