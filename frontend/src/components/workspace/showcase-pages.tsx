import type { ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bot,
  Boxes,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Copy,
  Cpu,
  Download,
  Eye,
  FileDown,
  FileImage,
  FileText,
  Filter,
  FolderOpen,
  Gauge,
  HardDrive,
  Image as ImageIcon,
  Layers3,
  ListFilter,
  MoreHorizontal,
  Play,
  Rocket,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Square,
  TimerReset,
  Upload,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const trainingMetricData = [
  { epoch: 0, train: 0.08, val: 0.04 },
  { epoch: 4, train: 0.44, val: 0.31 },
  { epoch: 8, train: 0.6, val: 0.46 },
  { epoch: 12, train: 0.69, val: 0.56 },
  { epoch: 16, train: 0.79, val: 0.63 },
  { epoch: 20, train: 0.83, val: 0.69 },
  { epoch: 24, train: 0.89, val: 0.78 },
  { epoch: 28, train: 0.9, val: 0.73 },
  { epoch: 32, train: 0.92, val: 0.78 },
  { epoch: 36, train: 0.93, val: 0.74 },
  { epoch: 40, train: 0.94, val: 0.79 },
  { epoch: 44, train: 0.95, val: 0.76 },
  { epoch: 48, train: 0.94, val: 0.78 },
  { epoch: 50, train: 0.95, val: 0.77 },
];

const trainingLossData = [
  { epoch: 0, box: 2.4, object: 2.0, cls: 1.8 },
  { epoch: 3, box: 1.52, object: 1.3, cls: 0.72 },
  { epoch: 6, box: 1.18, object: 0.95, cls: 0.42 },
  { epoch: 10, box: 0.92, object: 0.72, cls: 0.26 },
  { epoch: 16, box: 0.7, object: 0.52, cls: 0.18 },
  { epoch: 22, box: 0.58, object: 0.42, cls: 0.13 },
  { epoch: 30, box: 0.48, object: 0.33, cls: 0.11 },
  { epoch: 40, box: 0.4, object: 0.26, cls: 0.09 },
  { epoch: 50, box: 0.34, object: 0.21, cls: 0.07 },
];

const automlPerformanceData = [
  { time: "08:00", y8s: 0.52, y8m: 0.44, y8n: 0.25, y8l: 0.34 },
  { time: "08:30", y8s: 0.73, y8m: 0.58, y8n: 0.42, y8l: 0.58 },
  { time: "09:00", y8s: 0.77, y8m: 0.61, y8n: 0.48, y8l: 0.7 },
  { time: "09:30", y8s: 0.76, y8m: 0.63, y8n: 0.5, y8l: 0.75 },
  { time: "10:00", y8s: 0.8, y8m: 0.65, y8n: 0.52, y8l: 0.78 },
  { time: "11:00", y8s: 0.81, y8m: 0.67, y8n: 0.53, y8l: 0.79 },
  { time: "12:00", y8s: 0.82, y8m: 0.68, y8n: 0.54, y8l: 0.8 },
  { time: "13:00", y8s: 0.82, y8m: 0.69, y8n: 0.54, y8l: 0.8 },
  { time: "14:00", y8s: 0.82, y8m: 0.69, y8n: 0.54, y8l: 0.8 },
];

const automlScatterData = [
  { label: "YOLOv8n", params: 3.2, map: 0.54, size: 80 },
  { label: "YOLOv8s", params: 11.2, map: 0.68, size: 120 },
  { label: "YOLOv8m", params: 25.9, map: 0.66, size: 150 },
  { label: "YOLOv8l", params: 43.7, map: 0.76, size: 110 },
  { label: "YOLOv8x", params: 68.1, map: 0.8, size: 95 },
  { label: "YOLOv9e", params: 112, map: 0.55, size: 100 },
  { label: "RT-DETR", params: 450, map: 0.78, size: 130 },
];

const experimentMapData = Array.from({ length: 20 }, (_, index) => ({
  epoch: (index + 1) * 10,
  value: 0.42 + Math.min(index * 0.035, 0.6) + (index > 10 ? 0.01 : 0),
}));

const experimentLossData = Array.from({ length: 11 }, (_, index) => ({
  epoch: index * 20,
  box: Math.max(0.52, 1.3 - index * 0.08),
  obj: Math.max(0.22, 0.82 - index * 0.06),
  cls: Math.max(0.08, 0.5 - index * 0.03),
}));

const modelSparkline = [
  { point: 0, value: 0.58 },
  { point: 1, value: 0.6 },
  { point: 2, value: 0.59 },
  { point: 3, value: 0.64 },
  { point: 4, value: 0.66 },
  { point: 5, value: 0.63 },
  { point: 6, value: 0.7 },
  { point: 7, value: 0.73 },
  { point: 8, value: 0.69 },
  { point: 9, value: 0.75 },
  { point: 10, value: 0.71 },
  { point: 11, value: 0.73 },
];

const trainingRows = [
  ["24 (current)", "0.89", "0.71", "0.92", "0.87", "0.42", "0.31", "0.18", "02:31"],
  ["23", "0.88", "0.70", "0.91", "0.86", "0.47", "0.33", "0.19", "02:29"],
  ["22", "0.87", "0.69", "0.90", "0.85", "0.51", "0.36", "0.21", "02:30"],
  ["21", "0.92", "0.72", "0.93", "0.88", "0.45", "0.32", "0.17", "02:32"],
  ["20", "0.90", "0.71", "0.91", "0.87", "0.48", "0.34", "0.18", "02:31"],
];

const labelingDatasets = [
  {
    name: "Coco Dataset v1.2",
    status: "Ready",
    task: "Object Detection",
    format: "YOLO Format",
    description: "High quality object detection dataset collected from urban scenarios.",
    images: "118,000",
    classes: "80",
    annotated: "94,400",
    size: "68.4 GB",
    progress: 80,
    split: "Train / Val / Test (94k / 12k / 12k)",
    lastUsed: "2 hours ago",
    action: "Continue Labeling",
    palette: ["#203A62", "#2C5E9E", "#506C8E", "#405A7F", "#1F3855", "#6B88A6", "#35506F", "#7993AF", "#263A58"],
  },
  {
    name: "Custom Dataset v1.0",
    status: "Draft",
    task: "Image Classification",
    format: "Folder Structure",
    description: "Custom classification dataset for training baseline models.",
    images: "25,000",
    classes: "15",
    annotated: "7,200",
    size: "12.7 GB",
    progress: 28,
    split: "Train / Val / Test (20k / 2.5k / 2.5k)",
    lastUsed: "3 days ago",
    action: "Start Labeling",
    palette: ["#7E7D52", "#3F5744", "#8C815B", "#5B6A52", "#746E49", "#6C7C62", "#554E37", "#8D7448", "#4F5C43"],
  },
  {
    name: "Product Dataset v2.1",
    status: "Ready",
    task: "Object Detection",
    format: "YOLO Format",
    description: "E-commerce product detection dataset with high quality annotations.",
    images: "10,500",
    classes: "35",
    annotated: "10,050",
    size: "8.2 GB",
    progress: 96,
    split: "Train / Val / Test (8.4k / 1.05k / 1.05k)",
    lastUsed: "1 week ago",
    action: "Continue Labeling",
    palette: ["#56595B", "#BAA77D", "#D1CCBE", "#7F7B72", "#E3E0D8", "#3E4042", "#8A714D", "#A49682", "#C9B79D"],
  },
];

const automlRuns = [
  ["1", "Run #12", "YOLOv8s", "0.912", "0.672", "0.934", "0.881", "11.2M", "200", "45m 12s", "Completed"],
  ["2", "Run #08", "YOLOv8m", "0.901", "0.658", "0.927", "0.873", "25.9M", "200", "52m 18s", "Completed"],
  ["3", "Run #05", "YOLOv8s", "0.885", "0.641", "0.912", "0.856", "11.2M", "150", "36m 07s", "Completed"],
  ["4", "Run #19", "YOLOv8n", "0.872", "0.612", "0.901", "0.841", "3.2M", "200", "28m 33s", "Completed"],
  ["5", "Run #03", "YOLOv8m", "0.869", "0.607", "0.899", "0.835", "25.9M", "150", "39m 21s", "Completed"],
  ["6", "Run #21", "YOLOv8l", "0.861", "0.598", "0.892", "0.829", "43.7M", "200", "1h 02m", "Running"],
];

const experiments = [
  ["YOLOv8s - AutoML Run #12", "AutoML", "YOLOv8s", "Coco Dataset v1.2", "0.912", "", "Completed", "May 18, 10:32 AM", "45m 12s"],
  ["YOLOv8m - Baseline", "Training", "YOLOv8m", "Coco Dataset v1.2", "0.901", "-1.2%", "Completed", "May 18, 09:41 AM", "52m 18s"],
  ["YOLOv8s - Augmented", "Training", "YOLOv8s", "Coco Dataset v1.2", "0.885", "-3.0%", "Completed", "May 18, 08:15 AM", "36m 07s"],
  ["YOLOv8n - Fast", "Training", "YOLOv8n", "Coco Dataset v1.2", "0.872", "-4.4%", "Completed", "May 18, 11:20 AM", "28m 33s"],
  ["YOLOv8x - High Accuracy", "Training", "YOLOv8x", "Coco Dataset v1.2", "0.846", "-7.2%", "Failed", "May 17, 05:22 PM", "1h 12m"],
  ["YOLOv8s - Long Training", "Training", "YOLOv8s", "Coco Dataset v1.2", "-", "", "Running", "May 18, 01:15 PM", "2h 15m"],
  ["YOLOv8n - Quick Test", "Training", "YOLOv8n", "Coco Dataset v1.2", "-", "", "Running", "May 18, 02:05 PM", "1h 02m"],
  ["YOLOv8m - Hyperparam Search", "AutoML", "YOLOv8m", "Coco Dataset v1.2", "-", "", "Failed", "May 17, 03:48 PM", "38m 56s"],
];

const models = [
  {
    name: "YOLOv8s - Best Model",
    status: "Ready",
    type: "Object Detection",
    model: "YOLOv8s",
    framework: "PyTorch",
    dataset: "Coco Dataset v1.2",
    source: "Run #12 (AutoML)",
    created: "May 18, 2025",
    size: "28.7 MB",
    version: "v1.0.0",
    metricLabel: "mAP@0.5",
    metricValue: "0.912",
    precision: "0.934",
    recall: "0.881",
    f1: "0.906",
    action: "Deploy",
    palette: ["#203A62", "#2C5E9E", "#506C8E", "#405A7F"],
  },
  {
    name: "YOLOv8m - High Recall",
    status: "Ready",
    type: "Object Detection",
    model: "YOLOv8m",
    framework: "PyTorch",
    dataset: "Coco Dataset v1.2",
    source: "Run #08 (Training)",
    created: "May 18, 2025",
    size: "51.2 MB",
    version: "v1.0.0",
    metricLabel: "mAP@0.5",
    metricValue: "0.901",
    precision: "0.927",
    recall: "0.912",
    f1: "0.919",
    action: "Deploy",
    palette: ["#203A62", "#2C5E9E", "#506C8E", "#405A7F"],
  },
  {
    name: "ResNet50 - Image Classification",
    status: "Ready",
    type: "Image Classification",
    model: "ResNet50",
    framework: "PyTorch",
    dataset: "Birds Dataset v1.0",
    source: "Run #21 (Training)",
    created: "May 17, 2025",
    size: "98.4 MB",
    version: "v1.0.0",
    metricLabel: "Top-1 Accuracy",
    metricValue: "0.962",
    precision: "0.988",
    recall: "0.961",
    f1: "0.962",
    action: "Deploy",
    palette: ["#677B5A", "#8FA06D", "#C5B891", "#5F6F55"],
  },
  {
    name: "YOLOv8n - Fast Inference",
    status: "Ready",
    type: "Object Detection",
    model: "YOLOv8n",
    framework: "PyTorch",
    dataset: "Coco Dataset v1.2",
    source: "Run #19 (Training)",
    created: "May 17, 2025",
    size: "6.1 MB",
    version: "v1.0.0",
    metricLabel: "mAP@0.5",
    metricValue: "0.872",
    precision: "0.899",
    recall: "0.841",
    f1: "0.869",
    action: "Deploy",
    palette: ["#425162", "#5C6772", "#29303A", "#717D88"],
  },
  {
    name: "YOLOv8s - Product Detection",
    status: "Archived",
    type: "Object Detection",
    model: "YOLOv8s",
    framework: "PyTorch",
    dataset: "Product Dataset v1.1",
    source: "Run #15 (Training)",
    created: "May 16, 2025",
    size: "26.3 MB",
    version: "v1.0.0",
    metricLabel: "mAP@0.5",
    metricValue: "0.846",
    precision: "0.868",
    recall: "0.809",
    f1: "0.838",
    action: "Download",
    palette: ["#A28153", "#D2C4AE", "#8E7756", "#B6B0A6"],
  },
];

export function LabelingPage() {
  return (
    <section className="ui-page h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden">
      <PageIntro title="Labeling" subtitle="Select a dataset to start or continue annotation" />

      <div className="space-y-3">
        <TabBar tabs={["My Datasets", "Shared With Me"]} active="My Datasets" />
        <div className="flex flex-wrap items-center gap-3">
          <SearchField placeholder="Search datasets..." className="min-w-[280px] flex-1 xl:max-w-[420px]" />
          <SelectStub label="All Tasks" />
          <SelectStub label="All Status" />
          <SelectStub label="All Splits" />
          <SelectStub label="Sort: Recently Used" className="ml-auto" />
          <IconSquare>
            <SlidersHorizontal className="h-4 w-4" />
          </IconSquare>
        </div>
      </div>

      <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(250px,280px)]">
        <div className="min-h-0 space-y-4 overflow-auto pr-1">
          {labelingDatasets.map((dataset) => (
            <Card key={dataset.name}>
              <CardContent className="flex gap-5 p-4">
                <ThumbnailMosaic palette={dataset.palette} label={`+${dataset.images.replace(",000", "K")}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="ui-section-title">{dataset.name}</h3>
                        <Badge tone={dataset.status === "Ready" ? "success" : "warning"}>{dataset.status}</Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-[length:var(--font-sm)] text-slate-500">
                        <span>{dataset.task}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                        <span>{dataset.format}</span>
                      </div>
                      <p className="mt-2 text-[length:var(--font-sm)] text-slate-500">{dataset.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="ui-meta">Last used: {dataset.lastUsed}</span>
                      <button className="text-slate-400" type="button">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 text-[length:var(--font-sm)] text-slate-500 md:grid-cols-4">
                    <StatInline icon={FileImage} value={dataset.images} label="Images" />
                    <StatInline icon={Layers3} value={dataset.classes} label="Classes" />
                    <StatInline icon={CheckCircle2} value={dataset.annotated} label="Annotated" />
                    <StatInline icon={HardDrive} value={dataset.size} label="Size" />
                  </div>

                  <div className="mt-5 flex items-end justify-between gap-4 border-t border-slate-100 pt-4">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center justify-between text-[length:var(--font-sm)]">
                        <span className="font-medium text-slate-600">Progress</span>
                        <span className="text-slate-500">
                          {dataset.progress}% ({dataset.annotated} / {dataset.images})
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            dataset.progress > 70 ? "bg-emerald-500" : dataset.progress > 40 ? "bg-blue-500" : "bg-amber-500",
                          )}
                          style={{ width: `${dataset.progress}%` }}
                        />
                      </div>
                      <div className="mt-3 text-[length:var(--font-sm)] text-slate-500">Split: {dataset.split}</div>
                    </div>
                    <div className="flex min-w-[162px] flex-col gap-3">
                      <Button variant="secondary" className="h-11 gap-2 border border-slate-200 bg-white">
                        <FolderOpen className="h-4 w-4" />
                        Open Images
                      </Button>
                      <Button className="h-11 gap-2">
                        <Play className="h-4 w-4" />
                        {dataset.action}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="ui-meta pb-2 text-center">Showing 1 to 3 of 3 datasets</div>
        </div>

        <div className="min-h-0 space-y-4 overflow-auto pr-1">
          <SidebarInfoCard
            title="Labeling Guide"
            items={[
              ["How to annotate", "Best practices and guidelines"],
              ["Keyboard Shortcuts", "Speed up your labeling"],
              ["Annotation Standards", "Project-specific rules"],
              ["Video Tutorials", "Step-by-step guides"],
            ]}
          />
          <SidebarInfoCard
            title="Recent Activity"
            action="View All"
            items={[
              ["Coco Dataset v1.2", "Annotated 200 images", "2 hours ago"],
              ["Custom Dataset v1.0", "Annotated 150 images", "1 day ago"],
              ["Product Dataset v2.1", "Annotated 500 images", "1 week ago"],
              ["Coco Dataset v1.2", "Annotated 300 images", "1 week ago"],
            ]}
            compact
          />
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center gap-2 text-slate-900">
                <Sparkles className="h-4 w-4 text-violet-500" />
                <h3 className="ui-section-title">Tips</h3>
              </div>
              <p className="text-[length:var(--font-sm)] leading-6 text-slate-500">Use keyboard shortcuts to speed up annotation process</p>
              <Button variant="secondary" className="h-10 border border-blue-200 bg-blue-50 text-primary">
                View Shortcuts
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

export function AutoLabelPage() {
  return (
    <section className="ui-page h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <PageIntro title="AutoLabel" subtitle="Automatically generate annotations for your dataset using AI models" />
        <Button variant="secondary" className="h-10 gap-2 border border-slate-200 bg-white">
          <Clock3 className="h-4 w-4" />
          View AutoLabel History
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,340px)]">
        <Card>
          <CardContent className="grid gap-4 p-4 sm:grid-cols-4">
            {[
              { step: "1", title: "Configure", subtitle: "Choose dataset and model", active: true },
              { step: "2", title: "Preview", subtitle: "Review prediction results", active: false },
              { step: "3", title: "Run", subtitle: "Process images and generate labels", active: false },
              { step: "4", title: "Results", subtitle: "Review and save annotations", active: false },
            ].map(({ active, step, subtitle, title }) => (
              <div key={title} className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-[length:var(--font-sm)] font-semibold",
                    active ? "bg-primary text-white" : "bg-slate-100 text-slate-500",
                  )}
                >
                  {step}
                </div>
                <div>
                  <div className="ui-card-title">{title}</div>
                  <div className="ui-meta text-slate-500">{subtitle}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <div />
      </div>

      <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,340px)]">
        <div className="min-h-0 space-y-4 overflow-auto pr-1">
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardContent className="space-y-4 p-4">
                <SectionHeading title="Select Dataset" subtitle="Choose the dataset you want to auto-annotate" />
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100">
                      <ImageIcon className="h-6 w-6 text-slate-500" />
                    </div>
                    <div>
                      <div className="ui-section-title">Coco Dataset v1.2</div>
                      <div className="mt-1 text-[length:var(--font-sm)] text-slate-500">Object Detection • YOLO Format</div>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </div>
                <div className="grid gap-3 text-[length:var(--font-sm)] text-slate-500 md:grid-cols-4">
                  <StatInline icon={FileImage} value="118,000" label="Images" />
                  <StatInline icon={Layers3} value="80" label="Classes" />
                  <StatInline icon={CheckCircle2} value="94,400" label="Annotated" />
                  <StatInline icon={HardDrive} value="68.4 GB" label="Size" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-4">
                <SectionHeading title="Select Model" subtitle="Choose a model for generating annotations" />
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div className="ui-section-title">YOLOv8n.pt</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button className="text-[length:var(--font-sm)] font-semibold text-primary" type="button">
                      Manage Models
                    </button>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <DataChip label="Type" value="Object Detection" />
                  <DataChip label="Classes" value="80" />
                  <DataChip label="Input Size" value="640 × 640" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="space-y-4 p-4">
              <SectionHeading title="Advanced Options" />
              <div className="grid gap-5 xl:grid-cols-3">
                <SliderField label="Confidence Threshold" value="0.25" defaultValue={25} />
                <SliderField label="IoU Threshold" value="0.45" defaultValue={45} />
                <div className="space-y-2">
                  <label className="text-[length:var(--font-sm)] font-medium text-slate-700">Max Detections per Image</label>
                  <SelectStub label="300" className="w-full" />
                </div>
              </div>
              <button className="inline-flex items-center gap-2 text-[length:var(--font-sm)] font-semibold text-slate-700" type="button">
                More Options
                <ChevronDown className="h-4 w-4" />
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-4">
              <SectionHeading title="Dataset Summary" subtitle="Split to process" />
              <div className="grid gap-4 md:grid-cols-4">
                <SplitCard title="Train" subtitle="94,000 images" active />
                <SplitCard title="Validation" subtitle="12,000 images" />
                <SplitCard title="Test" subtitle="12,000 images" />
                <SplitCard title="Custom" subtitle="Select specific images" />
              </div>
              <div className="grid gap-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-4 md:grid-cols-3">
                <SummaryInfo label="Estimated time" value="~1h 24m" subtitle="Estimated based on your hardware and settings" />
                <SummaryInfo label="Processing Speed" value="~12 images/sec" subtitle="On NVIDIA GeForce RTX 4060 Ti" />
                <SummaryInfo label="Storage Required" value="~24.5 GB" subtitle="For annotations and metadata" />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-3">
            <Button variant="secondary" className="h-11 gap-2 border border-slate-200 bg-white">
              <TimerReset className="h-4 w-4" />
              Reset
            </Button>
            <div className="text-right">
              <Button className="h-11 gap-2 px-6">
                Start AutoLabel
                <ArrowRight className="h-4 w-4" />
              </Button>
              <div className="ui-meta mt-2">You can pause or stop anytime</div>
            </div>
          </div>
        </div>

        <div className="min-h-0 space-y-4 overflow-auto pr-1">
          <Card>
            <CardContent className="space-y-5 p-4">
              <div className="ui-section-title">AutoLabel Settings</div>
              <div className="space-y-3">
                <div className="ui-card-title text-slate-700">Device</div>
                <ChoiceCard active title="Auto (Recommended)" subtitle="Use GPU if available" badge="Recommended" />
                <ChoiceCard title="GPU" subtitle="NVIDIA GeForce RTX 4060 Ti" sideBadge="8 GB VRAM" />
                <ChoiceCard title="CPU" subtitle="Use system CPU" />
              </div>

              <div className="space-y-3 border-t border-slate-100 pt-4">
                <div className="ui-card-title text-slate-700">Processing Options</div>
                <CheckRow checked label="Skip already annotated images" subtitle="Do not overwrite existing labels" />
                <CheckRow label="Only unlabeled images" subtitle="Process only images without annotations" />
                <CheckRow checked label="Save as new version" subtitle="Create a new version with auto-label results" />
                <CheckRow label="Apply Non-Maximum Suppression (NMS)" subtitle="Remove overlapping boxes" />
              </div>

              <div className="space-y-3 border-t border-slate-100 pt-4">
                <div className="ui-card-title text-slate-700">Output Settings</div>
                <FieldGroup label="Save Annotations to">
                  <SelectStub label="New Version" className="w-full" />
                </FieldGroup>
                <FieldGroup label="Version Name (Optional)">
                  <input
                    className="form-input h-11 rounded-xl"
                    defaultValue="AutoLabel_YOLOv8n_2025-05-18"
                    type="text"
                  />
                </FieldGroup>
              </div>

              <div className="space-y-2 pt-2">
                <Button className="h-12 w-full gap-2">
                  <Eye className="h-4 w-4" />
                  Preview AutoLabel
                </Button>
                <div className="ui-meta text-center">Review results on sample images before running</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

export function TrainingPage() {
  return (
    <section className="ui-page h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden">
      <PageIntro title="Training" subtitle="Train your models on the selected dataset" />
      <TabBar tabs={["Overview", "Configuration", "Logs", "Artifacts", "TensorBoard", "Hyperparameters"]} active="Overview" />

      <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(270px,300px)]">
        <div className="min-h-0 space-y-4 overflow-auto pr-1">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MiniMetricCard icon={Activity} label="Status" value="Running" subtitle="Training in progress" accent="text-emerald-500" />
            <MiniMetricCard icon={Gauge} label="Epoch" value="24 / 50" subtitle={<ProgressMini progress={48} />} />
            <MiniMetricCard icon={Clock3} label="Elapsed Time" value="01:23:45" subtitle="Started 10:15:30 AM" />
            <MiniMetricCard icon={TimerReset} label="ETA" value="01:47:12" subtitle="Estimated time left" />
            <MiniMetricCard icon={Zap} label="Best mAP@0.5" value="0.92" subtitle="At epoch 21" />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardContent className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <SectionHeading title="Training Metrics" />
                  <div className="flex items-center gap-2">
                    <SelectStub label="mAP@0.5" />
                    <IconSquare active>
                      <Activity className="h-4 w-4" />
                    </IconSquare>
                    <IconSquare>
                      <ListFilter className="h-4 w-4" />
                    </IconSquare>
                    <IconSquare>
                      <ArrowUpRight className="h-4 w-4" />
                    </IconSquare>
                  </div>
                </div>
                <ChartPanel className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trainingMetricData}>
                      <CartesianGrid stroke="#E8EEF6" vertical={false} />
                      <XAxis axisLine={false} dataKey="epoch" tick={{ fill: "#98A2B3", fontSize: 11 }} tickLine={false} />
                      <YAxis axisLine={false} domain={[0, 1]} tick={{ fill: "#98A2B3", fontSize: 11 }} tickLine={false} />
                      <Tooltip />
                      <Line dataKey="train" dot={false} name="mAP@0.5" stroke="#2F6DF6" strokeWidth={2.5} type="monotone" />
                      <Line dataKey="val" dot={false} name="mAP@0.5 (val)" stroke="#8CB1FF" strokeDasharray="4 4" strokeWidth={2.2} type="monotone" />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartPanel>
                <div className="mt-3 flex items-center justify-center gap-5 text-[length:var(--font-xs)] text-slate-500">
                  <LegendDot color="#2F6DF6" label="mAP@0.5" />
                  <LegendDot color="#8CB1FF" label="mAP@0.5 (val)" dashed />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <SectionHeading title="Loss Curves" />
                  <SelectStub label="All Losses" />
                </div>
                <div className="mb-2 flex flex-wrap items-center justify-end gap-5 text-[length:var(--font-xs)] text-slate-500">
                  <LegendDot color="#2F6DF6" label="Box Loss" />
                  <LegendDot color="#9B6CFF" label="Object Loss" />
                  <LegendDot color="#22C55E" label="Class Loss" />
                </div>
                <ChartPanel className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trainingLossData}>
                      <CartesianGrid stroke="#E8EEF6" vertical={false} />
                      <XAxis axisLine={false} dataKey="epoch" tick={{ fill: "#98A2B3", fontSize: 11 }} tickLine={false} />
                      <YAxis axisLine={false} tick={{ fill: "#98A2B3", fontSize: 11 }} tickLine={false} />
                      <Tooltip />
                      <Line dataKey="box" dot={false} stroke="#2F6DF6" strokeWidth={2.4} type="monotone" />
                      <Line dataKey="object" dot={false} stroke="#9B6CFF" strokeWidth={2.4} type="monotone" />
                      <Line dataKey="cls" dot={false} stroke="#22C55E" strokeWidth={2.4} type="monotone" />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartPanel>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-4">
              <SectionHeading title="Training Progress" />
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full border-collapse text-left">
                  <thead className="bg-slate-50 text-[length:var(--font-xs)] font-semibold text-slate-500">
                    <tr>
                      {["Epoch", "mAP@0.5", "mAP@0.5:0.95", "Precision", "Recall", "Box Loss", "Obj Loss", "Cls Loss", "Time"].map((header) => (
                        <th key={header} className="px-4 py-3">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-[length:var(--font-sm)] text-slate-600">
                    {trainingRows.map((row) => (
                      <tr key={row[0]} className="border-t border-slate-100">
                        {row.map((cell, index) => (
                          <td
                            key={`${row[0]}-${index}`}
                            className={cn(
                              "px-4 py-3",
                              row[0].includes("current") && index === 0 && "font-semibold text-primary",
                              row[0] === "21" && index > 0 && index < 8 && "font-semibold text-emerald-600",
                            )}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="mt-4 inline-flex items-center gap-2 text-[length:var(--font-sm)] font-semibold text-primary" type="button">
                Show more
                <ChevronDown className="h-4 w-4" />
              </button>
            </CardContent>
          </Card>
        </div>

        <div className="min-h-0 space-y-4 overflow-auto pr-1">
          <Card>
            <CardContent className="space-y-4 p-4">
              <SectionHeading title="Training Information" />
              <InfoList
                items={[
                  ["Model", "YOLOv8m"],
                  ["Dataset", "Coco Dataset v1.2 (v1.2)"],
                  ["Data Split", "Train (94,400 images)"],
                  ["Image Size", "640 × 640"],
                  ["Batch Size", "16"],
                  ["Optimizer", "SGD"],
                  ["Learning Rate", "0.01"],
                  ["Device", "0: NVIDIA RTX 4090 (24GB)"],
                  ["AMP", "Enabled"],
                  ["Seed", "42"],
                ]}
              />
              <Button variant="secondary" className="h-11 w-full gap-2 border border-slate-200 bg-white">
                <Settings2 className="h-4 w-4" />
                Edit Configuration
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-4">
              <SectionHeading title="Controls" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Button className="h-11 gap-2 bg-rose-500 shadow-none hover:bg-rose-600">
                  <Square className="h-4 w-4" />
                  Stop Training
                </Button>
                <Button variant="secondary" className="h-11 gap-2 border border-slate-200 bg-white">
                  <Activity className="h-4 w-4" />
                  Pause
                </Button>
                <Button variant="secondary" className="h-11 gap-2 border border-slate-200 bg-white">
                  <Save className="h-4 w-4" />
                  Save Checkpoint
                </Button>
                <Button variant="secondary" className="h-11 gap-2 border border-slate-200 bg-white">
                  <FileDown className="h-4 w-4" />
                  Export Logs
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <SectionHeading title="Recent Checkpoints" />
                <button className="text-[length:var(--font-sm)] font-semibold text-primary" type="button">
                  View all
                </button>
              </div>
              {[
                ["epoch_24.pt", "Latest", "10:24:31 AM", "128.4 MB"],
                ["epoch_20.pt", "", "10:15:12 AM", "128.1 MB"],
                ["epoch_15.pt", "", "10:05:43 AM", "127.8 MB"],
              ].map(([name, badge, time, size]) => (
                <div key={name} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="ui-card-title truncate">{name}</div>
                      {badge ? <Badge tone="success">{badge}</Badge> : null}
                    </div>
                    <div className="ui-meta mt-1">
                      {time} • {size}
                    </div>
                  </div>
                  <button className="text-slate-400" type="button">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

export function AutoMLPage() {
  return (
    <section className="ui-page h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden">
      <div className="flex items-center gap-3">
        <PageIntro title="AutoML" subtitle="Automatically find the best model and hyperparameters for your dataset" />
        <Badge className="mt-1">Beta</Badge>
      </div>
      <TabBar tabs={["Overview", "Runs", "Compare", "Leaderboard", "Settings"]} active="Overview" />

      <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(290px,330px)]">
        <div className="min-h-0 space-y-4 overflow-auto pr-1">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MiniMetricCard icon={Zap} label="Best Metrics (mAP@0.5)" value="0.912" subtitle="YOLOv8s • Run #12" />
            <MiniMetricCard icon={Activity} label="Total Runs" value="24" subtitle="Completed: 18 • Running: 2" />
            <MiniMetricCard icon={Clock3} label="Total Time" value="6h 42m" subtitle="Total compute time" />
            <MiniMetricCard icon={Sparkles} label="Estimated Cost" value="$3.24" subtitle="Based on your hardware" />
          </div>

          <Card>
            <CardContent className="p-4">
              <SectionHeading title="Top Runs" />
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full border-collapse text-left">
                  <thead className="bg-slate-50 text-[length:var(--font-xs)] font-semibold text-slate-500">
                    <tr>
                      {["Rank", "Run", "Model", "mAP@0.5", "mAP@0.5:0.95", "Precision", "Recall", "Params", "Epochs", "Time", "Status"].map((header) => (
                        <th key={header} className="px-4 py-3">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-[length:var(--font-sm)] text-slate-600">
                    {automlRuns.map((row) => (
                      <tr key={row[1]} className="border-t border-slate-100">
                        {row.map((cell, index) => (
                          <td key={`${row[1]}-${index}`} className="px-4 py-3">
                            {index === 10 ? <Badge tone={cell === "Running" ? "info" : "success"}>{cell}</Badge> : cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="mt-4 inline-flex items-center gap-2 text-[length:var(--font-sm)] font-semibold text-primary" type="button">
                View all runs
                <ArrowRight className="h-4 w-4" />
              </button>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr_280px]">
            <Card>
              <CardContent className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <SectionHeading title="Performance Over Time" />
                  <SelectStub label="mAP@0.5" />
                </div>
                <ChartPanel className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={automlPerformanceData}>
                      <CartesianGrid stroke="#E8EEF6" vertical={false} />
                      <XAxis axisLine={false} dataKey="time" tick={{ fill: "#98A2B3", fontSize: 11 }} tickLine={false} />
                      <YAxis axisLine={false} domain={[0, 1]} tick={{ fill: "#98A2B3", fontSize: 11 }} tickLine={false} />
                      <Tooltip />
                      <Line dataKey="y8s" dot={false} stroke="#2F6DF6" strokeWidth={2.2} type="monotone" />
                      <Line dataKey="y8m" dot={false} stroke="#EAB308" strokeWidth={2.2} type="monotone" />
                      <Line dataKey="y8n" dot={false} stroke="#8B5CF6" strokeWidth={2.2} type="monotone" />
                      <Line dataKey="y8l" dot={false} stroke="#EF4444" strokeWidth={2.2} type="monotone" />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartPanel>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-[length:var(--font-xs)] text-slate-500">
                  <LegendDot color="#2F6DF6" label="YOLOv8s" />
                  <LegendDot color="#EAB308" label="YOLOv8m" />
                  <LegendDot color="#8B5CF6" label="YOLOv8n" />
                  <LegendDot color="#EF4444" label="YOLOv8l" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <SectionHeading title="Model Size vs Performance" />
                  <SelectStub label="All Models" />
                </div>
                <ChartPanel className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid stroke="#E8EEF6" />
                      <XAxis
                        axisLine={false}
                        dataKey="params"
                        name="Model Size (Parameters)"
                        tick={{ fill: "#98A2B3", fontSize: 11 }}
                        tickLine={false}
                        type="number"
                      />
                      <YAxis
                        axisLine={false}
                        dataKey="map"
                        domain={[0.3, 0.9]}
                        tick={{ fill: "#98A2B3", fontSize: 11 }}
                        tickLine={false}
                        type="number"
                      />
                      <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                      <Scatter data={automlScatterData} fill="#2F6DF6" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </ChartPanel>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-4">
                <SectionHeading title="Hyperparameter Importance" />
                {[
                  ["Image Size", 0.32],
                  ["Learning Rate", 0.24],
                  ["Batch Size", 0.18],
                  ["Weight Decay", 0.12],
                  ["Momentum", 0.08],
                  ["Augmentation", 0.06],
                ].map(([label, value]) => (
                  <ImportanceRow key={String(label)} label={String(label)} value={Number(value)} />
                ))}
                <button className="inline-flex items-center gap-2 text-[length:var(--font-sm)] font-medium text-primary" type="button">
                  <CircleHelp className="h-4 w-4" />
                  How it works?
                </button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="space-y-4 p-4">
              <SectionHeading title="About AutoML" subtitle="AutoML automatically searches for the best model architecture and hyperparameters for your dataset." />
              <div className="grid gap-4 md:grid-cols-4">
                <FeatureTile icon={Search} title="Smart Search" subtitle="Uses Bayesian Optimization to find the best configurations" />
                <FeatureTile icon={Layers3} title="Parallel Training" subtitle="Runs multiple trials in parallel to save time" />
                <FeatureTile icon={ShieldCheck} title="Early Stopping" subtitle="Automatically stops unpromising trials" />
                <FeatureTile icon={CheckCircle2} title="Reproducible" subtitle="All runs are fully reproducible and versioned" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="min-h-0 space-y-4 overflow-auto pr-1">
          <Card>
            <CardContent className="space-y-4 p-4">
              <SectionHeading title="Start AutoML Run" subtitle="Configure and start a new AutoML experiment" />
              <FieldGroup label="Search Space">
                <SelectStub label="YOLO (Detection)" className="w-full" />
              </FieldGroup>
              <FieldGroup label="Model Family">
                <SelectStub label="YOLOv8" className="w-full" />
              </FieldGroup>
              <FieldGroup label="Optimization Metric">
                <SelectStub label="mAP@0.5" className="w-full" />
              </FieldGroup>
              <FieldGroup label="Time Budget">
                <SelectStub label="4 hours" className="w-full" />
              </FieldGroup>
              <FieldGroup label="Max Trials">
                <input className="form-input h-11 rounded-xl" defaultValue="30" type="text" />
                <div className="ui-meta mt-2">Maximum number of different configurations to try</div>
              </FieldGroup>
              <button className="inline-flex items-center gap-2 text-[length:var(--font-sm)] font-semibold text-slate-700" type="button">
                Advanced Options
                <ChevronDown className="h-4 w-4" />
              </button>
              <Button className="h-12 w-full gap-2">
                <Play className="h-4 w-4" />
                Start AutoML
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <SectionHeading title="Recent AutoML Runs" />
                <button className="text-[length:var(--font-sm)] font-semibold text-primary" type="button">
                  View All
                </button>
              </div>
              {[
                ["AutoML Run #24", "YOLOv8s • 18 / 30 trials", "Running"],
                ["AutoML Run #23", "YOLOv8m • 30 / 30 trials", "Completed"],
                ["AutoML Run #22", "YOLOv8n • 30 / 30 trials", "Completed"],
                ["AutoML Run #21", "YOLOv8l • 22 / 30 trials", "Failed"],
                ["AutoML Run #20", "YOLOv8s • 30 / 30 trials", "Completed"],
              ].map(([title, subtitle, status]) => (
                <div key={title} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-primary">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="ui-card-title truncate">{title}</div>
                    <div className="ui-meta mt-1">{subtitle}</div>
                  </div>
                  <Badge tone={status === "Failed" ? "danger" : status === "Running" ? "info" : "success"}>{status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

export function ExperimentsPage() {
  return (
    <section className="ui-page h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden">
      <PageIntro title="Experiments" subtitle="Track, compare and analyze your training and AutoML experiments" />
      <TabBar tabs={["Overview", "Experiments", "Compare", "Traces", "Artifacts"]} active="Overview" />

      <div className="grid min-h-0 gap-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <MiniMetricCard icon={FileText} label="Total Experiments" value="128" subtitle="↑ 18 this week" />
          <MiniMetricCard icon={CheckCircle2} label="Completed" value="96" subtitle="75% of all runs" />
          <MiniMetricCard icon={Activity} label="Running" value="8" subtitle="6% of all runs" />
          <MiniMetricCard icon={Square} label="Failed" value="24" subtitle="19% of all runs" />
          <MiniMetricCard icon={Zap} label="Best mAP@0.5" value="0.912" subtitle="YOLOv8s • Run #12" />
          <MiniMetricCard icon={Clock3} label="Total Compute Time" value="312h 45m" subtitle="↑ 56h this week" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SearchField placeholder="Search experiments..." className="min-w-[280px] flex-1 xl:max-w-[360px]" />
          <SelectStub label="All Types" />
          <SelectStub label="All Status" />
          <SelectStub label="All Models" />
          <SelectStub label="All Datasets" />
          <button className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[length:var(--font-sm)] font-medium text-slate-600" type="button">
            <Clock3 className="h-4 w-4" />
            May 11 – May 18, 2025
          </button>
          <IconSquare active>
            <Activity className="h-4 w-4" />
          </IconSquare>
          <IconSquare>
            <ListFilter className="h-4 w-4" />
          </IconSquare>
          <Button variant="secondary" className="h-11 gap-2 border border-slate-200 bg-white">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(270px,300px)]">
          <div className="min-h-0 space-y-4 overflow-auto pr-1">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-hidden rounded-[18px]">
                  <table className="w-full border-collapse text-left">
                    <thead className="bg-slate-50 text-[length:var(--font-xs)] font-semibold text-slate-500">
                      <tr>
                        {["Name", "Type", "Model", "Dataset", "Best mAP@0.5", "Status", "Created At", "Duration", "Actions"].map((header) => (
                          <th key={header} className="px-4 py-4">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="text-[length:var(--font-sm)] text-slate-600">
                      {experiments.map((row) => (
                        <tr key={row[0]} className="border-t border-slate-100">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-primary">{row[0]}</div>
                            <div className="ui-meta mt-1">ID: exp_ab1c23d4</div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone={row[1] === "AutoML" ? "warning" : "default"}>{row[1]}</Badge>
                          </td>
                          <td className="px-4 py-3">{row[2]}</td>
                          <td className="px-4 py-3">{row[3]}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-emerald-600">{row[4]}</div>
                            {row[5] ? <div className="mt-1 text-[length:var(--font-xs)] text-rose-500">{row[5]}</div> : null}
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone={row[6] === "Failed" ? "danger" : row[6] === "Running" ? "info" : "success"}>{row[6]}</Badge>
                          </td>
                          <td className="px-4 py-3">{row[7]}</td>
                          <td className="px-4 py-3">{row[8]}</td>
                          <td className="px-4 py-3 text-slate-400">
                            <MoreHorizontal className="h-4 w-4" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[length:var(--font-xs)] text-slate-400">
                  <span>Showing 1 to 8 of 128 experiments</span>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3].map((page) => (
                      <button
                        key={page}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg border text-[length:var(--font-sm)]",
                          page === 1 ? "border-blue-200 bg-blue-50 text-primary" : "border-slate-200 bg-white text-slate-500",
                        )}
                        type="button"
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-4">
                <TabBar tabs={["Metrics", "Charts", "System", "Artifacts", "Logs", "Config", "Notes"]} active="Metrics" />
                <div className="grid gap-4 xl:grid-cols-[260px_1fr_1fr]">
                  <Card className="border border-slate-200 shadow-none">
                    <CardContent className="space-y-3 p-4">
                      <div className="ui-card-title">Key Metrics (Best)</div>
                      {[
                        ["mAP@0.5", "0.912", "↑ 2.1%"],
                        ["mAP@0.5:0.95", "0.672", "↑ 1.8%"],
                        ["Precision", "0.934", "↑ 1.4%"],
                        ["Recall", "0.881", "↑ 1.6%"],
                        ["F1 Score", "0.906", "↑ 1.7%"],
                      ].map(([label, value, delta]) => (
                        <div key={label} className="flex items-center justify-between text-[length:var(--font-sm)]">
                          <span className="text-slate-500">{label}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-slate-900">{value}</span>
                            <span className="text-emerald-600">{delta}</span>
                          </div>
                        </div>
                      ))}
                      <Button variant="secondary" className="h-10 w-full border border-slate-200 bg-white">
                        View All Metrics
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border border-slate-200 shadow-none">
                    <CardContent className="p-4">
                      <SectionHeading title="mAP@0.5 over Epochs" />
                      <ChartPanel className="mt-4 h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={experimentMapData}>
                            <defs>
                              <linearGradient id="mapFill" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor="#2F6DF6" stopOpacity={0.28} />
                                <stop offset="100%" stopColor="#2F6DF6" stopOpacity={0.02} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid stroke="#E8EEF6" vertical={false} />
                            <XAxis axisLine={false} dataKey="epoch" tick={{ fill: "#98A2B3", fontSize: 11 }} tickLine={false} />
                            <YAxis axisLine={false} domain={[0, 1.2]} tick={{ fill: "#98A2B3", fontSize: 11 }} tickLine={false} />
                            <Tooltip />
                            <Area dataKey="value" fill="url(#mapFill)" stroke="#2F6DF6" strokeWidth={2.2} type="monotone" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </ChartPanel>
                    </CardContent>
                  </Card>

                  <Card className="border border-slate-200 shadow-none">
                    <CardContent className="p-4">
                      <SectionHeading title="Loss over Epochs" />
                      <ChartPanel className="mt-4 h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={experimentLossData}>
                            <CartesianGrid stroke="#E8EEF6" vertical={false} />
                            <XAxis axisLine={false} dataKey="epoch" tick={{ fill: "#98A2B3", fontSize: 11 }} tickLine={false} />
                            <YAxis axisLine={false} tick={{ fill: "#98A2B3", fontSize: 11 }} tickLine={false} />
                            <Tooltip />
                            <Line dataKey="box" dot={false} stroke="#2F6DF6" strokeWidth={2.2} type="monotone" />
                            <Line dataKey="obj" dot={false} stroke="#22C55E" strokeWidth={2.2} type="monotone" />
                            <Line dataKey="cls" dot={false} stroke="#8B5CF6" strokeWidth={2.2} type="monotone" />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartPanel>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="min-h-0 space-y-4 overflow-auto pr-1">
            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="flex items-start justify-between">
                  <SectionHeading title="Selected Experiment" />
                  <button className="text-slate-400" type="button">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
                <div>
                  <div className="ui-stat-value">YOLOv8s - AutoML Run #12</div>
                  <div className="ui-meta mt-1">ID: exp_8f3d2a1e</div>
                </div>
                <InfoList
                  items={[
                    ["Type", "AutoML"],
                    ["Model", "YOLOv8s"],
                    ["Dataset", "Coco Dataset v1.2"],
                    ["Created At", "May 18, 2025, 10:32 AM"],
                    ["Duration", "45m 12s"],
                    ["Best mAP@0.5", "0.912"],
                  ]}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button variant="secondary" className="h-11 gap-2 border border-blue-200 bg-blue-50 text-primary">
                    <Play className="h-4 w-4" />
                    Open in Training
                  </Button>
                  <Button variant="secondary" className="h-11 gap-2 border border-slate-200 bg-white">
                    <Activity className="h-4 w-4" />
                    Compare
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 p-4">
                <SectionHeading title="Latest Artifact" />
                <div className="rounded-2xl border border-slate-100 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
                      <FileText className="h-5 w-5 text-slate-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="ui-card-title">best.pt</div>
                      <div className="ui-meta mt-1">Size: 28.7 MB • Updated: May 18, 10:59 AM</div>
                    </div>
                    <Badge tone="success">Best Model</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 p-4">
                <SectionHeading title="Tags" />
                <div className="flex flex-wrap gap-2">
                  {["yolov8s", "automl", "baseline", "coco", "exp12"].map((tag) => (
                    <span key={tag} className="rounded-lg bg-slate-50 px-3 py-1.5 text-[length:var(--font-sm)] font-medium text-slate-600">
                      {tag}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 p-4">
                <SectionHeading title="Notes" />
                <textarea
                  className="min-h-[120px] w-full rounded-2xl border border-slate-200 p-3 text-[length:var(--font-sm)] outline-none"
                  placeholder="Add a note for this experiment..."
                />
                <div className="flex justify-end">
                  <Button className="h-10 px-4">Save Note</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ModelsPage() {
  return (
    <section className="ui-page h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden">
      <PageIntro title="Models" subtitle="Manage, evaluate and deploy your trained models" />
      <TabBar tabs={["All Models", "Deployments", "Model Registry", "Exports"]} active="All Models" />

      <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(270px,300px)]">
        <div className="min-h-0 space-y-4 overflow-auto pr-1">
          <div className="flex flex-wrap items-center gap-3">
            <SearchField placeholder="Search models..." className="min-w-[240px] flex-1 xl:max-w-[360px]" />
            <SelectStub label="All Types" />
            <SelectStub label="All Frameworks" />
            <SelectStub label="All Status" />
            <SelectStub label="All Datasets" />
            <SelectStub label="Sort: Newest First" className="ml-auto" />
            <Button variant="secondary" className="h-11 gap-2 border border-slate-200 bg-white">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </Button>
          </div>

          {models.map((model) => (
            <Card key={model.name}>
              <CardContent className="flex gap-4 p-4">
                <div className="w-[132px]">
                  <ModelCover palette={model.palette} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        {model.name.includes("Best Model") ? <Badge tone="warning">Best Model</Badge> : null}
                        <Badge tone={model.status === "Archived" ? "default" : "success"}>{model.status}</Badge>
                      </div>
                      <div className="ui-section-title">{model.name}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[length:var(--font-sm)] text-slate-500">
                        <span>{model.type}</span>
                        <span>•</span>
                        <span>{model.model}</span>
                        <span>•</span>
                        <span>{model.framework}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[length:var(--font-xs)]">
                        <span className="rounded-lg bg-blue-50 px-2.5 py-1 font-medium text-primary">{model.dataset}</span>
                        <span className="rounded-lg bg-slate-50 px-2.5 py-1 font-medium text-slate-500">{model.source}</span>
                      </div>
                      <div className="ui-meta mt-3">
                        Created: {model.created} • Size: {model.size} • {model.version}
                      </div>
                    </div>
                    <button className="text-slate-400" type="button">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4 xl:grid-cols-[220px_90px_90px_90px_1fr_160px]">
                    <MetricBlock label={model.metricLabel} value={model.metricValue} />
                    <MetricBlock label="Precision" value={model.precision} compact />
                    <MetricBlock label="Recall" value={model.recall} compact />
                    <MetricBlock label="F1 Score" value={model.f1} compact />
                    <ChartPanel className="h-[80px] border border-slate-100">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={modelSparkline}>
                          <defs>
                            <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
                              <stop offset="0%" stopColor="#4ADE80" stopOpacity={0.26} />
                              <stop offset="100%" stopColor="#4ADE80" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <Area dataKey="value" fill="url(#sparkFill)" stroke="#22C55E" strokeWidth={2} type="monotone" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartPanel>
                    <div className="space-y-2">
                      <Button className="h-9 w-full gap-2 px-4">
                        <Rocket className="h-4 w-4" />
                        {model.action}
                      </Button>
                      <div className="grid grid-cols-[1fr_42px] gap-2">
                        <Button variant="secondary" className="h-9 gap-2 border border-slate-200 bg-white">
                          <Activity className="h-4 w-4" />
                          Evaluate
                        </Button>
                        <Button variant="secondary" className="h-9 border border-slate-200 bg-white px-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex items-center justify-between pb-2 text-[length:var(--font-xs)] text-slate-400">
            <span>Showing 1 to 5 of 42 models</span>
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((page) => (
                <button
                  key={page}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg border text-[length:var(--font-sm)]",
                    page === 1 ? "border-blue-200 bg-blue-50 text-primary" : "border-slate-200 bg-white text-slate-500",
                  )}
                  type="button"
                >
                  {page}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="min-h-0 space-y-4 overflow-auto pr-1">
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex items-start justify-between">
                <SectionHeading title="Selected Model" />
                <button className="text-slate-400" type="button">
                  ×
                </button>
              </div>
              <div className="flex gap-3">
                <div className="w-[66px]">
                  <ModelCover palette={models[0].palette} compact />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge tone="warning">Best Model</Badge>
                    <Badge tone="success">Ready</Badge>
                  </div>
                  <div className="ui-stat-value mt-2">{models[0].name}</div>
                  <div className="ui-meta mt-1">ID: mdl_01JXZG6AK2P3Q7T6E0M5</div>
                </div>
              </div>
              <InfoList
                items={[
                  ["Type", models[0].type],
                  ["Framework", models[0].framework],
                  ["Model", models[0].model],
                  ["Dataset", models[0].dataset],
                  ["Source", "AutoML Run #12"],
                  ["Created At", "May 18, 2025, 10:32 AM"],
                  ["Updated At", "May 18, 2025, 10:32 AM"],
                  ["Size", models[0].size],
                  ["File", "best.pt"],
                ]}
              />
              <Card className="border border-slate-200 shadow-none">
                <CardContent className="p-4">
                  <SectionHeading title="Performance (Test Set)" />
                  <div className="mt-4 grid gap-2 text-[length:var(--font-sm)]">
                    {[
                      ["mAP@0.5", "0.912"],
                      ["mAP@0.5:0.95", "0.672"],
                      ["Precision", "0.934"],
                      ["Recall", "0.881"],
                      ["F1 Score", "0.906"],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-slate-500">{label}</span>
                        <span className="font-semibold text-emerald-600">{value}</span>
                      </div>
                    ))}
                  </div>
                  <button className="mt-4 text-[length:var(--font-sm)] font-semibold text-primary" type="button">
                    View all metrics
                  </button>
                </CardContent>
              </Card>
              <div className="space-y-3">
                <SectionHeading title="Actions" />
                <Button className="h-11 w-full gap-2">
                  <Rocket className="h-4 w-4" />
                  Deploy Model
                </Button>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button variant="secondary" className="h-11 gap-2 border border-slate-200 bg-white">
                    <Activity className="h-4 w-4" />
                    Evaluate on Dataset
                  </Button>
                  <Button variant="secondary" className="h-11 gap-2 border border-slate-200 bg-white">
                    <Download className="h-4 w-4" />
                    Download Model
                  </Button>
                  <Button variant="secondary" className="h-11 gap-2 border border-slate-200 bg-white">
                    <Upload className="h-4 w-4" />
                    Export
                  </Button>
                  <Button variant="secondary" className="h-11 gap-2 border border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100">
                    Delete Model
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                <SectionHeading title="Related" />
                {[
                  ["Experiment", "AutoML Run #12"],
                  ["Dataset", "Coco Dataset v1.2"],
                  ["Logs", "View training logs"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between text-[length:var(--font-sm)]">
                    <span className="text-slate-500">{label}</span>
                    <button className="inline-flex items-center gap-2 font-medium text-primary" type="button">
                      {value}
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

export function ComingSoonPage({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <section className="ui-page-centered flex h-full w-full items-center justify-center">
      <Card className="w-full max-w-[680px]">
        <CardContent className="space-y-4 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-primary">
            <Boxes className="h-7 w-7" />
          </div>
          <div className="text-[28px] font-semibold tracking-[-0.04em] text-slate-900">{title}</div>
          <p className="mx-auto max-w-[480px] text-[length:var(--font-md)] leading-7 text-slate-500">{description}</p>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-[length:var(--font-sm)] text-slate-500">
            Static UI screen only for now. Functional actions will be connected later.
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function PageIntro({ subtitle, title }: { subtitle: string; title: string }) {
  return (
    <div>
      <h1 className="ui-title">{title}</h1>
      <p className="ui-subtitle mt-1">{subtitle}</p>
    </div>
  );
}

function TabBar({ active, tabs }: { active: string; tabs: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-6 border-b border-slate-200/80">
      {tabs.map((tab) => (
        <button
          key={tab}
          className={cn(
            "border-b-2 pb-3 text-[length:var(--font-sm)] font-medium transition-colors",
            tab === active ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-900",
          )}
          type="button"
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

function SearchField({ className, placeholder }: { className?: string; placeholder: string }) {
  return (
    <label className={cn("flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-slate-400", className)}>
      <Search className="h-4 w-4" />
      <input
        className="min-w-0 flex-1 bg-transparent text-[length:var(--font-sm)] text-slate-700 outline-none placeholder:text-slate-400"
        placeholder={placeholder}
        type="search"
      />
    </label>
  );
}

function SelectStub({ className, label }: { className?: string; label: string }) {
  return (
    <button
      className={cn(
        "flex h-11 min-w-[154px] items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 text-[length:var(--font-sm)] font-medium text-slate-600",
        className,
      )}
      type="button"
    >
      <span>{label}</span>
      <ChevronDown className="h-4 w-4 text-slate-400" />
    </button>
  );
}

function IconSquare({
  active,
  children,
}: {
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-xl border text-slate-500 transition-colors",
        active ? "border-blue-200 bg-blue-50 text-primary" : "border-slate-200 bg-white hover:bg-slate-50",
      )}
      type="button"
    >
      {children}
    </button>
  );
}

function SectionHeading({ subtitle, title }: { subtitle?: string; title: string }) {
  return (
    <div>
      <div className="ui-section-title">{title}</div>
      {subtitle ? <div className="ui-subtitle mt-1">{subtitle}</div> : null}
    </div>
  );
}

function MiniMetricCard({
  accent,
  icon: Icon,
  label,
  subtitle,
  value,
}: {
  accent?: string;
  icon: typeof Activity;
  label: string;
  subtitle: ReactNode;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="grid grid-cols-[44px_1fr] gap-3 p-4">
        <div className="summary-icon h-11 w-11">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="ui-label">{label}</div>
          <div className={cn("ui-stat-value mt-1", accent)}>{value}</div>
          <div className="ui-meta mt-2">{subtitle}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressMini({ progress }: { progress: number }) {
  return (
    <div className="space-y-2">
      <div className="h-1.5 rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function ChartPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl bg-white", className)}>{children}</div>;
}

function LegendDot({ color, dashed, label }: { color: string; dashed?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn("inline-flex h-0.5 w-4 items-center rounded-full", dashed && "border-t-2 border-dashed bg-transparent")}
        style={dashed ? { borderColor: color } : { backgroundColor: color }}
      />
      <span>{label}</span>
    </div>
  );
}

function ThumbnailMosaic({ label, palette }: { label: string; palette: string[] }) {
  return (
    <div className="grid w-[214px] grid-cols-3 gap-2">
      {palette.map((color, index) => (
        <div
          key={`${color}-${index}`}
          className="relative h-[58px] overflow-hidden rounded-xl"
          style={{ background: `linear-gradient(145deg, ${color} 0%, rgba(255,255,255,0.12) 100%)` }}
        >
          <div className="absolute inset-x-3 top-2 h-4 rounded-full bg-white/14" />
          <div className="absolute bottom-2 left-3 h-5 w-7 rounded-lg border border-white/18 bg-white/12" />
          <div className="absolute bottom-2 right-3 h-3 w-3 rounded-full bg-white/18" />
          {index === palette.length - 1 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/25 text-[length:var(--font-xl)] font-semibold text-white">{label}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function StatInline({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileImage;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 text-slate-300" />
      <div>
        <div className="ui-card-title">{value}</div>
        <div className="ui-meta mt-1">{label}</div>
      </div>
    </div>
  );
}

function SidebarInfoCard({
  action,
  compact,
  items,
  title,
}: {
  action?: string;
  compact?: boolean;
  items: string[][];
  title: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div className="ui-section-title">{title}</div>
          {action ? <button className="text-[length:var(--font-sm)] font-semibold text-primary" type="button">{action}</button> : null}
        </div>
        <div className="space-y-3">
          {items.map(([name, subtitle, meta]) => (
            <div key={`${title}-${name}`} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-primary">
                {compact ? <Activity className="h-5 w-5" /> : <CircleHelp className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="ui-card-title">{name}</div>
                <div className="ui-meta mt-1">{subtitle}</div>
              </div>
              {meta ? <div className="ui-meta">{meta}</div> : <ChevronRight className="h-4 w-4 text-slate-300" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DataChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <div className="ui-meta">{label}</div>
      <div className="ui-card-title mt-1">{value}</div>
    </div>
  );
}

function SliderField({ defaultValue, label, value }: { defaultValue: number; label: string; value: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[length:var(--font-sm)] font-medium text-slate-700">
        {label}
        <CircleHelp className="h-3.5 w-3.5 text-slate-300" />
      </div>
      <div className="flex items-center gap-4">
        <input className="w-full accent-primary" defaultValue={defaultValue} type="range" />
        <div className="flex h-11 min-w-[72px] items-center justify-center rounded-xl border border-slate-200 text-[length:var(--font-md)] font-medium text-slate-700">
          {value}
        </div>
      </div>
    </div>
  );
}

function SplitCard({ active, subtitle, title }: { active?: boolean; subtitle: string; title: string }) {
  return (
    <div className={cn("rounded-2xl border p-4", active ? "border-blue-300 bg-blue-50/40" : "border-slate-200 bg-white")}>
      <div className="ui-section-title">{title}</div>
      <div className="ui-subtitle mt-1">{subtitle}</div>
    </div>
  );
}

function SummaryInfo({ label, subtitle, value }: { label: string; subtitle: string; value: string }) {
  return (
    <div className="space-y-2 border-r border-blue-100 pr-4 last:border-r-0 last:pr-0">
      <div className="ui-label">{label}</div>
      <div className="ui-stat-value text-primary">{value}</div>
      <div className="ui-meta">{subtitle}</div>
    </div>
  );
}

function ChoiceCard({
  active,
  badge,
  sideBadge,
  subtitle,
  title,
}: {
  active?: boolean;
  badge?: string;
  sideBadge?: string;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
      <div className={cn("flex h-5 w-5 items-center justify-center rounded-full border", active ? "border-primary bg-primary text-white" : "border-slate-300")}>
        {active ? <Check className="h-3 w-3" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="ui-card-title">{title}</span>
          {badge ? <Badge>{badge}</Badge> : null}
        </div>
        <div className="ui-meta mt-1">{subtitle}</div>
      </div>
      {sideBadge ? <Badge tone="success">{sideBadge}</Badge> : null}
    </div>
  );
}

function CheckRow({ checked, label, subtitle }: { checked?: boolean; label: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className={cn("mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border", checked ? "border-primary bg-primary text-white" : "border-slate-300")}>
        {checked ? <Check className="h-3 w-3" /> : null}
      </div>
      <div>
        <div className="text-[length:var(--font-md)] font-medium text-slate-700">{label}</div>
        <div className="ui-meta mt-1">{subtitle}</div>
      </div>
    </div>
  );
}

function FieldGroup({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block">
      <div className="mb-2 text-[length:var(--font-sm)] font-medium text-slate-700">{label}</div>
      {children}
    </label>
  );
}

function ImportanceRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid grid-cols-[1fr_110px_40px] items-center gap-3 text-[length:var(--font-xs)]">
      <span className="text-slate-600">{label}</span>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-primary" style={{ width: `${value * 100}%` }} />
      </div>
      <span className="text-right text-slate-400">{value.toFixed(2)}</span>
    </div>
  );
}

function FeatureTile({
  icon: Icon,
  subtitle,
  title,
}: {
  icon: typeof Search;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl bg-slate-50/80 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="ui-card-title">{title}</div>
        <div className="ui-meta mt-1">{subtitle}</div>
      </div>
    </div>
  );
}

function InfoList({ items }: { items: string[][] }) {
  return (
    <div className="space-y-3">
      {items.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-3 text-[length:var(--font-sm)]">
          <span className="text-slate-500">{label}</span>
          <span className="text-right font-medium text-slate-800">{value}</span>
        </div>
      ))}
    </div>
  );
}

function ModelCover({ compact, palette }: { compact?: boolean; palette: string[] }) {
  return (
    <div className={cn("grid gap-2 rounded-2xl", compact ? "grid-cols-2" : "grid-cols-2")}>
      {palette.map((color, index) => (
        <div
          key={`${color}-${index}`}
          className={cn("relative overflow-hidden rounded-xl", compact ? "h-[52px]" : "h-[60px]")}
          style={{ background: `linear-gradient(145deg, ${color} 0%, rgba(255,255,255,0.12) 100%)` }}
        >
          <div className="absolute inset-x-2 top-2 h-3 rounded-full bg-white/18" />
          <div className="absolute bottom-2 left-2 h-4 w-6 rounded-lg border border-white/18 bg-white/12" />
          <div className="absolute bottom-2 right-2 h-2.5 w-2.5 rounded-full bg-white/18" />
        </div>
      ))}
    </div>
  );
}

function MetricBlock({ compact, label, value }: { compact?: boolean; label: string; value: string }) {
  return (
    <div>
      <div className="ui-meta">{label}</div>
      <div className={cn("mt-1 font-semibold tracking-[-0.04em] text-slate-900", compact ? "text-[length:var(--font-lg)]" : "text-[length:var(--font-xl)] text-emerald-600")}>
        {value}
      </div>
    </div>
  );
}
