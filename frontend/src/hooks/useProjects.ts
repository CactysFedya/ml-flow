import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNotification } from "@/hooks/useNotification";
import * as api from "@/lib/api";
import type { ProjectSummary, ProjectDetail, ProjectCreatePayload, ProjectUpdatePayload } from "@/types/workspace";

const PROJECTS_QUERY_KEY = ["projects"];
const PROJECT_QUERY_KEY = (id: number) => ["projects", id];

export function useProjects() {
  return useQuery({
    queryKey: PROJECTS_QUERY_KEY,
    queryFn: () => api.getProjects(),
  });
}

export function useProject(projectId: number) {
  return useQuery({
    queryKey: PROJECT_QUERY_KEY(projectId),
    queryFn: () => api.getProject(projectId),
    enabled: projectId > 0,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (payload: ProjectCreatePayload) => api.createProject(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
      success("Project created", `${data.name} has been created successfully`);
    },
    onError: (err: Error) => {
      error("Failed to create project", err.message);
    },
  });
}

export function useUpdateProject(projectId: number) {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (payload: ProjectUpdatePayload) => api.updateProject(projectId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PROJECT_QUERY_KEY(projectId) });
      queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
      success("Project updated", `${data.name} has been updated`);
    },
    onError: (err: Error) => {
      error("Failed to update project", err.message);
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (projectId: number) => api.deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
      success("Project deleted", "Project has been removed");
    },
    onError: (err: Error) => {
      error("Failed to delete project", err.message);
    },
  });
}
