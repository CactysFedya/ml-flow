import type { DashboardPayload } from "@/types/dashboard";
import type {
  DatasetAnnotationItem,
  DatasetAnnotationShape,
  DatasetClassItem,
  DatasetCreatePayload,
  DatasetEventItem,
  DatasetExportSummary,
  DatasetMediaBulkPayload,
  DatasetMediaBulkSummary,
  DatasetFrameExtractionSummary,
  DatasetImportPayload,
  DatasetItem,
  DatasetMediaItem,
  DatasetSourceAddSummary,
  DatasetSourceCreatePayload,
  DatasetSourceItem,
  DatasetSplitItem,
  DatasetTagCatalogItem,
  DatasetUpdatePayload,
  DatasetUploadSummary,
  DatasetVideoPlanSummary,
  DatasetVersionCreatePayload,
  DatasetVersionSummary,
  ProjectCreatePayload,
  ProjectDetail,
  ProjectSummary,
  ProjectUpdatePayload,
} from "@/types/workspace";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8001/api";
const API_ROOT_URL = API_BASE_URL.replace(/\/api\/?$/, "");

export async function getDashboard(filters?: { datasetId?: number | null; projectId?: number | null }): Promise<DashboardPayload> {
  const params = new URLSearchParams();
  if (filters?.projectId != null) {
    params.set("project_id", String(filters.projectId));
  }
  if (filters?.datasetId != null) {
    params.set("dataset_id", String(filters.datasetId));
  }

  const query = params.toString();
  const response = await fetch(`${API_BASE_URL}/dashboard${query ? `?${query}` : ""}`);

  if (!response.ok) {
    throw new Error(`Dashboard request failed: ${response.status}`);
  }

  return response.json() as Promise<DashboardPayload>;
}

export async function getProjects(): Promise<ProjectSummary[]> {
  const response = await fetch(`${API_BASE_URL}/projects`);
  return readJson<ProjectSummary[]>(response, "Projects request failed");
}

export async function getProject(projectId: number): Promise<ProjectDetail> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}`);
  return readJson<ProjectDetail>(response, "Project request failed");
}

export async function createProject(payload: ProjectCreatePayload): Promise<ProjectDetail> {
  const response = await fetch(`${API_BASE_URL}/projects`, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  return readJson<ProjectDetail>(response, "Create project request failed");
}

export async function updateProject(projectId: number, payload: ProjectUpdatePayload): Promise<ProjectDetail> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
  return readJson<ProjectDetail>(response, "Update project request failed");
}

export async function deleteProject(projectId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, { method: "DELETE" });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Delete project request failed: ${response.status}`);
  }
}

export async function openProjectFolder(projectId: number): Promise<{ status: string; path: string }> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/open-folder`, { method: "POST" });
  return readJson<{ status: string; path: string }>(response, "Open project folder request failed");
}

export async function getDatasets(): Promise<DatasetItem[]> {
  const response = await fetch(`${API_BASE_URL}/datasets`);
  return readJson<DatasetItem[]>(response, "Datasets request failed");
}

export async function getDataset(datasetId: number): Promise<DatasetItem> {
  const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}`);
  return readJson<DatasetItem>(response, "Dataset request failed");
}

export async function getDatasetMedia(datasetId: number): Promise<DatasetMediaItem[]> {
  const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/media?limit=1000`);
  const items = await readJson<DatasetMediaItem[]>(response, "Dataset media request failed");
  return items.map((item) => ({
    ...item,
    preview_url: item.preview_url?.startsWith("/api/") ? `${API_ROOT_URL}${item.preview_url}` : item.preview_url,
  }));
}

export async function getDatasetAnnotation(datasetId: number, path: string): Promise<DatasetAnnotationItem> {
  const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/annotations?path=${encodeURIComponent(path)}`);
  return readJson<DatasetAnnotationItem>(response, "Dataset annotation request failed");
}

export async function saveDatasetAnnotation(
  datasetId: number,
  payload: { path: string; annotations: DatasetAnnotationShape[]; verified: boolean; tags: string[] },
): Promise<DatasetAnnotationItem> {
  const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/annotations`, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "PUT",
  });
  return readJson<DatasetAnnotationItem>(response, "Save annotation request failed");
}

export async function getDatasetTagCatalog(datasetId: number): Promise<DatasetTagCatalogItem> {
  const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/tags`);
  return readJson<DatasetTagCatalogItem>(response, "Dataset tag catalog request failed");
}

