import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNotification } from "@/hooks/useNotification";
import * as api from "@/lib/api";
import type { TrainingRunCreatePayload } from "@/lib/api";

const TRAINING_QUERY_KEY = ["training"];

export function useTrainingRuns(projectId?: number | null) {
  return useQuery({
    queryKey: [...TRAINING_QUERY_KEY, projectId],
    queryFn: () => api.getTrainingRuns(projectId),
  });
}

export function useCreateTrainingRun() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (payload: TrainingRunCreatePayload) => api.createTrainingRun(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: TRAINING_QUERY_KEY });
      success("Training started", `${data.name} has been started`);
    },
    onError: (err: Error) => {
      error("Failed to start training", err.message);
    },
  });
}

export function useDeleteTrainingRun() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (runId: number) => api.deleteTrainingRun(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINING_QUERY_KEY });
      success("Training run deleted", "Training run has been removed");
    },
    onError: (err: Error) => {
      error("Failed to delete training run", err.message);
    },
  });
}
