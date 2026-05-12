import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNotification } from "@/hooks/useNotification";
import * as api from "@/lib/api";

const SETTINGS_QUERY_KEY = ["settings"];

export function useSettings(category?: string) {
  return useQuery({
    queryKey: [...SETTINGS_QUERY_KEY, category],
    queryFn: () => api.getSettings(category),
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => api.updateSetting(key, value),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
      success("Setting updated", `${data.key} has been updated`);
    },
    onError: (err: Error) => {
      error("Failed to update setting", err.message);
    },
  });
}