export async function updateDatasetTagCatalog(datasetId: number, tags: string[]): Promise<DatasetTagCatalogItem> {
  const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/tags`, {
    body: JSON.stringify({ tags }),
    headers: { "Content-Type": "application/json" },
    method: "PUT",
  });
  return readJson<DatasetTagCatalogItem>(response, "Update dataset tag catalog request failed");
}

export async function deleteDatasetMedia(datasetId: number, path: string): Promise<DatasetItem> {
  const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/media?path=${encodeURIComponent(path)}`, { method: "DELETE" });
  return readJson<DatasetItem>(response, "Delete media request failed");
}

export async function applyDatasetMediaBulkAction(datasetId: number, payload: DatasetMediaBulkPayload): Promise<DatasetMediaBulkSummary> {
  const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/media/bulk`, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  return readJson<DatasetMediaBulkSummary>(response, "Bulk media action request failed");
}

export async function getDatasetClasses(datasetId: number): Promise<DatasetClassItem[]> {
  const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/classes`);
  return readJson<DatasetClassItem[]>(response, "Dataset classes request failed");
}

export async function addDatasetClass(datasetId: number, name: string): Promise<DatasetClassItem[]> {
  const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/classes`, {
    body: JSON.stringify({ name }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  return readJson<DatasetClassItem[]>(response, "Add class request failed");
}

export async function importDatasetClasses(datasetId: number, classes: string[], mode = "append"): Promise<DatasetClassItem[]> {
  const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/classes/import`, {
    body: JSON.stringify({ classes, mode }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  return readJson<DatasetClassItem[]>(response, "Import classes request failed");
}

export async function getDatasetSplits(datasetId: number): Promise<DatasetSplitItem[]> {
  const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/splits`);
  return readJson<DatasetSplitItem[]>(response, "Dataset splits request failed");
}

export async function addDatasetSplit(datasetId: number, name: string, description = ""): Promise<DatasetSplitItem[]> {
  const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/splits`, {
    body: JSON.stringify({ name, description }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  return readJson<DatasetSplitItem[]>(response, "Add split request failed");
}

export async function getDatasetEvents(datasetId: number): Promise<DatasetEventItem[]> {
  const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/events`);
  return readJson<DatasetEventItem[]>(response, "Dataset history request failed");
}

export async function getDatasetSources(datasetId: number): Promise<DatasetSourceItem[]> {
  const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/sources`);
  return readJson<DatasetSourceItem[]>(response, "Dataset sources request failed");
}

export async function addDatasetSource(datasetId: number, payload: DatasetSourceCreatePayload): Promise<DatasetSourceAddSummary> {
  const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/sources`, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  return readJson<DatasetSourceAddSummary>(response, "Add source request failed");
}

export async function previewDatasetSourceVideoPlan(
  datasetId: number,
  payload: { source_path: string; frame_interval: number; split_policy: string },
): Promise<DatasetVideoPlanSummary> {
  const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/sources/video-plan`, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  return readJson<DatasetVideoPlanSummary>(response, "Video plan request failed");
}

export async function extractDatasetSourceFrames(
  datasetId: number,
  sourceId: number,
  payload: { frame_interval: number },
): Promise<DatasetFrameExtractionSummary> {
  const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/sources/${sourceId}/extract-frames`, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  return readJson<DatasetFrameExtractionSummary>(response, "Extract frames request failed");
}

export async function createDatasetVersion(datasetId: number, payload: DatasetVersionCreatePayload): Promise<DatasetItem> {
  const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/versions`, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  return readJson<DatasetItem>(response, "Create dataset version request failed");
}

export async function getDatasetVersions(datasetId: number): Promise<DatasetVersionSummary[]> {
  const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/versions`);
  return readJson<DatasetVersionSummary[]>(response, "Dataset versions request failed");
}

export async function rebuildDatasetVersionManifest(datasetId: number): Promise<DatasetVersionSummary> {
  const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/versions/rebuild-manifest`, {
    method: "POST",
  });
  return readJson<DatasetVersionSummary>(response, "Rebuild version manifest request failed");
}

export async function exportDatasetVersionYolo(datasetId: number): Promise<DatasetExportSummary> {
  const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/versions/export-yolo`, {
    method: "POST",
  });
  return readJson<DatasetExportSummary>(response, "YOLO export request failed");
}

export async function uploadDatasetAssets(
  datasetId: number,
  files: File[],
  options: { extractVideoFrames: boolean; frameInterval: number; splitPolicy: string },
): Promise<DatasetUploadSummary> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  formData.append("extract_video_frames", String(options.extractVideoFrames));
  formData.append("frame_interval", String(options.frameInterval));
  formData.append("split_policy", options.splitPolicy);

  const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/assets`, {
    body: formData,
    method: "POST",
  });
  return readJson<DatasetUploadSummary>(response, "Upload assets request failed");
}

export async function createDataset(payload: DatasetCreatePayload): Promise<DatasetItem> {
  const response = await fetch(`${API_BASE_URL}/datasets`, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  return readJson<DatasetItem>(response, "Create dataset request failed");
}

export async function importDataset(payload: DatasetImportPayload): Promise<DatasetItem> {
  const response = await fetch(`${API_BASE_URL}/datasets/import`, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  return readJson<DatasetItem>(response, "Import dataset request failed");
}

export async function updateDataset(datasetId: number, payload: DatasetUpdatePayload): Promise<DatasetItem> {
  const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}`, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
  return readJson<DatasetItem>(response, "Update dataset request failed");
}

export async function rescanDataset(datasetId: number): Promise<DatasetItem> {
  const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/rescan`, { method: "POST" });
  return readJson<DatasetItem>(response, "Rescan dataset request failed");
}

export async function deleteDataset(datasetId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}`, { method: "DELETE" });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Delete dataset request failed: ${response.status}`);
  }
}

