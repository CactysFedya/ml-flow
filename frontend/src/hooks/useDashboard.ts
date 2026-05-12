import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "@/lib/api";
import type { DashboardPayload } from "@/types/dashboard";

const DASHBOARD_QUERY_KEY = ["dashboard"];

export function useDashboard(filters?: { projectId?: number | null; datasetId?: number | null }) {
  return useQuery({
    queryKey: [...DASHBOARD_QUERY_KEY, filters?.projectId, filters?.datasetId],
    queryFn: () => getDashboard(filters),
  });
}
