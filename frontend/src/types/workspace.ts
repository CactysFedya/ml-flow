export type DatasetStats = {
  images: number;
  videos: number;
  annotations: number;
  classes: number;
  labeled: number;
  verified: number;
  labeled_percent: number;
  verified_percent: number;
};

export type DatasetSplits = {
  train: number;
  val: number;
  test: number;
};

export type DatasetItem = {
  id: number;
  project_id: number | null;
  name: string;
  version: string;
  topic: string;
  task: string;
  status: string;
  format: string;
  source_path: string;
  storage_path: string;
  created_at: string;
  updated_at: string;
  stats: DatasetStats;
  splits: DatasetSplits;
};

export type DatasetMediaItem = {
  id: string;
  name: string;
  path: string;
  kind: "image" | "video";
  split: "Train" | "Val" | "Test" | string;
  annotated: boolean;
  verified: boolean;
  tags: string[];
  preview_url: string | null;
  width: number | null;
  height: number | null;
};

export type DatasetAnnotationShape = {
  class_id: number;
  x_center: number;
  y_center: number;
  width: number;
  height: number;
};

export type DatasetAnnotationItem = {
  path: string;
  label_path: string | null;
  format: "YOLO" | string;
  annotations: DatasetAnnotationShape[];
  verified: boolean;
  tags: string[];
};

export type DatasetTagCatalogItem = {
  tags: string[];
};

export type DatasetClassItem = {
  id: string;
  name: string;
  instances: number;
  color: string;
};

export type DatasetSplitItem = {
  name: string;
  images: number;
  videos: number;
  total: number;
  percent: number;
  description: string;
  color: string;
  system: boolean;
};

export type DatasetEventItem = {
  id: number;
  dataset_id: number;
  event_type: string;
  title: string;
  description: string;
  author: string;
  created_at: string;
};

export type DatasetSourceItem = {
  id: number;
  dataset_id: number;
  name: string;
  source_type: string;
  source_path: string;
  target_path: string;
  status: string;
  split_policy: string;
  images: number;
  videos: number;
  annotations: number;
  classes: number;
  frames: number;
  train: number;
  val: number;
  test: number;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type DatasetSourceCreatePayload = {
  source_path: string;
  name?: string;
  source_type?: string;
  split_policy?: string;
  copy_assets?: boolean;
  extract_video_frames?: boolean;
  frame_interval?: number;
  notes?: string;
};

export type DatasetSourceAddSummary = {
  dataset: DatasetItem;
  source: DatasetSourceItem;
  sources: DatasetSourceItem[];
  warnings: string[];
};

export type DatasetVideoPlanItem = {
  name: string;
  path: string;
  size_bytes: number;
  split: string;
  duration_seconds: number | null;
  fps: number | null;
  total_frames: number | null;
  estimated_frames: number;
  warning: string;
};

export type DatasetVideoPlanSummary = {
  source_path: string;
  video_count: number;
  total_size_bytes: number;
  total_duration_seconds: number | null;
  estimated_frames: number;
  frame_interval: number;
  split_policy: string;
  items: DatasetVideoPlanItem[];
  warnings: string[];
};

export type DatasetFrameExtractionSummary = {
  dataset: DatasetItem;
  source: DatasetSourceItem;
  sources: DatasetSourceItem[];
  frames_saved: number;
  warnings: string[];
};

export type DatasetUploadSummary = {
  dataset: DatasetItem;
  files_saved: number;
  images_saved: number;
  videos_saved: number;
  frames_saved: number;
  assigned_splits: string[];
  warnings: string[];
};

export type DatasetMediaBulkPayload = {
  paths: string[];
  operation: string;
  split?: string | null;
  tags?: string[];
};

export type DatasetMediaBulkSummary = {
  dataset: DatasetItem;
  changed_files: number;
  removed_from_version: number;
  moved_files: number;
  tagged_files: number;
  target_split: string;
  tags: string[];
  message: string;
};

export type DatasetImportPayload = {
  source_path: string;
  name?: string;
  version?: string;
  topic?: string;
  task?: string;
  format?: string;
  project_id?: number | null;
};

export type DatasetCreatePayload = {
  name: string;
  version?: string;
  topic?: string;
  task?: string;
  format?: string;
  source_path?: string;
  project_id?: number | null;
};

export type DatasetUpdatePayload = Partial<{
  name: string;
  version: string;
  topic: string;
  task: string;
  status: string;
  format: string;
  source_path: string;
  storage_path: string;
  project_id: number | null;
}>;

export type DatasetVersionCreatePayload = {
  version?: string;
  description?: string;
};

export type DatasetVersionSampleItem = {
  path: string;
  name: string;
  kind: "image" | "video" | string;
  split: string;
  annotated: boolean;
  verified: boolean;
};

export type DatasetVersionSummary = {
  dataset: DatasetItem;
  source_count: number;
  has_manifest: boolean;
  manifest_path: string;
  tracked_files: number;
  missing_files: number;
  image_files: number;
  video_files: number;
  annotated_files: number;
  verified_files: number;
  sample_files: DatasetVersionSampleItem[];
};

export type DatasetExportSummary = {
  dataset_id: number;
  version: string;
  export_format: string;
  export_path: string;
  images_exported: number;
  labels_exported: number;
  skipped_videos: number;
  classes: number;
  data_yaml_path: string;
  classes_path: string;
};

export type ProjectSummary = {
  id: number;
  name: string;
  description: string;
  task: string;
  status: string;
  owner: string;
  storage_path: string;
  created_at: string;
  updated_at: string;
  dataset_count: number;
  model_count: number;
  experiment_count: number;
  pipeline_count: number;
  image_count: number;
  video_count: number;
  class_count: number;
  storage_size_bytes: number;
};

export type ProjectDetail = ProjectSummary & {
  datasets: DatasetItem[];
  activities: ProjectActivityItem[];
};

export type ProjectCreatePayload = {
  name: string;
  description?: string;
  task?: string;
  storage_path?: string;
};

export type ProjectUpdatePayload = Partial<{
  name: string;
  description: string;
  task: string;
  status: string;
  owner: string;
  storage_path: string;
}>;

export type ProjectActivityItem = {
  id: number;
  dataset_id: number;
  dataset_name: string;
  event_type: string;
  title: string;
  description: string;
  created_at: string;
};