export async function openDatasetFolder(datasetId: number): Promise<{ status: string; path: string }> {
  const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/open-folder`, { method: "POST" });
  return readJson<{ status: string; path: string }>(response, "Open folder request failed");
}

// ---------------------------------------------------------------------------
// Training Runs
// ---------------------------------------------------------------------------

export interface TrainingRunItem {
  id: number;
  project_id: number | null;
  dataset_id: number | null;
  name: string;
  model_name: string;
  status: string;
  epochs: number;
  current_epoch: number;
  batch_size: number;
  image_size: number;
  optimizer: string;
  learning_rate: number;
  best_map50: number;
  best_map50_95: number;
  precision: number;
  recall: number;
  box_loss: number;
  obj_loss: number;
  cls_loss: number;
  device: string;
  elapsed_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface TrainingRunCreatePayload {
  name?: string;
  model_name?: string;
  dataset_id?: number | null;
  project_id?: number | null;
  epochs?: number;
  batch_size?: number;
  image_size?: number;
  optimizer?: string;
  learning_rate?: number;
  device?: string;
}

export async function getTrainingRuns(projectId?: number | null): Promise<TrainingRunItem[]> {
  const params = new URLSearchParams();
  if (projectId != null) params.set("project_id", String(projectId));
  const query = params.toString();
  const response = await fetch(`${API_BASE_URL}/training${query ? `?${query}` : ""}`);
  return readJson<TrainingRunItem[]>(response, "Training runs request failed");
}

export async function createTrainingRun(payload: TrainingRunCreatePayload): Promise<TrainingRunItem> {
  const response = await fetch(`${API_BASE_URL}/training`, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  return readJson<TrainingRunItem>(response, "Create training run failed");
}

export async function deleteTrainingRun(runId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/training/${runId}`, { method: "DELETE" });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Delete training run failed: ${response.status}`);
  }
}

export async function startTrainingRun(runId: number, datasetId: number): Promise<TrainingRunItem> {
  const response = await fetch(`${API_BASE_URL}/training/${runId}/start`, {
    body: JSON.stringify({ dataset_id: datasetId }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  return readJson<TrainingRunItem>(response, "Start training failed");
}

export async function stopTrainingRun(runId: number): Promise<{ stopped: boolean }> {
  const response = await fetch(`${API_BASE_URL}/training/${runId}/stop`, { method: "POST" });
  return readJson<{ stopped: boolean }>(response, "Stop training failed");
}

export async function exportDatasetYolo(datasetId: number): Promise<{ dataset_id: number; export_path: string; data_yaml_path: string; images_exported: number; labels_exported: number }> {
  const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/versions/export-yolo`, { method: "POST" });
  return readJson(response, "Export dataset failed");
}

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

export interface ModelItem {
  id: number;
  project_id: number | null;
  training_run_id: number | null;
  name: string;
  model_type: string;
  architecture: string;
  framework: string;
  dataset_name: string;
  status: string;
  version: string;
  file_path: string;
  file_size_bytes: number;
  map50: number;
  map50_95: number;
  precision: number;
  recall: number;
  f1_score: number;
  created_at: string;
  updated_at: string;
}

export async function getModels(projectId?: number | null): Promise<ModelItem[]> {
  const params = new URLSearchParams();
  if (projectId != null) params.set("project_id", String(projectId));
  const query = params.toString();
  const response = await fetch(`${API_BASE_URL}/models${query ? `?${query}` : ""}`);
  return readJson<ModelItem[]>(response, "Models request failed");
}

export interface ModelCreatePayload {
  name?: string;
  model_type?: string;
  architecture?: string;
  framework?: string;
  dataset_name?: string;
  project_id?: number | null;
  training_run_id?: number | null;
}

