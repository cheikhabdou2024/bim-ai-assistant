import { Project } from '../types/project.types';
import { Button } from '../../../shared/components/ui/Button';

const STATUS_STYLES: Record<Project['status'], string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-green-100 text-green-700',
  ARCHIVED: 'bg-yellow-100 text-yellow-700',
};

const STATUS_LABELS: Record<Project['status'], string> = {
  DRAFT: 'Brouillon',
  ACTIVE: 'Actif',
  ARCHIVED: 'Archivé',
};

interface ProjectCardProps {
  project: Project
  onEdit: (project: Project) => void
  onDelete: (project: Project) => void
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  return (
    <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="font-display text-base font-semibold text-gray-900 leading-snug line-clamp-2">
          {project.name}
        </h3>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[project.status]}`}
        >
          {STATUS_LABELS[project.status]}
        </span>
      </div>

      {project.description && (
        <p className="mb-4 flex-1 text-sm text-gray-500 line-clamp-3">
          {project.description}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          {new Date(project.createdAt).toLocaleDateString('fr-FR')}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(project)}>
            Modifier
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:bg-red-50"
            onClick={() => onDelete(project)}
          >
            Supprimer
          </Button>
        </div>
      </div>
    </div>
  );
}
