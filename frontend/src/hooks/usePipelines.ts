import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNotification } from "@/hooks/useNotification";
import * as api from "@/lib/api";
import type { PipelineCreatePayload } from "@/lib/api";

const PIPELINES_QUERY_KEY = ["pipelines"];

export function usePipelines(projectId?: number | null) {
  return useQuery({
    queryKey: [...PIPELINES_QUERY_KEY, projectId],
    queryFn: () => api.getPipelines(projectId),
  });
}

export function usePipeline(pipelineId: number) {
  return useQuery({
    queryKey: [...PIPELINES_QUERY_KEY, "detail", pipelineId],
    queryFn: () => api.getPipeline(pipelineId),
    enabled: pipelineId > 0,
  });
}

export function useCreatePipeline() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (payload: PipelineCreatePayload) => api.createPipeline(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PIPELINES_QUERY_KEY });
      success("Pipeline created", `${data.name} has been created`);
    },
    onError: (err: Error) => {
      error("Failed to create pipeline", err.message);
    },
  });
}

export function useDeletePipeline() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (pipelineId: number) => api.deletePipeline(pipelineId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PIPELINES_QUERY_KEY });
      success("Pipeline deleted", "Pipeline has been removed");
    },
    onError: (err: Error) => {
      error("Failed to delete pipeline", err.message);
    },
  });
}

export function useRunPipeline() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (pipelineId: number) => api.runPipeline(pipelineId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PIPELINES_QUERY_KEY });
      success("Pipeline run started", `Run #${data.run_number} started`);
    },
    onError: (err: Error) => {
      error("Failed to run pipeline", err.message);
    },
  });
}