export async function createModel(payload: ModelCreatePayload): Promise<ModelItem> {
  const response = await fetch(`${API_BASE_URL}/models`, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  return readJson<ModelItem>(response, "Create model failed");
}

export async function updateTrainingRun(runId: number, payload: Partial<TrainingRunCreatePayload & { status?: string; current_epoch?: number }>): Promise<TrainingRunItem> {
  const response = await fetch(`${API_BASE_URL}/training/${runId}`, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
  return readJson<TrainingRunItem>(response, "Update training run failed");
}

export async function deleteModel(modelId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/models/${modelId}`, { method: "DELETE" });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Delete model failed: ${response.status}`);
  }
}

// ---------------------------------------------------------------------------
// Pipelines
// ---------------------------------------------------------------------------

export interface PipelineItem {
  id: number;
  project_id: number | null;
  name: string;
  description: string;
  status: string;
  template: string;
  total_steps: number;
  current_step: number;
  created_at: string;
  updated_at: string;
}

export interface PipelineCreatePayload {
  name?: string;
  description?: string;
  template?: string;
  project_id?: number | null;
}

export interface PipelineDetail extends PipelineItem {
  steps: PipelineStepItem[];
  runs: PipelineRunItem[];
}

export interface PipelineStepItem {
  id: number;
  pipeline_id: number;
  step_order: number;
  name: string;
  step_type: string;
  status: string;
  config_json: string;
  duration_seconds: number;
  created_at: string;
}

export interface PipelineRunItem {
  id: number;
  pipeline_id: number;
  run_number: number;
  status: string;
  duration_seconds: number;
  created_at: string;
}

export async function getPipelines(projectId?: number | null): Promise<PipelineItem[]> {
  const params = new URLSearchParams();
  if (projectId != null) params.set("project_id", String(projectId));
  const query = params.toString();
  const response = await fetch(`${API_BASE_URL}/pipelines${query ? `?${query}` : ""}`);
  return readJson<PipelineItem[]>(response, "Pipelines request failed");
}

export async function getPipeline(pipelineId: number): Promise<PipelineDetail> {
  const response = await fetch(`${API_BASE_URL}/pipelines/${pipelineId}`);
  return readJson<PipelineDetail>(response, "Pipeline request failed");
}

export async function createPipeline(payload: PipelineCreatePayload): Promise<PipelineItem> {
  const response = await fetch(`${API_BASE_URL}/pipelines`, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  return readJson<PipelineItem>(response, "Create pipeline failed");
}

export async function deletePipeline(pipelineId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/pipelines/${pipelineId}`, { method: "DELETE" });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Delete pipeline failed: ${response.status}`);
  }
}

export interface PipelineRunItem {
  id: number;
  pipeline_id: number;
  run_number: number;
  status: string;
  duration_seconds: number;
  created_at: string;
}

export async function runPipeline(pipelineId: number): Promise<PipelineRunItem> {
  const response = await fetch(`${API_BASE_URL}/pipelines/${pipelineId}/run`, { method: "POST" });
  return readJson<PipelineRunItem>(response, "Start pipeline run failed");
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export interface SettingItem {
  key: string;
  value: string;
  category: string;
}

export async function getSettings(category?: string): Promise<SettingItem[]> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  const query = params.toString();
  const response = await fetch(`${API_BASE_URL}/settings${query ? `?${query}` : ""}`);
  return readJson<SettingItem[]>(response, "Settings request failed");
}

export async function updateSetting(key: string, value: string): Promise<SettingItem> {
  const response = await fetch(`${API_BASE_URL}/settings/${key}`, {
    body: JSON.stringify({ value }),
    headers: { "Content-Type": "application/json" },
    method: "PUT",
  });
  return readJson<SettingItem>(response, "Update setting failed");
}

// ---------------------------------------------------------------------------
// AutoLabel
// ---------------------------------------------------------------------------

export interface AutoLabelPayload {
  dataset_id: number;
  model_path?: string;
  confidence?: number;
  iou_threshold?: number;
  max_detections?: number;
  skip_annotated?: boolean;
  device?: string;
}

export interface AutoLabelResult {
  total_images: number;
  processed: number;
  skipped: number;
  total_detections: number;
  classes_added: string[];
  errors: string[];
}

export async function runAutoLabel(payload: AutoLabelPayload): Promise<AutoLabelResult> {
  const response = await fetch(`${API_BASE_URL}/autolabel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return readJson<AutoLabelResult>(response, "AutoLabel request failed");
}

// ---------------------------------------------------------------------------
// Database Reset
// ---------------------------------------------------------------------------

export async function resetDatabase(): Promise<{ status: string; message: string }> {
  const response = await fetch(`${API_BASE_URL}/reset`, { method: "POST" });
  return readJson<{ status: string; message: string }>(response, "Reset database failed");
}

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `${fallback}: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
