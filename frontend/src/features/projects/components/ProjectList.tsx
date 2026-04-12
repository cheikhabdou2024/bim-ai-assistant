import { Project } from '../types/project.types';
import { ProjectCard } from './ProjectCard';
import { Button } from '../../../shared/components/ui/Button';

interface ProjectListProps {
  projects: Project[]
  loading?: boolean
  onEdit: (project: Project) => void
  onDelete: (project: Project) => void
  onViewModels: (project: Project) => void
  onCreateFirst?: () => void
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex justify-between">
        <div className="h-4 w-2/3 rounded bg-gray-200" />
        <div className="h-5 w-16 rounded-full bg-gray-200" />
      </div>
      <div className="mb-4 space-y-2">
        <div className="h-3 rounded bg-gray-200" />
        <div className="h-3 w-5/6 rounded bg-gray-200" />
      </div>
      <div className="flex justify-between pt-3 border-t border-gray-100">
        <div className="h-3 w-20 rounded bg-gray-200" />
        <div className="flex gap-2">
          <div className="h-7 w-16 rounded bg-gray-200" />
          <div className="h-7 w-20 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

export function ProjectList({
  projects,
  loading,
  onEdit,
  onDelete,
  onViewModels,
  onCreateFirst,
}: ProjectListProps) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
          <span className="text-3xl">🏗️</span>
        </div>
        <h2 className="font-display text-xl font-semibold text-gray-700">
          Aucun projet pour l'instant
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Créez votre premier projet BIM pour commencer.
        </p>
        {onCreateFirst && (
          <Button className="mt-6" onClick={onCreateFirst}>
            Créer un projet
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewModels={onViewModels}
        />
      ))}
    </div>
  );
}
