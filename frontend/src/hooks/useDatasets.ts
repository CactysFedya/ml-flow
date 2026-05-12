import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNotification } from "@/hooks/useNotification";
import * as api from "@/lib/api";
import type { DatasetAnnotationShape, DatasetItem, DatasetCreatePayload, DatasetUpdatePayload, DatasetImportPayload } from "@/types/workspace";

const DATASETS_QUERY_KEY = ["datasets"];
const DATASET_QUERY_KEY = (id: number) => ["datasets", id];
const DATASET_MEDIA_QUERY_KEY = (id: number) => ["datasets", id, "media"];
const DATASET_ANNOTATION_QUERY_KEY = (id: number, path: string) => ["datasets", id, "annotation", path];
const DATASET_CLASSES_QUERY_KEY = (id: number) => ["datasets", id, "classes"];
const DATASET_TAGS_QUERY_KEY = (id: number) => ["datasets", id, "tags"];
const DATASET_SPLITS_QUERY_KEY = (id: number) => ["datasets", id, "splits"];
const DATASET_EVENTS_QUERY_KEY = (id: number) => ["datasets", id, "events"];

export function useDatasets() {
  return useQuery({
    queryKey: DATASETS_QUERY_KEY,
    queryFn: () => api.getDatasets(),
  });
}

export function useDataset(datasetId: number | null) {
  return useQuery({
    queryKey: DATASET_QUERY_KEY(datasetId ?? 0),
    queryFn: () => api.getDataset(datasetId!),
    enabled: datasetId != null && datasetId > 0,
  });
}

export function useDatasetMedia(datasetId: number | null) {
  return useQuery({
    queryKey: DATASET_MEDIA_QUERY_KEY(datasetId ?? 0),
    queryFn: () => api.getDatasetMedia(datasetId!),
    enabled: datasetId != null && datasetId > 0,
  });
}

export function useDatasetAnnotation(datasetId: number | null, path: string | null) {
  return useQuery({
    queryKey: DATASET_ANNOTATION_QUERY_KEY(datasetId ?? 0, path ?? ""),
    queryFn: () => api.getDatasetAnnotation(datasetId!, path!),
    enabled: datasetId != null && datasetId > 0 && Boolean(path),
  });
}

export function useDatasetClasses(datasetId: number | null) {
  return useQuery({
    queryKey: DATASET_CLASSES_QUERY_KEY(datasetId ?? 0),
    queryFn: () => api.getDatasetClasses(datasetId!),
    enabled: datasetId != null && datasetId > 0,
  });
}

export function useDatasetTagCatalog(datasetId: number | null) {
  return useQuery({
    queryKey: DATASET_TAGS_QUERY_KEY(datasetId ?? 0),
    queryFn: () => api.getDatasetTagCatalog(datasetId!),
    enabled: datasetId != null && datasetId > 0,
  });
}

export function useDatasetSplits(datasetId: number | null) {
  return useQuery({
    queryKey: DATASET_SPLITS_QUERY_KEY(datasetId ?? 0),
    queryFn: () => api.getDatasetSplits(datasetId!),
    enabled: datasetId != null && datasetId > 0,
  });
}

export function useDatasetEvents(datasetId: number | null) {
  return useQuery({
    queryKey: DATASET_EVENTS_QUERY_KEY(datasetId ?? 0),
    queryFn: () => api.getDatasetEvents(datasetId!),
    enabled: datasetId != null && datasetId > 0,
  });
}

export function useCreateDataset() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (payload: DatasetCreatePayload) => api.createDataset(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: DATASETS_QUERY_KEY });
      success("Dataset created", `${data.name} has been created`);
    },
    onError: (err: Error) => {
      error("Failed to create dataset", err.message);
    },
  });
}

export function useImportDataset() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (payload: DatasetImportPayload) => api.importDataset(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: DATASETS_QUERY_KEY });
      success("Dataset imported", `${data.name} has been imported`);
    },
    onError: (err: Error) => {
      error("Failed to import dataset", err.message);
    },
  });
}

export function useUpdateDataset(datasetId: number) {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (payload: DatasetUpdatePayload) => api.updateDataset(datasetId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: DATASET_QUERY_KEY(datasetId) });
      queryClient.invalidateQueries({ queryKey: DATASETS_QUERY_KEY });
      success("Dataset updated", `${data.name} has been updated`);
    },
    onError: (err: Error) => {
      error("Failed to update dataset", err.message);
    },
  });
}

export function useDeleteDataset() {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (datasetId: number) => api.deleteDataset(datasetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DATASETS_QUERY_KEY });
      success("Dataset deleted", "Dataset has been removed");
    },
    onError: (err: Error) => {
      error("Failed to delete dataset", err.message);
    },
  });
}

export function useSaveDatasetAnnotation(datasetId: number, options?: { notify?: boolean }) {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (payload: { path: string; annotations: DatasetAnnotationShape[]; verified: boolean; tags: string[] }) =>
      api.saveDatasetAnnotation(datasetId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: DATASET_ANNOTATION_QUERY_KEY(datasetId, data.path) });
      queryClient.invalidateQueries({ queryKey: DATASET_MEDIA_QUERY_KEY(datasetId) });
      queryClient.invalidateQueries({ queryKey: DATASET_QUERY_KEY(datasetId) });
      queryClient.invalidateQueries({ queryKey: DATASETS_QUERY_KEY });
      if (options?.notify !== false) {
        success("Annotation saved", "Image annotations have been updated");
      }
    },
    onError: (err: Error) => {
      error("Failed to save annotation", err.message);
    },
  });
}

export function useAddDatasetClass(datasetId: number) {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (name: string) => api.addDatasetClass(datasetId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DATASET_CLASSES_QUERY_KEY(datasetId) });
      queryClient.invalidateQueries({ queryKey: DATASET_QUERY_KEY(datasetId) });
      queryClient.invalidateQueries({ queryKey: DATASETS_QUERY_KEY });
      success("Class added", "Dataset classes have been updated");
    },
    onError: (err: Error) => {
      error("Failed to add class", err.message);
    },
  });
}

export function useUpdateDatasetTagCatalog(datasetId: number) {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: (tags: string[]) => api.updateDatasetTagCatalog(datasetId, tags),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DATASET_TAGS_QUERY_KEY(datasetId) });
      queryClient.invalidateQueries({ queryKey: DATASET_QUERY_KEY(datasetId) });
      queryClient.invalidateQueries({ queryKey: DATASETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DATASET_MEDIA_QUERY_KEY(datasetId) });
      success("Tags updated", "Dataset image tags have been updated");
    },
    onError: (err: Error) => {
      error("Failed to update tags", err.message);
    },
  });
}

export function useRescanDataset(datasetId: number) {
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  return useMutation({
    mutationFn: () => api.rescanDataset(datasetId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: DATASET_QUERY_KEY(datasetId) });
      queryClient.invalidateQueries({ queryKey: DATASETS_QUERY_KEY });
      success("Dataset rescanned", "Scan completed successfully");
    },
    onError: (err: Error) => {
      error("Failed to rescan dataset", err.message);
    },
  });
}
