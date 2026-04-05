import apiClient from '../../../shared/api/axios.client';
import {
  Project,
  ProjectsResponse,
  CreateProjectDto,
  UpdateProjectDto,
} from '../types/project.types';

export interface GetProjectsParams {
  page?: number
  limit?: number
  status?: string
}

export const projectsApi = {
  getAll: (params: GetProjectsParams = {}) =>
    apiClient
      .get<ProjectsResponse>('/projects', { params })
      .then((r) => r.data),

  getOne: (id: string) =>
    apiClient.get<Project>(`/projects/${id}`).then((r) => r.data),

  create: (dto: CreateProjectDto) =>
    apiClient.post<Project>('/projects', dto).then((r) => r.data),

  update: (id: string, dto: UpdateProjectDto) =>
    apiClient.patch<Project>(`/projects/${id}`, dto).then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete(`/projects/${id}`).then((r) => r.data),
};
