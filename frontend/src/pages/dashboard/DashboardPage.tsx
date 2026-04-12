import { useState } from 'react';
import { useAuthStore } from '../../features/auth/store/auth.store';
import { useProjects } from '../../features/projects/hooks/useProjects';
import { useDeleteProject } from '../../features/projects/hooks/useDeleteProject';
import { ProjectList } from '../../features/projects/components/ProjectList';
import { Pagination } from '../../features/projects/components/Pagination';
import { Project } from '../../features/projects/types/project.types';
import { Button } from '../../shared/components/ui/Button';
import { CreateProjectModal } from '../../features/projects/components/CreateProjectModal';
import { EditProjectModal } from '../../features/projects/components/EditProjectModal';
import { DeleteProjectDialog } from '../../features/projects/components/DeleteProjectDialog';
import { ProjectModelsPanel } from '../../features/bim/components/ProjectModelsPanel';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [modelsProject, setModelsProject] = useState<Project | null>(null);

  const { data, isLoading } = useProjects({ page, limit: 20 });
  const deleteProject = useDeleteProject();

  if (!user) return null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-gray-900">
            Bonjour, {user.name}
          </h1>
          <p className="mt-1 text-gray-500">
            {data ? `${data.total} projet${data.total !== 1 ? 's' : ''}` : 'Chargement…'}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ Nouveau projet</Button>
      </div>

      <ProjectList
        projects={data?.data ?? []}
        loading={isLoading}
        onEdit={setEditTarget}
        onDelete={setDeleteTarget}
        onViewModels={setModelsProject}
        onCreateFirst={() => setShowCreate(true)}
      />

      {data && (
        <Pagination
          page={page}
          limit={20}
          total={data.total}
          onPageChange={setPage}
        />
      )}

      {showCreate && (
        <CreateProjectModal onClose={() => setShowCreate(false)} />
      )}
      {editTarget && (
        <EditProjectModal
          project={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}
      {deleteTarget && (
        <DeleteProjectDialog
          project={deleteTarget}
          loading={deleteProject.isPending}
          onConfirm={() => {
            deleteProject.mutate(deleteTarget.id, {
              onSuccess: () => setDeleteTarget(null),
            });
          }}
          onClose={() => setDeleteTarget(null)}
        />
      )}
      {modelsProject && (
        <ProjectModelsPanel
          projectId={modelsProject.id}
          projectName={modelsProject.name}
          onClose={() => setModelsProject(null)}
        />
      )}
    </div>
  );
}
