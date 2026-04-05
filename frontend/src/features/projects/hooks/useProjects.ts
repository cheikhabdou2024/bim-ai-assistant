import { useQuery } from '@tanstack/react-query';
import { projectsApi, GetProjectsParams } from '../api/projects.api';

export function useProjects(params: GetProjectsParams = {}) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: () => projectsApi.getAll(params),
  });
}
