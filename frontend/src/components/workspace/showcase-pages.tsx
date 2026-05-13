import React, { useState, useCallback, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  Bot,
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
  Plus,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Square,
  TimerReset,
  Workflow,
  Trash2,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useSettings, useUpdateSetting } from "@/hooks/useSettings";
import { usePipelines, useCreatePipeline, useDeletePipeline, useRunPipeline } from "@/hooks/usePipelines";
import { useDatasets } from "@/hooks/useDatasets";
import { useTrainingRuns, useCreateTrainingRun, useDeleteTrainingRun, useStartTrainingRun, useStopTrainingRun } from "@/hooks/useTraining";
import { useModels, useCreateModel, useDeleteModel } from "@/hooks/useModels";
import type { SettingItem, TrainingRunItem, ModelItem as ApiModelItem } from "@/lib/api";
import { resetDatabase, runAutoLabel, exportDatasetYolo } from "@/lib/api";


export function LabelingPage() {
  const { data: datasets = [], isLoading } = useDatasets();

  return (
    <section className="ui-page h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden">
      <PageIntro title="Labeling" subtitle="Select a dataset to start or continue annotation" />

      <div className="space-y-3">
        <TabBar tabs={["My Datasets", "Shared With Me"]} active="My Datasets" />
        <div className="flex flex-wrap items-center gap-3">
          <SearchField placeholder="Search datasets..." className="min-w-[280px] flex-1 xl:max-w-[420px]" />
          <SelectStub label="All Tasks" />
          <SelectStub label="All Status" />
          <SelectStub label="Sort: Recently Used" className="ml-auto" />
        </div>
      </div>

      <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(250px,280px)]">
        <div className="min-h-0 space-y-4 overflow-auto pr-1">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400">Loading datasets...</div>
          ) : datasets.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                  <ImageIcon className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="ui-section-title">No datasets yet</h3>
                <p className="mt-2 text-[length:var(--font-sm)] text-slate-500">Create a dataset in the Datasets page first, then come back here to start labeling.</p>
              </CardContent>
            </Card>
          ) : datasets.map((dataset) => {
            const imgCount = dataset.stats.images;
            const annCount = dataset.stats.annotations;
            const progress = imgCount > 0 ? Math.round((annCount / imgCount) * 100) : 0;
            return (
              <Card key={dataset.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <h3 className="ui-section-title">{dataset.name} {dataset.version}</h3>
                      <Badge tone={dataset.status === "Ready" ? "success" : "warning"}>{dataset.status}</Badge>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[length:var(--font-sm)] text-slate-500">
                    <span>{dataset.task}</span>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <span>{dataset.format}</span>
                  </div>
                  <div className="mt-4 grid gap-3 text-[length:var(--font-sm)] text-slate-500 md:grid-cols-4">
                    <StatInline icon={FileImage} value={String(imgCount)} label="Images" />
                    <StatInline icon={Layers3} value={String(dataset.stats.classes)} label="Classes" />
                    <StatInline icon={CheckCircle2} value={String(annCount)} label="Annotations" />
                    <StatInline icon={HardDrive} value={`${progress}%`} label="Progress" />
                  </div>
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <div className="mb-2 flex items-center justify-between text-[length:var(--font-sm)]">
                      <span className="font-medium text-slate-600">Annotation Progress</span>
                      <span className="text-slate-500">{progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          progress > 70 ? "bg-emerald-500" : progress > 40 ? "bg-blue-500" : "bg-amber-500",
                        )}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {datasets.length > 0 && <div className="ui-meta pb-2 text-center">Showing {datasets.length} dataset{datasets.length !== 1 ? "s" : ""}</div>}
        </div>

        <div className="min-h-0 space-y-4 overflow-auto pr-1">
          <SidebarInfoCard
            title="Labeling Guide"
            items={[
              ["How to annotate", "Best practices and guidelines"],
              ["Keyboard Shortcuts", "Speed up your labeling"],
              ["Annotation Standards", "Project-specific rules"],
            ]}
          />
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center gap-2 text-slate-900">
                <Sparkles className="h-4 w-4 text-violet-500" />
                <h3 className="ui-section-title">Tips</h3>
              </div>
              <p className="text-[length:var(--font-sm)] leading-6 text-slate-500">Use keyboard shortcuts to speed up annotation. Press Ctrl+Z to undo, arrow keys to navigate.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

export function AutoLabelPage() {
  const { data: datasets = [] } = useDatasets();
  const { data: apiModels = [] } = useModels();
  const queryClient = useQueryClient();
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ total_images: number; processed: number; skipped: number; total_detections: number; classes_added: string[]; errors: string[] } | null>(null);
  const [confidence, setConfidence] = useState(0.25);
  const [iouThreshold, setIouThreshold] = useState(0.45);
  const [skipAnnotated, setSkipAnnotated] = useState(true);

  const selectedDataset = datasets.find((d) => d.id === selectedDatasetId) ?? datasets[0] ?? null;
  const selectedModel = apiModels[0] ?? null;

  const handleStart = async () => {
    if (!selectedDataset) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await runAutoLabel({
        dataset_id: selectedDataset.id,
        confidence,
        iou_threshold: iouThreshold,
        skip_annotated: skipAnnotated,
      });
      setResult(res);
      queryClient.invalidateQueries();
    } catch (err) {
      alert(`AutoLabel failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunning(false);
    }
  };

  const currentStep = result ? 4 : running ? 3 : 1;

  return (
    <section className="ui-page h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <PageIntro title="AutoLabel" subtitle="Automatically generate annotations for your dataset using AI models" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,340px)]">
        <Card>
          <CardContent className="grid gap-4 p-4 sm:grid-cols-4">
            {[
              { step: "1", title: "Configure", subtitle: "Choose dataset and model" },
              { step: "2", title: "Preview", subtitle: "Review settings" },
              { step: "3", title: "Run", subtitle: "Processing images..." },
              { step: "4", title: "Results", subtitle: "Review annotations" },
            ].map(({ step, subtitle, title }) => (
              <div key={title} className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-[length:var(--font-sm)] font-semibold",
                    Number(step) <= currentStep ? "bg-primary text-white" : "bg-slate-100 text-slate-500",
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
          {datasets.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                  <ImageIcon className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="ui-section-title">No datasets available</h3>
                <p className="mt-2 text-[length:var(--font-sm)] text-slate-500">Create a dataset and add images first, then you can use AutoLabel to generate annotations.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                  <CardContent className="space-y-4 p-4">
                    <SectionHeading title="Select Dataset" subtitle="Choose the dataset you want to auto-annotate" />
                    <select
                      className="form-input h-11 w-full rounded-xl"
                      value={selectedDataset?.id ?? ""}
                      onChange={(e) => setSelectedDatasetId(Number(e.target.value))}
                    >
                      {datasets.map((d) => (
                        <option key={d.id} value={d.id}>{d.name} {d.version}</option>
                      ))}
                    </select>
                    <div className="grid gap-3 text-[length:var(--font-sm)] text-slate-500 md:grid-cols-4">
                      <StatInline icon={FileImage} value={selectedDataset ? String(selectedDataset.stats.images) : "0"} label="Images" />
                      <StatInline icon={Layers3} value={selectedDataset ? String(selectedDataset.stats.classes) : "0"} label="Classes" />
                      <StatInline icon={CheckCircle2} value={selectedDataset ? String(selectedDataset.stats.annotations) : "0"} label="Annotated" />
                      <StatInline icon={HardDrive} value={`${datasets.length} datasets`} label="Available" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="space-y-4 p-4">
                    <SectionHeading title="Model" subtitle="Pretrained YOLOv8 model" />
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                        <Bot className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="ui-section-title">YOLOv8n (Nano)</div>
                        <div className="ui-meta mt-1">80 COCO classes • Pretrained</div>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <DataChip label="Type" value="Object Detection" />
                      <DataChip label="Architecture" value="YOLOv8n" />
                      <DataChip label="Classes" value="80 (COCO)" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="space-y-4 p-4">
                  <SectionHeading title="Settings" />
                  <div className="grid gap-5 xl:grid-cols-3">
                    <SliderField label="Confidence Threshold" value={confidence.toFixed(2)} defaultValue={Math.round(confidence * 100)} />
                    <SliderField label="IoU Threshold" value={iouThreshold.toFixed(2)} defaultValue={Math.round(iouThreshold * 100)} />
                    <div className="space-y-2">
                      <CheckRow checked={skipAnnotated} label="Skip annotated images" subtitle="Do not overwrite existing labels" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-4 p-4">
                  <SectionHeading title="Dataset Summary" />
                  <div className="grid gap-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-4 md:grid-cols-3">
                    <SummaryInfo label="Images to process" value={selectedDataset ? String(selectedDataset.stats.images) : "0"} subtitle="Total images in dataset" />
                    <SummaryInfo label="Already annotated" value={selectedDataset ? String(selectedDataset.stats.annotations) : "0"} subtitle={skipAnnotated ? "Will be skipped" : "Will be overwritten"} />
                    <SummaryInfo label="Model" value="YOLOv8n" subtitle="80 COCO classes" />
                  </div>
                </CardContent>
              </Card>

              {result && (
                <Card>
                  <CardContent className="space-y-4 p-4">
                    <SectionHeading title="Results" />
                    <div className="grid gap-4 md:grid-cols-4">
                      <DataChip label="Processed" value={String(result.processed)} />
                      <DataChip label="Skipped" value={String(result.skipped)} />
                      <DataChip label="Detections" value={String(result.total_detections)} />
                      <DataChip label="New Classes" value={String(result.classes_added.length)} />
                    </div>
                    {result.classes_added.length > 0 && (
                      <div className="text-[length:var(--font-sm)] text-slate-500">
                        Classes added: {result.classes_added.join(", ")}
                      </div>
                    )}
                    {result.errors.length > 0 && (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[length:var(--font-sm)] text-rose-600">
                        {result.errors.length} error(s): {result.errors.slice(0, 3).join("; ")}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="flex items-center justify-end gap-3">
                <Button
                  className="h-11 gap-2 px-6"
                  onClick={handleStart}
                  disabled={running || !selectedDataset || selectedDataset.stats.images === 0}
                >
                  {running ? (
                    <>Processing...</>
                  ) : (
                    <>
                      Start AutoLabel
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="min-h-0 space-y-4 overflow-auto pr-1">
          <Card>
            <CardContent className="space-y-5 p-4">
              <div className="ui-section-title">How AutoLabel Works</div>
              <div className="space-y-3 text-[length:var(--font-sm)] text-slate-500">
                <p>1. Select a dataset with images</p>
                <p>2. Configure confidence threshold (higher = fewer but more accurate detections)</p>
                <p>3. Click "Start AutoLabel" — the YOLO model will process each image</p>
                <p>4. Annotations are saved in YOLO format (.txt files) alongside your images</p>
                <p>5. Review and edit annotations on the Labeling page</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="ui-section-title">About the Model</div>
              <div className="space-y-3 text-[length:var(--font-sm)] text-slate-500">
                <p><strong>YOLOv8n (Nano)</strong> — lightweight and fast pretrained model from Ultralytics.</p>
                <p>Detects 80 object classes from the COCO dataset: person, car, bicycle, dog, cat, chair, bottle, and more.</p>
                <p>The model runs on CPU by default. GPU acceleration is used automatically when available.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

export function TrainingPage() {
  const { data: runs = [], isLoading } = useTrainingRuns();
  const { data: datasets = [] } = useDatasets();
  const createRun = useCreateTrainingRun();
  const deleteRun = useDeleteTrainingRun();
  const startRun = useStartTrainingRun();
  const stopRun = useStopTrainingRun();
  const activeRun = runs.find((r) => r.status === "Running" || r.status === "Preparing") ?? runs[0] ?? null;
  const runCount = runs.length;
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);

  const effectiveDatasetId = selectedDatasetId ?? datasets[0]?.id ?? null;

  const handleNewTraining = () => {
    if (!effectiveDatasetId) {
      alert("Please create a dataset first before starting training.");
      return;
    }
    createRun.mutate({
      name: `Training Run #${runCount + 1}`,
      model_name: "YOLOv8n",
      dataset_id: effectiveDatasetId,
      epochs: 50,
      batch_size: 16,
      image_size: 640,
      optimizer: "SGD",
      learning_rate: 0.01,
    }, {
      onSuccess: (newRun) => {
        startRun.mutate({ runId: newRun.id, datasetId: effectiveDatasetId! });
      },
    });
  };

  const handleStop = () => {
    if (activeRun && (activeRun.status === "Running" || activeRun.status === "Preparing")) {
      stopRun.mutate(activeRun.id);
    }
  };

  return (
    <section className="ui-page h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <PageIntro title="Training" subtitle="Train YOLO models on your annotated datasets" />
        <Button className="h-11 gap-2" onClick={handleNewTraining} disabled={createRun.isPending || startRun.isPending || !effectiveDatasetId}>
          <Plus className="h-4 w-4" />
          New Training
        </Button>
      </div>
      <TabBar tabs={["Overview", "Configuration"]} active="Overview" />

      <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(270px,300px)]">
        <div className="min-h-0 space-y-4 overflow-auto pr-1">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MiniMetricCard icon={Activity} label="Status" value={isLoading ? "..." : activeRun?.status ?? "No runs"} subtitle={activeRun ? `${activeRun.name}` : "Start a training run"} accent="text-emerald-500" />
            <MiniMetricCard icon={Gauge} label="Epoch" value={activeRun ? `${activeRun.current_epoch} / ${activeRun.epochs}` : "0 / 0"} subtitle={<ProgressMini progress={activeRun ? (activeRun.current_epoch / activeRun.epochs) * 100 : 0} />} />
            <MiniMetricCard icon={Clock3} label="Total Runs" value={isLoading ? "..." : String(runCount)} subtitle={`${runs.filter(r => r.status === "Completed").length} completed`} />
            <MiniMetricCard icon={TimerReset} label="Elapsed Time" value={activeRun ? `${Math.floor(activeRun.elapsed_seconds / 60)}m ${activeRun.elapsed_seconds % 60}s` : "—"} subtitle="Current run" />
            <MiniMetricCard icon={Zap} label="Best mAP@0.5" value={activeRun ? activeRun.best_map50.toFixed(3) : "—"} subtitle={activeRun ? `Epoch ${activeRun.current_epoch}` : "No data"} />
          </div>

          <Card>
            <CardContent className="p-4">
              <SectionHeading title="Training Runs" />
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full border-collapse text-left">
                  <thead className="bg-slate-50 text-[length:var(--font-xs)] font-semibold text-slate-500">
                    <tr>
                      {["Name", "Model", "Epochs", "Best mAP@0.5", "Precision", "Status", "Duration", "Actions"].map((header) => (
                        <th key={header} className="px-4 py-3">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-[length:var(--font-sm)] text-slate-600">
                    {runs.length === 0 && !isLoading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-400">No training runs yet. Select a dataset and click &quot;New Training&quot; to start.</td>
                      </tr>
                    ) : runs.map((run) => (
                      <tr key={run.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-semibold text-primary">{run.name}</td>
                        <td className="px-4 py-3">{run.model_name}</td>
                        <td className="px-4 py-3">{run.current_epoch} / {run.epochs}</td>
                        <td className="px-4 py-3 font-medium text-emerald-600">{run.best_map50.toFixed(3)}</td>
                        <td className="px-4 py-3">{run.precision.toFixed(3)}</td>
                        <td className="px-4 py-3"><Badge tone={run.status === "Failed" ? "danger" : run.status === "Running" || run.status === "Preparing" ? "info" : run.status === "Completed" ? "success" : "default"}>{run.status}</Badge></td>
                        <td className="px-4 py-3">{Math.floor(run.elapsed_seconds / 60)}m {run.elapsed_seconds % 60}s</td>
                        <td className="px-4 py-3">
                          <button className="text-rose-400 hover:text-rose-600" type="button" onClick={() => deleteRun.mutate(run.id)}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="min-h-0 space-y-4 overflow-auto pr-1">
          <Card>
            <CardContent className="space-y-4 p-4">
              <SectionHeading title="Select Dataset" subtitle="Choose a dataset for training" />
              {datasets.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-[length:var(--font-sm)] text-slate-400">
                  No datasets available. Create a dataset first.
                </div>
              ) : (
                <select
                  className="form-input h-11 w-full rounded-xl"
                  value={effectiveDatasetId ?? ""}
                  onChange={(e) => setSelectedDatasetId(Number(e.target.value))}
                >
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} {d.version} ({d.stats.images} images)</option>
                  ))}
                </select>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-4">
              <SectionHeading title="Training Information" />
              <InfoList
                items={[
                  ["Model", activeRun?.model_name ?? "YOLOv8n"],
                  ["Epochs", activeRun ? `${activeRun.current_epoch} / ${activeRun.epochs}` : "—"],
                  ["Image Size", activeRun ? `${activeRun.image_size} × ${activeRun.image_size}` : "640 × 640"],
                  ["Batch Size", activeRun ? String(activeRun.batch_size) : "16"],
                  ["Optimizer", activeRun?.optimizer ?? "SGD"],
                  ["Learning Rate", activeRun ? String(activeRun.learning_rate) : "0.01"],
                  ["Best mAP@0.5", activeRun ? activeRun.best_map50.toFixed(4) : "—"],
                  ["Precision", activeRun ? activeRun.precision.toFixed(4) : "—"],
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-4">
              <SectionHeading title="Controls" />
              <div className="grid gap-3">
                <Button
                  className="h-11 gap-2 bg-rose-500 shadow-none hover:bg-rose-600"
                  onClick={handleStop}
                  disabled={!activeRun || (activeRun.status !== "Running" && activeRun.status !== "Preparing")}
                >
                  <Square className="h-4 w-4" />
                  Stop Training
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

export function AutoMLPage() {
  const { data: runs = [], isLoading } = useTrainingRuns();
  const { data: datasets = [] } = useDatasets();
  const createRun = useCreateTrainingRun();
  const startRun = useStartTrainingRun();
  const bestRun = runs.reduce<TrainingRunItem | null>((best, r) => (!best || r.best_map50 > best.best_map50 ? r : best), null);
  const completedCount = runs.filter((r) => r.status === "Completed").length;
  const runningCount = runs.filter((r) => r.status === "Running").length;
  const totalTime = runs.reduce((acc, r) => acc + r.elapsed_seconds, 0);
  const [autoMLRunning, setAutoMLRunning] = useState(false);

  const handleAutoMLRun = () => {
    const datasetId = datasets[0]?.id;
    if (!datasetId) {
      alert("Create a dataset with annotated images first.");
      return;
    }
    const modelChoices = ["YOLOv8n", "YOLOv8s", "YOLOv8m", "YOLOv8l"];
    const model = modelChoices[runs.length % modelChoices.length];
    setAutoMLRunning(true);
    createRun.mutate({
      name: `AutoML Run #${runs.length + 1}`,
      model_name: model,
      dataset_id: datasetId,
      epochs: 50,
      batch_size: 16,
      image_size: 640,
    }, {
      onSuccess: (newRun) => {
        startRun.mutate({ runId: newRun.id, datasetId }, {
          onSettled: () => setAutoMLRunning(false),
        });
      },
      onError: () => setAutoMLRunning(false),
    });
  };

  return (
    <section className="ui-page h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden">
      <div className="flex items-center gap-3">
        <PageIntro title="AutoML" subtitle="Automatically find the best model and hyperparameters for your dataset" />
        <Badge className="mt-1">Beta</Badge>
        <Button className="ml-auto h-11 gap-2" onClick={handleAutoMLRun} disabled={autoMLRunning || createRun.isPending}>
          <Zap className="h-4 w-4" />
          {autoMLRunning ? "Starting..." : "Start AutoML Run"}
        </Button>
      </div>
      <TabBar tabs={["Overview", "Runs", "Compare", "Leaderboard", "Settings"]} active="Overview" />

      <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(290px,330px)]">
        <div className="min-h-0 space-y-4 overflow-auto pr-1">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MiniMetricCard icon={Zap} label="Best Metrics (mAP@0.5)" value={bestRun ? bestRun.best_map50.toFixed(3) : "—"} subtitle={bestRun ? `${bestRun.model_name} • ${bestRun.name}` : "No runs yet"} />
            <MiniMetricCard icon={Activity} label="Total Runs" value={isLoading ? "..." : String(runs.length)} subtitle={`Completed: ${completedCount} • Running: ${runningCount}`} />
            <MiniMetricCard icon={Clock3} label="Total Time" value={`${Math.floor(totalTime / 3600)}h ${Math.floor((totalTime % 3600) / 60)}m`} subtitle="Total compute time" />
            <MiniMetricCard icon={Sparkles} label="Estimated Cost" value={`$${(totalTime / 3600 * 0.5).toFixed(2)}`} subtitle="Based on your hardware" />
          </div>

          <Card>
            <CardContent className="p-4">
              <SectionHeading title="Runs" />
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full border-collapse text-left">
                  <thead className="bg-slate-50 text-[length:var(--font-xs)] font-semibold text-slate-500">
                    <tr>
                      {["#", "Name", "Model", "mAP@0.5", "Precision", "Epochs", "Status", "Duration"].map((header) => (
                        <th key={header} className="px-4 py-3">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-[length:var(--font-sm)] text-slate-600">
                    {runs.length === 0 && !isLoading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-400">No runs yet. Click &quot;Start AutoML Run&quot; to begin.</td>
                      </tr>
                    ) : [...runs].sort((a, b) => b.best_map50 - a.best_map50).map((run, idx) => (
                      <tr key={run.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium">{idx + 1}</td>
                        <td className="px-4 py-3 font-semibold text-primary">{run.name}</td>
                        <td className="px-4 py-3">{run.model_name}</td>
                        <td className="px-4 py-3 font-medium text-emerald-600">{run.best_map50.toFixed(3)}</td>
                        <td className="px-4 py-3">{run.precision.toFixed(3)}</td>
                        <td className="px-4 py-3">{run.current_epoch} / {run.epochs}</td>
                        <td className="px-4 py-3"><Badge tone={run.status === "Failed" ? "danger" : run.status === "Running" ? "info" : "success"}>{run.status}</Badge></td>
                        <td className="px-4 py-3">{Math.floor(run.elapsed_seconds / 60)}m {run.elapsed_seconds % 60}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardContent className="p-4">
                <SectionHeading title="Performance Over Time" />
                <ChartPanel className="h-[220px]">
                  <div className="flex h-full items-center justify-center text-[length:var(--font-sm)] text-slate-400">
                    No performance data yet. Charts will appear after AutoML runs.
                  </div>
                </ChartPanel>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <SectionHeading title="Model Comparison" />
                <ChartPanel className="h-[220px]">
                  <div className="flex h-full items-center justify-center text-[length:var(--font-sm)] text-slate-400">
                    No comparison data yet. Run multiple models to see comparisons.
                  </div>
                </ChartPanel>
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
              <SectionHeading title="Recent Runs" />
              {runs.length === 0 ? (
                <div className="py-4 text-center text-[length:var(--font-sm)] text-slate-400">No runs yet</div>
              ) : runs.slice(0, 5).map((run) => (
                <div key={run.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-primary">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="ui-card-title truncate">{run.name}</div>
                    <div className="ui-meta mt-1">{run.model_name} • {run.current_epoch}/{run.epochs} epochs</div>
                  </div>
                  <Badge tone={run.status === "Failed" ? "danger" : run.status === "Running" ? "info" : "success"}>{run.status}</Badge>
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
  const { data: runs = [], isLoading } = useTrainingRuns();
  const completedRuns = runs.filter((r) => r.status === "Completed");
  const runningRuns = runs.filter((r) => r.status === "Running");
  const bestRun = runs.reduce<TrainingRunItem | null>((best, r) => (!best || r.best_map50 > best.best_map50 ? r : best), null);
  const totalTime = runs.reduce((acc, r) => acc + r.elapsed_seconds, 0);

  return (
    <section className="ui-page h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden">
      <PageIntro title="Experiments" subtitle="Track, compare and analyze your training and AutoML experiments" />
      <TabBar tabs={["Overview", "Experiments", "Compare", "Traces", "Artifacts"]} active="Overview" />

      <div className="grid min-h-0 gap-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <MiniMetricCard icon={FileText} label="Total Experiments" value={isLoading ? "..." : String(runs.length)} subtitle={`${completedRuns.length} completed`} />
          <MiniMetricCard icon={CheckCircle2} label="Completed" value={isLoading ? "..." : String(completedRuns.length)} subtitle={runs.length ? `${Math.round(completedRuns.length / runs.length * 100)}% of all` : "—"} />
          <MiniMetricCard icon={Activity} label="Running" value={isLoading ? "..." : String(runningRuns.length)} subtitle={runs.length ? `${Math.round(runningRuns.length / runs.length * 100)}% of all` : "—"} />
          <MiniMetricCard icon={Square} label="Pending" value={isLoading ? "..." : String(runs.filter(r => r.status === "Pending").length)} subtitle="Queued" />
          <MiniMetricCard icon={Zap} label="Best mAP@0.5" value={bestRun ? bestRun.best_map50.toFixed(3) : "—"} subtitle={bestRun ? `${bestRun.model_name} • ${bestRun.name}` : "No data"} />
          <MiniMetricCard icon={Clock3} label="Total Compute Time" value={`${Math.floor(totalTime / 3600)}h ${Math.floor((totalTime % 3600) / 60)}m`} subtitle="All experiments" />
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
                      {runs.length === 0 && !isLoading ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-8 text-center text-slate-400">No experiments yet. Start a training run to see experiments here.</td>
                        </tr>
                      ) : runs.map((run) => (
                        <tr key={run.id} className="border-t border-slate-100">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-primary">{run.name}</div>
                            <div className="ui-meta mt-1">ID: run_{run.id}</div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone="default">Training</Badge>
                          </td>
                          <td className="px-4 py-3">{run.model_name}</td>
                          <td className="px-4 py-3">Dataset #{run.dataset_id ?? "—"}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-emerald-600">{run.best_map50.toFixed(3)}</div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone={run.status === "Failed" ? "danger" : run.status === "Running" ? "info" : "success"}>{run.status}</Badge>
                          </td>
                          <td className="px-4 py-3">{new Date(run.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3">{Math.floor(run.elapsed_seconds / 60)}m {run.elapsed_seconds % 60}s</td>
                          <td className="px-4 py-3 text-slate-400">
                            <MoreHorizontal className="h-4 w-4" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[length:var(--font-xs)] text-slate-400">
                  <span>Showing {runs.length} experiment{runs.length !== 1 ? "s" : ""}</span>
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

            {bestRun && (
            <Card>
              <CardContent className="space-y-4 p-4">
                <TabBar tabs={["Metrics", "Charts", "System", "Artifacts", "Logs", "Config", "Notes"]} active="Metrics" />
                <div className="grid gap-4 xl:grid-cols-[260px_1fr_1fr]">
                  <Card className="border border-slate-200 shadow-none">
                    <CardContent className="space-y-3 p-4">
                      <div className="ui-card-title">Key Metrics (Best)</div>
                      {[
                        ["mAP@0.5", bestRun.best_map50.toFixed(3)],
                        ["Precision", bestRun.precision.toFixed(3)],
                        ["Recall", bestRun.recall.toFixed(3)],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between text-[length:var(--font-sm)]">
                          <span className="text-slate-500">{label}</span>
                          <span className="font-semibold text-slate-900">{value}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="border border-slate-200 shadow-none">
                    <CardContent className="p-4">
                      <SectionHeading title="mAP@0.5 over Epochs" />
                      <ChartPanel className="mt-4 h-[220px]">
                        <div className="flex h-full items-center justify-center text-[length:var(--font-sm)] text-slate-400">
                          Chart data will appear after training runs complete.
                        </div>
                      </ChartPanel>
                    </CardContent>
                  </Card>

                  <Card className="border border-slate-200 shadow-none">
                    <CardContent className="p-4">
                      <SectionHeading title="Loss over Epochs" />
                      <ChartPanel className="mt-4 h-[220px]">
                        <div className="flex h-full items-center justify-center text-[length:var(--font-sm)] text-slate-400">
                          Loss data will appear after training runs complete.
                        </div>
                      </ChartPanel>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
            )}
          </div>

          <div className="min-h-0 space-y-4 overflow-auto pr-1">
            <Card>
              <CardContent className="space-y-4 p-4">
                <SectionHeading title="Selected Experiment" />
                {bestRun ? (
                  <>
                    <div>
                      <div className="ui-stat-value">{bestRun.name}</div>
                      <div className="ui-meta mt-1">ID: run_{bestRun.id}</div>
                    </div>
                    <InfoList
                      items={[
                        ["Model", bestRun.model_name],
                        ["Epochs", `${bestRun.current_epoch} / ${bestRun.epochs}`],
                        ["Status", bestRun.status],
                        ["Created At", new Date(bestRun.created_at).toLocaleString()],
                        ["Duration", `${Math.floor(bestRun.elapsed_seconds / 60)}m ${bestRun.elapsed_seconds % 60}s`],
                        ["Best mAP@0.5", bestRun.best_map50.toFixed(3)],
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
                  </>
                ) : (
                  <div className="py-4 text-center text-[length:var(--font-sm)] text-slate-400">No experiment selected</div>
                )}
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
  const { data: apiModels = [], isLoading: modelsLoading } = useModels();
  const createModel = useCreateModel();
  const deleteModelMut = useDeleteModel();

  const handleCreateModel = () => {
    createModel.mutate({
      name: `Model #${apiModels.length + 1}`,
      model_type: "Object Detection",
      architecture: "YOLOv8s",
      framework: "PyTorch",
      dataset_name: "Custom Dataset",
    });
  };

  return (
    <section className="ui-page h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <PageIntro title="Models" subtitle="Manage, evaluate and deploy your trained models" />
        <Button className="h-11 gap-2" onClick={handleCreateModel} disabled={createModel.isPending}>
          <Plus className="h-4 w-4" />
          Register Model
        </Button>
      </div>
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

          <Card>
            <CardContent className="p-4">
              <SectionHeading title={`Models (${apiModels.length})`} />
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full border-collapse text-left">
                  <thead className="bg-slate-50 text-[length:var(--font-xs)] font-semibold text-slate-500">
                    <tr>
                      {["Name", "Architecture", "Framework", "Status", "mAP@0.5", "Precision", "Recall", "Actions"].map((h) => (
                        <th key={h} className="px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-[length:var(--font-sm)] text-slate-600">
                    {apiModels.length === 0 && !modelsLoading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-400">No models registered yet. Click &quot;Register Model&quot; to add one.</td>
                      </tr>
                    ) : apiModels.map((m) => (
                      <tr key={m.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-semibold text-primary">{m.name}</td>
                        <td className="px-4 py-3">{m.architecture || "—"}</td>
                        <td className="px-4 py-3">{m.framework || "—"}</td>
                        <td className="px-4 py-3"><Badge tone={m.status === "Production" ? "success" : "default"}>{m.status}</Badge></td>
                        <td className="px-4 py-3 font-medium text-emerald-600">{m.map50 ? m.map50.toFixed(3) : "—"}</td>
                        <td className="px-4 py-3">{m.precision ? m.precision.toFixed(3) : "—"}</td>
                        <td className="px-4 py-3">{m.recall ? m.recall.toFixed(3) : "—"}</td>
                        <td className="px-4 py-3">
                          <button className="text-rose-400 hover:text-rose-600" type="button" onClick={() => deleteModelMut.mutate(m.id)}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {apiModels.length > 0 && (
                <div className="mt-3 text-[length:var(--font-xs)] text-slate-400">Showing {apiModels.length} model{apiModels.length !== 1 ? "s" : ""}</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="min-h-0 space-y-4 overflow-auto pr-1">
          <Card>
            <CardContent className="space-y-4 p-4">
              <SectionHeading title="Selected Model" />
              {apiModels.length > 0 ? (
                <>
                  <div>
                    <div className="ui-stat-value">{apiModels[0].name}</div>
                    <div className="ui-meta mt-1">ID: mdl_{apiModels[0].id}</div>
                  </div>
                  <InfoList
                    items={[
                      ["Type", apiModels[0].model_type || "—"],
                      ["Framework", apiModels[0].framework || "—"],
                      ["Architecture", apiModels[0].architecture || "—"],
                      ["Status", apiModels[0].status],
                      ["Created At", new Date(apiModels[0].created_at).toLocaleString()],
                    ]}
                  />
                  {(apiModels[0].map50 || apiModels[0].precision || apiModels[0].recall) && (
                    <Card className="border border-slate-200 shadow-none">
                      <CardContent className="p-4">
                        <SectionHeading title="Performance" />
                        <div className="mt-4 grid gap-2 text-[length:var(--font-sm)]">
                          {[
                            ["mAP@0.5", apiModels[0].map50?.toFixed(3)],
                            ["Precision", apiModels[0].precision?.toFixed(3)],
                            ["Recall", apiModels[0].recall?.toFixed(3)],
                          ].filter(([, v]) => v).map(([label, value]) => (
                            <div key={label} className="flex items-center justify-between">
                              <span className="text-slate-500">{label}</span>
                              <span className="font-semibold text-emerald-600">{value}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  <div className="space-y-3">
                    <SectionHeading title="Actions" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Button variant="secondary" className="h-11 gap-2 border border-slate-200 bg-white">
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                      <Button variant="secondary" className="h-11 gap-2 border border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100" onClick={() => deleteModelMut.mutate(apiModels[0].id)}>
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-4 text-center text-[length:var(--font-sm)] text-slate-400">No model selected</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}



export function VersionsPage() {
  const { data: datasets = [], isLoading: datasetsLoading } = useDatasets();
  const datasetCount = datasets.length;
  const [exportingId, setExportingId] = useState<number | null>(null);
  const [exportResult, setExportResult] = useState<{ images: number; path: string } | null>(null);

  const handleExport = async (datasetId: number) => {
    setExportingId(datasetId);
    setExportResult(null);
    try {
      const res = await exportDatasetYolo(datasetId);
      setExportResult({ images: res.images_exported, path: res.export_path });
    } catch (err) {
      alert(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setExportingId(null);
    }
  };

  return (
    <section className="ui-page h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <PageIntro title="Versions" subtitle="Track dataset versions, compare changes and manage snapshots" />
      </div>
      <TabBar tabs={["All Versions", "Compare", "Changelog"]} active="All Versions" />

      <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(290px,330px)]">
        <div className="min-h-0 space-y-4 overflow-auto pr-1">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <MiniMetricCard icon={Layers3} label="Datasets" value={datasetsLoading ? "..." : String(datasetCount)} subtitle={`${datasetCount} registered`} />
            <MiniMetricCard icon={FileText} label="Total Images" value={datasetsLoading ? "..." : String(datasets.reduce((a, d) => a + d.stats.images, 0))} subtitle="Across all datasets" />
            <MiniMetricCard icon={CheckCircle2} label="Total Annotations" value={datasetsLoading ? "..." : String(datasets.reduce((a, d) => a + d.stats.annotations, 0))} subtitle="Across all datasets" />
          </div>

          {datasetsLoading ? (
            <div className="py-12 text-center text-slate-400">Loading...</div>
          ) : datasets.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                  <Layers3 className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="ui-section-title">No versions yet</h3>
                <p className="mt-2 text-[length:var(--font-sm)] text-slate-500">Create a dataset first, then you can create version snapshots to track changes over time.</p>
              </CardContent>
            </Card>
          ) : datasets.map((dataset) => (
            <Card key={dataset.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-primary">
                      <Layers3 className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="ui-section-title">{dataset.name}</h3>
                        <Badge tone={dataset.status === "Ready" ? "success" : "default"}>{dataset.version}</Badge>
                      </div>
                      <div className="mt-1 text-[length:var(--font-sm)] text-slate-500">
                        {dataset.task} • {dataset.format}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 text-[length:var(--font-sm)] text-slate-500 md:grid-cols-4">
                  <StatInline icon={FileImage} value={String(dataset.stats.images)} label="Images" />
                  <StatInline icon={CheckCircle2} value={String(dataset.stats.annotations)} label="Annotations" />
                  <StatInline icon={Layers3} value={String(dataset.stats.classes)} label="Classes" />
                  <StatInline icon={HardDrive} value={String(dataset.stats.videos)} label="Videos" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="min-h-0 space-y-4 overflow-auto pr-1">
          <Card>
            <CardContent className="space-y-4 p-4">
              <SectionHeading title="Export Dataset (YOLO)" subtitle="Export dataset with images and labels for training" />
              {datasets.length > 0 ? (
                <>
                  <FieldGroup label="Select Dataset">
                    <select className="form-input h-11 w-full rounded-xl" id="export-dataset-select">
                      {datasets.map((d) => (
                        <option key={d.id} value={d.id}>{d.name} {d.version}</option>
                      ))}
                    </select>
                  </FieldGroup>
                  <Button
                    className="h-12 w-full gap-2"
                    disabled={exportingId !== null}
                    onClick={() => {
                      const sel = document.getElementById("export-dataset-select") as HTMLSelectElement | null;
                      const dsId = sel ? Number(sel.value) : datasets[0]?.id;
                      if (dsId) handleExport(dsId);
                    }}
                  >
                    <Download className="h-4 w-4" />
                    {exportingId !== null ? "Exporting..." : "Export YOLO Dataset"}
                  </Button>
                  {exportResult && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[length:var(--font-sm)] text-emerald-700">
                      Exported {exportResult.images} images to: <span className="font-mono text-[length:var(--font-xs)]">{exportResult.path}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-4 text-center text-[length:var(--font-sm)] text-slate-400">Create a dataset first</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-4">
              <SectionHeading title="Recent Changes" />
              <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-[length:var(--font-sm)] text-slate-400">
                No changes recorded yet.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}



export function PipelinesPage() {
  const { data: apiPipelines = [], isLoading: pipelinesLoading } = usePipelines();
  const createPipeline = useCreatePipeline();
  const deletePipeline = useDeletePipeline();
  const runPipeline = useRunPipeline();
  const pipelineCount = apiPipelines.length;

  return (
    <section className="ui-page h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <PageIntro title="Pipelines" subtitle="Build, manage and run end-to-end ML workflows" />
        <Button className="h-11 gap-2" onClick={() => createPipeline.mutate({ name: `Pipeline #${pipelineCount + 1}`, description: "New pipeline" })} disabled={createPipeline.isPending}>
          <Plus className="h-4 w-4" />
          New Pipeline
        </Button>
      </div>
      <TabBar tabs={["Overview", "Templates", "Runs"]} active="Overview" />

      <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(290px,330px)]">
        <div className="min-h-0 space-y-4 overflow-auto pr-1">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <MiniMetricCard icon={Zap} label="Total Pipelines" value={pipelinesLoading ? "..." : String(pipelineCount)} subtitle={`${pipelineCount} registered`} />
            <MiniMetricCard icon={Activity} label="Status" value={pipelineCount > 0 ? "Ready" : "—"} subtitle={pipelineCount > 0 ? "No active runs" : "Create a pipeline to start"} />
            <MiniMetricCard icon={Clock3} label="Runs" value="0" subtitle="No pipeline runs yet" />
          </div>

          {pipelinesLoading ? (
            <div className="py-12 text-center text-slate-400">Loading...</div>
          ) : apiPipelines.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                  <Workflow className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="ui-section-title">No pipelines yet</h3>
                <p className="mt-2 text-[length:var(--font-sm)] text-slate-500">Create a pipeline to build an end-to-end ML workflow with data import, preprocessing, training and export steps.</p>
                <Button className="mt-4 h-11 gap-2" onClick={() => createPipeline.mutate({ name: "My First Pipeline", description: "End-to-end ML workflow" })} disabled={createPipeline.isPending}>
                  <Plus className="h-4 w-4" />
                  Create First Pipeline
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4">
                <SectionHeading title="Pipelines" />
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                  <table className="w-full border-collapse text-left">
                    <thead className="bg-slate-50 text-[length:var(--font-xs)] font-semibold text-slate-500">
                      <tr>
                        {["Name", "Description", "Steps", "Status", "Actions"].map((header) => (
                          <th key={header} className="px-4 py-3">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="text-[length:var(--font-sm)] text-slate-600">
                      {apiPipelines.map((p) => (
                        <tr key={p.id} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-semibold text-primary">{p.name}</td>
                          <td className="px-4 py-3">{p.description}</td>
                          <td className="px-4 py-3">{p.total_steps}</td>
                          <td className="px-4 py-3"><Badge tone={p.status === "Running" ? "info" : "default"}>{p.status}</Badge></td>
                          <td className="px-4 py-3 flex items-center gap-2">
                            <button className="text-primary hover:text-blue-700" type="button" onClick={() => runPipeline.mutate(p.id)} title="Run">
                              <Play className="h-4 w-4" />
                            </button>
                            <button className="text-rose-400 hover:text-rose-600" type="button" onClick={() => deletePipeline.mutate(p.id)} title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="min-h-0 space-y-4 overflow-auto pr-1">
          <Card>
            <CardContent className="space-y-4 p-4">
              <SectionHeading title="Quick Start" />
              <p className="text-[length:var(--font-sm)] text-slate-500">Pipelines let you chain steps together: data import → preprocessing → augmentation → training → evaluation → export.</p>
              <p className="text-[length:var(--font-sm)] text-slate-500">Create a pipeline above and add steps to build your workflow.</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-4">
              <SectionHeading title="Run History" />
              <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-[length:var(--font-sm)] text-slate-400">
                No pipeline runs yet.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

const SETTINGS_KEY_MAP: Record<string, { label: string; type: "input" | "textarea" | "select" | "path"; section: string }> = {
  workspace_name: { label: "Workspace Name", type: "input", section: "General" },
  workspace_description: { label: "Description", type: "textarea", section: "General" },
  workspace_owner: { label: "Owner", type: "input", section: "General" },
  default_task: { label: "Default Task", type: "select", section: "General" },
  data_directory: { label: "Data Directory", type: "path", section: "Storage" },
  dataset_storage: { label: "Dataset Storage", type: "path", section: "Storage" },
  model_storage: { label: "Model Storage", type: "path", section: "Storage" },
  export_directory: { label: "Export Directory", type: "path", section: "Storage" },
};

const TRAINING_KEY_MAP: Record<string, { label: string; type: "select" | "input" }> = {
  default_model: { label: "Default Model", type: "select" },
  default_image_size: { label: "Default Image Size", type: "select" },
  default_batch_size: { label: "Default Batch Size", type: "input" },
  default_epochs: { label: "Default Epochs", type: "input" },
  default_optimizer: { label: "Default Optimizer", type: "select" },
  default_learning_rate: { label: "Default Learning Rate", type: "input" },
};

const TOGGLE_KEY_MAP: Record<string, { label: string; subtitle: string }> = {
  auto_save_annotations: { label: "Auto-save annotations", subtitle: "Automatically save annotation changes every 30 seconds" },
  auto_scan_sources: { label: "Auto-scan sources", subtitle: "Automatically scan dataset sources for new files" },
  enable_video_extraction: { label: "Enable video frame extraction", subtitle: "Allow extracting frames from video files in datasets" },
  show_preview_thumbnails: { label: "Show preview thumbnails", subtitle: "Generate and display image previews in media browser" },
  enable_experiment_tracking: { label: "Enable experiment tracking", subtitle: "Track metrics, parameters and artifacts for training runs" },
  dark_mode: { label: "Dark mode", subtitle: "Switch to dark color theme" },
};

function SettingsField({ setting, type, onSave }: { setting: SettingItem; type: "input" | "textarea" | "select" | "path"; onSave: (key: string, value: string) => void }) {
  const [value, setValue] = useState(setting.value);

  const handleBlur = useCallback(() => {
    if (value !== setting.value) onSave(setting.key, value);
  }, [value, setting.value, setting.key, onSave]);

  if (type === "textarea") {
    return (
      <textarea
        className="min-h-[80px] w-full rounded-xl border border-slate-200 p-3 text-[length:var(--font-sm)] outline-none placeholder:text-slate-400 focus:border-primary"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
      />
    );
  }
  if (type === "select") {
    return <SelectStub label={value} className="w-full" />;
  }
  if (type === "path") {
    return (
      <div className="flex items-center gap-2">
        <input className="form-input h-11 flex-1 rounded-xl" value={value} onChange={(e) => setValue(e.target.value)} onBlur={handleBlur} type="text" />
        <Button variant="secondary" className="h-11 border border-slate-200 bg-white px-3">
          <FolderOpen className="h-4 w-4" />
        </Button>
      </div>
    );
  }
  return <input className="form-input h-11 rounded-xl" value={value} onChange={(e) => setValue(e.target.value)} onBlur={handleBlur} type="text" />;
}

function SettingsToggle({ setting, label, subtitle, onSave }: { setting: SettingItem; label: string; subtitle: string; onSave: (key: string, value: string) => void }) {
  const checked = setting.value === "true";
  return (
    <div
      className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 p-4 cursor-pointer"
      onClick={() => onSave(setting.key, checked ? "false" : "true")}
    >
      <div>
        <div className="text-[length:var(--font-md)] font-medium text-slate-700">{label}</div>
        <div className="ui-meta mt-1">{subtitle}</div>
      </div>
      <div className={cn(
        "flex h-7 w-12 items-center rounded-full px-1 transition-colors",
        checked ? "bg-primary" : "bg-slate-200",
      )}>
        <div className={cn(
          "h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0",
        )} />
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSetting = useUpdateSetting();

  const settingsMap = new Map<string, SettingItem>();
  if (settings) {
    for (const s of settings) settingsMap.set(s.key, s);
  }

  const handleSave = useCallback((key: string, value: string) => {
    updateSetting.mutate({ key, value });
  }, [updateSetting]);

  if (isLoading) {
    return (
      <section className="ui-page h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden">
        <PageIntro title="Settings" subtitle="Configure your workspace preferences and integrations" />
        <TabBar tabs={["General", "Storage", "Training", "Integrations", "Advanced"]} active="General" />
        <div className="flex items-center justify-center py-20 text-slate-400">Loading settings...</div>
      </section>
    );
  }

  const generalSettings = Object.entries(SETTINGS_KEY_MAP).filter(([, v]) => v.section === "General");
  const storageSettings = Object.entries(SETTINGS_KEY_MAP).filter(([, v]) => v.section === "Storage");

  return (
    <section className="ui-page h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden">
      <PageIntro title="Settings" subtitle="Configure your workspace preferences and integrations" />
      <TabBar tabs={["General", "Storage", "Training", "Integrations", "Advanced"]} active="General" />

      <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(290px,330px)]">
        <div className="min-h-0 space-y-4 overflow-auto pr-1">
          <Card>
            <CardContent className="space-y-5 p-4">
              <SectionHeading title="General" />
              {generalSettings.map(([key, meta]) => {
                const setting = settingsMap.get(key);
                if (!setting) return null;
                return (
                  <FieldGroup key={key} label={meta.label}>
                    <SettingsField setting={setting} type={meta.type} onSave={handleSave} />
                  </FieldGroup>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-5 p-4">
              <SectionHeading title="Storage" />
              {storageSettings.map(([key, meta]) => {
                const setting = settingsMap.get(key);
                if (!setting) return null;
                return (
                  <FieldGroup key={key} label={meta.label}>
                    <SettingsField setting={setting} type={meta.type} onSave={handleSave} />
                  </FieldGroup>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-5 p-4">
              <SectionHeading title="Training Defaults" />
              <div className="grid gap-5 xl:grid-cols-2">
                {Object.entries(TRAINING_KEY_MAP).map(([key, meta]) => {
                  const setting = settingsMap.get(key);
                  if (!setting) return null;
                  return (
                    <FieldGroup key={key} label={meta.label}>
                      <SettingsField setting={setting} type={meta.type} onSave={handleSave} />
                    </FieldGroup>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-4">
              <SectionHeading title="Features" subtitle="Enable or disable workspace features" />
              {Object.entries(TOGGLE_KEY_MAP).map(([key, meta]) => {
                const setting = settingsMap.get(key);
                if (!setting) return null;
                return <SettingsToggle key={key} setting={setting} label={meta.label} subtitle={meta.subtitle} onSave={handleSave} />;
              })}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-3 pb-4">
            <Button variant="secondary" className="h-11 gap-2 border border-slate-200 bg-white">
              <TimerReset className="h-4 w-4" />
              Reset to Defaults
            </Button>
            <Button className="h-11 gap-2 px-6">
              <Save className="h-4 w-4" />
              Save Settings
            </Button>
          </div>
        </div>

        <div className="min-h-0 space-y-4 overflow-auto pr-1">
          <Card>
            <CardContent className="space-y-4 p-4">
              <SectionHeading title="System Information" />
              <InfoList
                items={[
                  ["Version", "MLForge v2.0.1"],
                  ["Python", "3.11.9"],
                  ["Backend", "FastAPI 0.115"],
                  ["Database", "SQLite"],
                  ["OS", "Windows 11"],
                  ["GPU", "NVIDIA RTX 4090"],
                  ["VRAM", "24 GB"],
                  ["CUDA", "12.4"],
                  ["PyTorch", "2.4.0"],
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-4">
              <SectionHeading title="Integrations" />
              {[
                { name: "Weights & Biases", status: "Not Connected", connected: false },
                { name: "MLflow Tracking", status: "Not Connected", connected: false },
                { name: "TensorBoard", status: "Connected", connected: true },
                { name: "DVC (Data Version Control)", status: "Not Connected", connected: false },
              ].map((integration) => (
                <div key={integration.name} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    integration.connected ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400",
                  )}>
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="ui-card-title">{integration.name}</div>
                    <div className="ui-meta mt-1">{integration.status}</div>
                  </div>
                  <Button variant="secondary" className={cn(
                    "h-9 border px-3",
                    integration.connected ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-slate-200 bg-white",
                  )}>
                    {integration.connected ? "Connected" : "Connect"}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <DangerZoneCard />
        </div>
      </div>
    </section>
  );
}



function DangerZoneCard() {
  const [resetting, setResetting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const queryClient = useQueryClient();

  const handleReset = async () => {
    if (!window.confirm("Are you sure you want to clear ALL data? This action cannot be undone.")) return;
    setResetting(true);
    try {
      await resetDatabase();
      queryClient.invalidateQueries();
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch {
      alert("Failed to reset database");
    } finally {
      setResetting(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <SectionHeading title="Danger Zone" />
        <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50/30 p-4">
          <div className="text-[length:var(--font-md)] font-medium text-rose-700">Clear All Data</div>
          <div className="text-[length:var(--font-sm)] text-rose-500">
            Delete all training runs, models, pipelines and settings. Projects and datasets are preserved.
          </div>
          <Button
            variant="secondary"
            className="h-11 gap-2 border border-rose-300 bg-white text-rose-600 hover:bg-rose-50"
            onClick={handleReset}
            disabled={resetting}
          >
            <Trash2 className="h-4 w-4" />
            {resetting ? "Clearing..." : done ? "Cleared!" : "Clear Database"}
          </Button>
        </div>
      </CardContent>
    </Card>
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
