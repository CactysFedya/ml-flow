import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNotification } from "@/hooks/useNotification";
import * as api from "@/lib/api";

const MODELS_QUERY_KEY = ["models"];

export function useModels(projectId?: number | null) {
  return useQuery({
    queryKey: [...MODELS_QUERY_KEY, projectId],
    queryFn: () => api.getModels(projectId),
  });
}

export function useDeleteModel() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (modelId: number) => api.deleteModel(modelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MODELS_QUERY_KEY });
      success("Model deleted", "Model has been removed");
    },
    onError: (err: Error) => {
      error("Failed to delete model", err.message);
    },
  });
}
