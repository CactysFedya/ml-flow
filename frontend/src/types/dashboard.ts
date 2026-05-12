export type WorkspaceSummary = {
  project_name: string;
  dataset_name: string;
  dataset_status: string;
};

export type SummaryCard = {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  action_label: string;
};

export type ExperimentRow = {
  run: string;
  model: string;
  dataset: string;
  metric: number;
  status: string;
  time_label: string;
};

export type TrainingOverviewItem = {
  title: string;
  run: string;
  progress_label: string;
  progress: number;
  eta: string;
  eta_label: string;
};

export type SparklinePoint = {
  name: string;
  value: number;
};

export type ResourceUsageCard = {
  label: string;
  value: string;
  color: string;
  points: SparklinePoint[];
};

export type MetricPoint = {
  epoch: number;
  map50: number;
  map5095: number;
};

export type DistributionItem = {
  name: string;
  value: number;
  color: string;
};

export type RecentDatasetItem = {
  name: string;
  updated_label: string;
  version: string;
};

export type ActivityItem = {
  time_label: string;
  level: string;
  message: string;
};

export type QuickActionItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
};

export type DashboardPayload = {
  workspace: WorkspaceSummary;
  cards: SummaryCard[];
  experiments: ExperimentRow[];
  training_overview: TrainingOverviewItem[];
  resource_usage: ResourceUsageCard[];
  metric_points: MetricPoint[];
  class_total: number;
  class_distribution: DistributionItem[];
  recent_datasets: RecentDatasetItem[];
  activity: ActivityItem[];
  quick_actions: QuickActionItem[];
};
