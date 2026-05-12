import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Copy,
  Database,
  FileImage,
  FileText,
  Filter,
  Folder,
  GitBranch,
  Grid2X2,
  Image,
  Layers3,
  List,
  PlaySquare,
  Plus,
  RefreshCcw,
  Save,
  Scissors,
  Search,
  Settings,
  ShieldCheck,
  Tags,
  Trash2,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  addDatasetClass,
  addDatasetSource,
  addDatasetSplit,
  createDatasetVersion,
  createDataset,
  applyDatasetMediaBulkAction,
  deleteDataset,
  deleteDatasetMedia,
  exportDatasetVersionYolo,
  extractDatasetSourceFrames,
  getDatasetClasses,
  getDatasetEvents,
  getDatasetMedia,
  getDatasetTagCatalog,
  getProjects,
  getDatasetSources,
  getDatasetSplits,
  getDatasetVersions,
  getDatasets,
  importDataset,
  importDatasetClasses,
  openDatasetFolder,
  previewDatasetSourceVideoPlan,
  rebuildDatasetVersionManifest,
  rescanDataset,
  updateDatasetTagCatalog,
  updateDataset,
  uploadDatasetAssets,
} from "@/lib/api";
import { formatCount, formatDateTime, percentLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  DatasetClassItem,
  DatasetEventItem,
  DatasetItem,
  DatasetMediaItem,
  DatasetSourceItem,
  DatasetSplitItem,
  DatasetTagCatalogItem,
  DatasetVideoPlanSummary,
  DatasetVersionSummary,
  ProjectSummary,
} from "@/types/workspace";

type DatasetTab = "overview" | "images" | "sources" | "classes" | "tags" | "splits" | "versions" | "settings";
type DatasetViewMode = "list" | "grid";
type DatasetFormMode = "import" | "create" | null;
type MediaPreset = {
  kind?: string;
  split?: string;
  search?: string;
};
type BrowserVideoPlan = {
  durationSeconds: number | null;
  error?: string;
};

const datasetTabs: Array<{ id: DatasetTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "images", label: "Images" },
  { id: "sources", label: "Sources" },
  { id: "classes", label: "Classes" },
  { id: "tags", label: "Tags" },
  { id: "splits", label: "Splits" },
  { id: "versions", label: "Versions" },
  { id: "settings", label: "Settings" },
];

const taskOptions = ["Object Detection", "Classification", "Segmentation"];
const formatOptions = ["YOLO", "COCO", "VOC", "Folder"];

export function DatasetsPage() {
  const queryClient = useQueryClient();
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [openedId, setOpenedId] = useState<number | null>(null);
  const [formMode, setFormMode] = useState<DatasetFormMode>(null);
  const [sourcePath, setSourcePath] = useState("");
  const [datasetName, setDatasetName] = useState("");
  const [datasetVersion, setDatasetVersion] = useState("v1.0");
  const [datasetProjectId, setDatasetProjectId] = useState("");
  const [datasetTopic, setDatasetTopic] = useState("Custom");
  const [datasetTask, setDatasetTask] = useState("Object Detection");
  const [datasetFormat, setDatasetFormat] = useState("YOLO");
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [taskFilter, setTaskFilter] = useState("All");
  const [sortMode, setSortMode] = useState("updated");
  const [viewMode, setViewMode] = useState<DatasetViewMode>("list");

  async function refresh(preferredId?: number) {
    const items = await getDatasets();
    setDatasets(items);
    setSelectedId((current) => preferredId ?? current ?? items[0]?.id ?? null);
  }

  useEffect(() => {
    void refresh().catch((reason: Error) => setMessage(reason.message));
  }, []);

  useEffect(() => {
    void getProjects()
      .then((items) => {
        setProjects(items);
        setDatasetProjectId((current) => current || (items[0] ? String(items[0].id) : ""));
      })
      .catch((reason: Error) => setMessage(reason.message));
  }, []);

  const filteredDatasets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return datasets
      .filter((dataset) => {
        const matchesSearch =
          !query ||
          dataset.name.toLowerCase().includes(query) ||
          dataset.version.toLowerCase().includes(query) ||
          dataset.topic.toLowerCase().includes(query) ||
          dataset.source_path.toLowerCase().includes(query);
        const matchesTask = taskFilter === "All" || dataset.task === taskFilter;
        return matchesSearch && matchesTask;
      })
      .sort((a, b) => {
        if (sortMode === "name") return `${a.name} ${a.version}`.localeCompare(`${b.name} ${b.version}`);
        if (sortMode === "images") return b.stats.images - a.stats.images;
        if (sortMode === "classes") return b.stats.classes - a.stats.classes;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
  }, [datasets, search, sortMode, taskFilter]);

  const selected = useMemo(
    () => datasets.find((dataset) => dataset.id === selectedId) ?? filteredDatasets[0] ?? null,
    [datasets, filteredDatasets, selectedId],
  );

  const openedDataset = openedId ? datasets.find((dataset) => dataset.id === openedId) ?? null : null;

  function toggleForm(mode: Exclude<DatasetFormMode, null>) {
    if (formMode === mode) {
      setFormMode(null);
      return;
    }
    setDatasetProjectId(selected?.project_id ? String(selected.project_id) : projects[0] ? String(projects[0].id) : "");
    setFormMode(mode);
  }

  if (openedDataset) {
    return (
      <DatasetWorkspace
        dataset={openedDataset}
        onBack={() => setOpenedId(null)}
        onDatasetChanged={(dataset) => {
          setDatasets((items) => {
            const exists = items.some((item) => item.id === dataset.id);
            return exists ? items.map((item) => (item.id === dataset.id ? dataset : item)) : [dataset, ...items];
          });
          setSelectedId(dataset.id);
          void Promise.all([
            queryClient.invalidateQueries({ queryKey: ["datasets"] }),
            queryClient.invalidateQueries({ queryKey: ["projects"] }),
          ]);
        }}
        onOpenDatasetWorkspace={(datasetId) => {
          setOpenedId(datasetId);
          setSelectedId(datasetId);
        }}
        onDeleted={(datasetId) => {
          const nextDatasets = datasets.filter((dataset) => dataset.id !== datasetId);
          setDatasets(nextDatasets);
          setOpenedId(null);
          setSelectedId(nextDatasets[0]?.id ?? null);
          void Promise.all([
            queryClient.invalidateQueries({ queryKey: ["datasets"] }),
            queryClient.invalidateQueries({ queryKey: ["projects"] }),
          ]);
        }}
      />
    );
  }

  async function handleImport() {
    setIsBusy(true);
    setMessage(null);
    try {
      const created = await importDataset({
        format: datasetFormat,
        name: datasetName.trim() || undefined,
        project_id: datasetProjectId ? Number(datasetProjectId) : null,
        source_path: sourcePath,
        task: datasetTask,
        topic: datasetTopic,
        version: datasetVersion,
      });
      await refresh(created.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["datasets"] }),
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
      ]);
      setFormMode(null);
      setDatasetName("");
      setMessage(`Imported ${created.name} ${created.version}`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Import failed");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCreate() {
    if (!datasetName.trim()) return;
    setIsBusy(true);
    setMessage(null);
    try {
      const created = await createDataset({
        format: datasetFormat,
        name: datasetName.trim(),
        project_id: datasetProjectId ? Number(datasetProjectId) : null,
        source_path: sourcePath.trim() || undefined,
        task: datasetTask,
        topic: datasetTopic,
        version: datasetVersion,
      });
      await refresh(created.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["datasets"] }),
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
      ]);
      setFormMode(null);
      setDatasetName("");
      setMessage(`Created ${created.name} ${created.version}`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Create failed");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRescan(dataset: DatasetItem) {
    setIsBusy(true);
    setMessage(null);
    try {
      const rescanned = await rescanDataset(dataset.id);
      setDatasets((items) => items.map((item) => (item.id === rescanned.id ? rescanned : item)));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["datasets"] }),
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
      ]);
      setMessage(`Rescanned ${rescanned.name}: ${formatCount(rescanned.stats.images)} images`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Rescan failed");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleOpenFolder(dataset: DatasetItem) {
    setMessage(null);
    try {
      await openDatasetFolder(dataset.id);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Open folder failed");
    }
  }

  return (
    <section className="ui-page ui-page-tight h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="ui-title">Datasets</h1>
          <p className="ui-subtitle mt-1">Manage datasets and versions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="h-8 gap-2" onClick={() => toggleForm("import")}>
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button className="h-8 gap-2" onClick={() => toggleForm("create")}>
            <Database className="h-4 w-4" />
            Add Dataset
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-8 min-w-[260px] flex-1 items-center gap-2 rounded-md border border-slate-200 px-3 text-slate-400 xl:max-w-[360px]">
            <Search className="h-4 w-4" />
            <input
              className="min-w-0 flex-1 bg-transparent text-[length:var(--font-sm)] outline-none placeholder:text-slate-400"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search datasets..."
              value={search}
            />
          </label>
          <SelectControl icon={<Filter className="h-4 w-4" />} value={taskFilter} onChange={setTaskFilter}>
            <option>All</option>
            {taskOptions.map((task) => (
              <option key={task}>{task}</option>
            ))}
          </SelectControl>
          <SelectControl value={sortMode} onChange={setSortMode}>
            <option value="updated">Updated</option>
            <option value="name">Name</option>
            <option value="images">Images</option>
            <option value="classes">Classes</option>
          </SelectControl>
          <Button variant="secondary" className="h-8 gap-2" disabled={isBusy} onClick={() => void refresh()}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <div className="ml-auto flex h-8 overflow-hidden rounded-md border border-slate-200">
            <IconToggle active={viewMode === "list"} title="List view" onClick={() => setViewMode("list")}>
              <List className="h-4 w-4" />
            </IconToggle>
            <IconToggle active={viewMode === "grid"} title="Grid view" onClick={() => setViewMode("grid")}>
              <Grid2X2 className="h-4 w-4" />
            </IconToggle>
          </div>
        </div>

        {formMode && (
          <DatasetCreatePanel
            datasetFormat={datasetFormat}
            datasetName={datasetName}
            datasetProjectId={datasetProjectId}
            datasetTask={datasetTask}
            datasetTopic={datasetTopic}
            datasetVersion={datasetVersion}
            formMode={formMode}
            isBusy={isBusy}
            onCancel={() => setFormMode(null)}
            onDatasetFormatChange={setDatasetFormat}
            onDatasetNameChange={setDatasetName}
            onDatasetProjectChange={setDatasetProjectId}
            onDatasetTaskChange={setDatasetTask}
            onDatasetTopicChange={setDatasetTopic}
            onDatasetVersionChange={setDatasetVersion}
            onSubmit={() => void (formMode === "import" ? handleImport() : handleCreate())}
            onSourcePathChange={setSourcePath}
            projects={projects}
            sourcePath={sourcePath}
          />
        )}

        {message && <div className="rounded-md bg-blue-50 px-3 py-2 text-[length:var(--font-sm)] font-medium text-primary">{message}</div>}
      </div>

      <div className="grid min-h-0 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-h-0">
          <CardContent className="flex h-full min-h-0 flex-col p-0">
            {viewMode === "list" ? (
              <DatasetTable
                datasets={filteredDatasets}
                onOpen={setOpenedId}
                onSelect={setSelectedId}
                selectedId={selected?.id ?? null}
              />
            ) : (
              <DatasetGrid datasets={filteredDatasets} onOpen={setOpenedId} onSelect={setSelectedId} selectedId={selected?.id ?? null} />
            )}
            <div className="border-t border-slate-100 px-3 py-2 text-[length:var(--font-xs)] text-slate-500">
              Showing {filteredDatasets.length ? 1 : 0} to {filteredDatasets.length} of {datasets.length} datasets
            </div>
          </CardContent>
        </Card>

        {selected ? (
          <DatasetDetails
            dataset={selected}
            isBusy={isBusy}
            onOpen={() => setOpenedId(selected.id)}
            onOpenFolder={() => void handleOpenFolder(selected)}
            onRescan={() => void handleRescan(selected)}
          />
        ) : (
          <EmptyState title="No datasets" subtitle="Import a folder or create an empty dataset record." />
        )}
      </div>
    </section>
  );
}

function DatasetCreatePanel({
  datasetFormat,
  datasetName,
  datasetProjectId,
  datasetTask,
  datasetTopic,
  datasetVersion,
  formMode,
  isBusy,
  onCancel,
  onDatasetFormatChange,
  onDatasetNameChange,
  onDatasetProjectChange,
  onDatasetTaskChange,
  onDatasetTopicChange,
  onDatasetVersionChange,
  onSourcePathChange,
  onSubmit,
  projects,
  sourcePath,
}: {
  datasetFormat: string;
  datasetName: string;
  datasetProjectId: string;
  datasetTask: string;
  datasetTopic: string;
  datasetVersion: string;
  formMode: Exclude<DatasetFormMode, null>;
  isBusy: boolean;
  onCancel: () => void;
  onDatasetFormatChange: (value: string) => void;
  onDatasetNameChange: (value: string) => void;
  onDatasetProjectChange: (value: string) => void;
  onDatasetTaskChange: (value: string) => void;
  onDatasetTopicChange: (value: string) => void;
  onDatasetVersionChange: (value: string) => void;
  onSourcePathChange: (value: string) => void;
  onSubmit: () => void;
  projects: ProjectSummary[];
  sourcePath: string;
}) {
  return (
    <Card>
      <CardContent className="grid gap-2 p-3 md:grid-cols-2 xl:grid-cols-[minmax(210px,1.4fr)_minmax(150px,1fr)_140px_88px_128px_108px_120px_auto]">
        <TextInput
          onChange={onSourcePathChange}
          placeholder={formMode === "import" ? "Source folder" : "Storage folder"}
          value={sourcePath}
        />
        <TextInput onChange={onDatasetNameChange} placeholder={formMode === "import" ? "Name, optional" : "Dataset name"} value={datasetName} />
        <SelectField value={datasetProjectId} onChange={onDatasetProjectChange}>
          <option value="">No project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </SelectField>
        <TextInput onChange={onDatasetVersionChange} placeholder="Version" value={datasetVersion} />
        <SelectField value={datasetTask} onChange={onDatasetTaskChange}>
          {taskOptions.map((task) => (
            <option key={task}>{task}</option>
          ))}
        </SelectField>
        <SelectField value={datasetFormat} onChange={onDatasetFormatChange}>
          {formatOptions.map((format) => (
            <option key={format}>{format}</option>
          ))}
        </SelectField>
        <TextInput onChange={onDatasetTopicChange} placeholder="Topic" value={datasetTopic} />
        <div className="flex gap-2">
          <Button className="h-8 whitespace-nowrap" disabled={isBusy || (formMode === "create" && !datasetName.trim())} onClick={onSubmit}>
            {isBusy ? "Working..." : formMode === "import" ? "Scan" : "Create"}
          </Button>
          <Button variant="secondary" className="h-8" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DatasetTable({
  datasets,
  onOpen,
  onSelect,
  selectedId,
}: {
  datasets: DatasetItem[];
  onOpen: (datasetId: number) => void;
  onSelect: (datasetId: number) => void;
  selectedId: number | null;
}) {
  if (!datasets.length) {
    return <EmptyState title="No matching datasets" subtitle="Clear search or filters to see all records." />;
  }

  return (
    <div className="min-h-0 overflow-y-auto overflow-x-hidden">
      <div className="grid w-full grid-cols-[minmax(180px,1.5fr)_64px_70px_66px_104px_minmax(104px,0.8fr)_80px_92px] border-b border-slate-200 px-3 py-3 text-[length:var(--font-xs)] font-semibold text-slate-500">
        <span>Dataset</span>
        <span>Version</span>
        <span>Images</span>
        <span>Videos</span>
        <span>Labeled</span>
        <span>Task</span>
        <span>Status</span>
        <span>Updated</span>
      </div>
      {datasets.map((dataset) => (
        <button
          className={cn(
            "grid w-full grid-cols-[minmax(180px,1.5fr)_64px_70px_66px_104px_minmax(104px,0.8fr)_80px_92px] items-center border-b border-slate-100 px-3 py-3 text-left text-[length:var(--font-sm)] transition-colors",
            selectedId === dataset.id ? "bg-blue-50/70" : "hover:bg-slate-50",
          )}
          key={dataset.id}
          onClick={() => onSelect(dataset.id)}
          onDoubleClick={() => onOpen(dataset.id)}
          type="button"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-primary">
              {dataset.stats.videos > 0 ? <PlaySquare className="h-5 w-5" /> : <FileImage className="h-5 w-5" />}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold text-slate-900">{dataset.name}</span>
              <span className="block truncate text-[length:var(--font-xs)] text-slate-500">{dataset.topic || dataset.source_path}</span>
            </span>
          </span>
          <span>
            <Badge>{dataset.version}</Badge>
          </span>
          <span className="text-slate-600">{formatCount(dataset.stats.images)}</span>
          <span className="text-slate-600">{formatCount(dataset.stats.videos)}</span>
          <span className="pr-3">
            <ProgressBar compact value={dataset.stats.labeled_percent} />
          </span>
          <span>
            <Badge className="max-w-[96px] truncate" tone={dataset.task.toLowerCase().includes("classification") ? "warning" : "info"}>
              {dataset.task}
            </Badge>
          </span>
          <span>
            <Badge tone={dataset.status === "Ready" ? "success" : "default"}>{dataset.status}</Badge>
          </span>
          <span className="truncate text-slate-500">{formatDateTime(dataset.updated_at)}</span>
        </button>
      ))}
    </div>
  );
}

function DatasetGrid({
  datasets,
  onOpen,
  onSelect,
  selectedId,
}: {
  datasets: DatasetItem[];
  onOpen: (datasetId: number) => void;
  onSelect: (datasetId: number) => void;
  selectedId: number | null;
}) {
  if (!datasets.length) {
    return <EmptyState title="No matching datasets" subtitle="Clear search or filters to see all records." />;
  }

  return (
    <div className="min-h-0 overflow-auto p-3">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
        {datasets.map((dataset) => (
          <button
            className={cn(
              "rounded-lg border bg-white p-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/40",
              selectedId === dataset.id ? "border-primary bg-blue-50/60" : "border-slate-200",
            )}
            key={dataset.id}
            onClick={() => onSelect(dataset.id)}
            onDoubleClick={() => onOpen(dataset.id)}
            type="button"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-primary">
                  <Database className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="ui-card-title truncate">{dataset.name}</div>
                  <div className="mt-1 text-[length:var(--font-xs)] text-slate-500">{dataset.version}</div>
                </div>
              </div>
              <Badge tone={dataset.status === "Ready" ? "success" : "default"}>{dataset.status}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[length:var(--font-xs)] text-slate-500">
              <MetricCell label="Images" value={formatCount(dataset.stats.images)} />
              <MetricCell label="Classes" value={formatCount(dataset.stats.classes)} />
              <MetricCell label="Labels" value={percentLabel(dataset.stats.labeled_percent)} />
            </div>
            <div className="mt-3">
              <SplitBars splits={dataset.splits} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function DatasetDetails({
  dataset,
  isBusy,
  onOpen,
  onOpenFolder,
  onRescan,
}: {
  dataset: DatasetItem;
  isBusy: boolean;
  onOpen: () => void;
  onOpenFolder: () => void;
  onRescan: () => void;
}) {
  const rows = [
    { icon: FileImage, label: "Images", value: formatCount(dataset.stats.images) },
    { icon: PlaySquare, label: "Videos", value: formatCount(dataset.stats.videos) },
    { icon: FileText, label: "Annotations", value: formatCount(dataset.stats.annotations) },
    { icon: ShieldCheck, label: "Verified", value: percentLabel(dataset.stats.verified_percent) },
  ];

  return (
    <Card className="min-h-0">
      <CardContent className="flex h-full min-h-0 flex-col p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="ui-section-title truncate">
              {dataset.name} {dataset.version}
            </h2>
            <p className="ui-subtitle mt-1 truncate">{dataset.source_path || "Storage path is not configured"}</p>
          </div>
          <Badge tone={dataset.status === "Ready" ? "success" : "default"}>{dataset.status}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {rows.map((row) => (
            <div className="rounded-lg border border-slate-200/80 p-2" key={row.label}>
              <row.icon className="mb-2 h-4 w-4 text-primary" />
              <div className="ui-stat-value">{row.value}</div>
              <div className="ui-meta mt-1 text-slate-500">{row.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-3 overflow-auto pr-1">
          <ProgressBar label="Labeled" value={dataset.stats.labeled_percent} />
          <ProgressBar label="Verified" value={dataset.stats.verified_percent} />

          <div>
            <h3 className="ui-card-title mb-2">Splits</h3>
            <SplitRows splits={dataset.splits} />
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-3 text-[length:var(--font-xs)]">
            <InfoRow label="Task" value={dataset.task} />
            <InfoRow label="Classes" value={String(dataset.stats.classes)} />
            <InfoRow label="Format" value={dataset.format} />
            <InfoRow label="Created" value={new Date(dataset.created_at).toLocaleDateString()} />
            <InfoRow label="Updated" value={formatDateTime(dataset.updated_at)} />
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          <Button className="h-8 gap-2" onClick={onOpen}>
            <Image className="h-4 w-4" />
            Open Workspace
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" className="h-8 gap-2" disabled={isBusy} onClick={onRescan}>
              <RefreshCcw className="h-4 w-4" />
              Rescan
            </Button>
            <Button variant="secondary" className="h-8 gap-2" onClick={onOpenFolder}>
              <Folder className="h-4 w-4" />
              Folder
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DatasetWorkspace({
  dataset,
  onBack,
  onDatasetChanged,
  onOpenDatasetWorkspace,
  onDeleted,
}: {
  dataset: DatasetItem;
  onBack: () => void;
  onDatasetChanged: (dataset: DatasetItem) => void;
  onOpenDatasetWorkspace: (datasetId: number) => void;
  onDeleted: (datasetId: number) => void;
}) {
  const [activeTab, setActiveTab] = useState<DatasetTab>("images");
  const [media, setMedia] = useState<DatasetMediaItem[]>([]);
  const [classes, setClasses] = useState<DatasetClassItem[]>([]);
  const [tags, setTags] = useState<DatasetTagCatalogItem["tags"]>([]);
  const [splits, setSplits] = useState<DatasetSplitItem[]>([]);
  const [events, setEvents] = useState<DatasetEventItem[]>([]);
  const [sources, setSources] = useState<DatasetSourceItem[]>([]);
  const [versions, setVersions] = useState<DatasetVersionSummary[]>([]);
  const [mediaPreset, setMediaPreset] = useState<MediaPreset | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function loadAssets() {
    setIsLoading(true);
    setMessage(null);
    try {
      const [mediaItems, classItems, tagCatalog, splitItems, eventItems, sourceItems, versionItems] = await Promise.all([
        getDatasetMedia(dataset.id),
        getDatasetClasses(dataset.id),
        getDatasetTagCatalog(dataset.id),
        getDatasetSplits(dataset.id),
        getDatasetEvents(dataset.id),
        getDatasetSources(dataset.id),
        getDatasetVersions(dataset.id),
      ]);
      setMedia(mediaItems);
      setClasses(classItems);
      setTags(tagCatalog.tags);
      setSplits(splitItems);
      setEvents(eventItems);
      setSources(sourceItems);
      setVersions(versionItems);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Dataset assets failed to load");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAssets();
  }, [dataset.id]);

  useEffect(() => {
    if (!message) return;
    const timerId = window.setTimeout(() => setMessage(null), 4500);
    return () => window.clearTimeout(timerId);
  }, [message]);

  const showContextPanel = activeTab !== "versions";

  return (
    <section className="ui-page ui-page-tight h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
      <div>
        <button className="mb-2 inline-flex items-center gap-2 text-[length:var(--font-sm)] font-semibold text-primary" onClick={onBack} type="button">
          <ArrowLeft className="h-4 w-4" />
          Back to datasets
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="ui-title truncate">
                {dataset.name} {dataset.version}
              </h1>
              <Badge tone={dataset.status === "Ready" ? "success" : "default"}>{dataset.status}</Badge>
            </div>
            <p className="ui-subtitle mt-1">{dataset.task} dataset</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="h-8 gap-2" disabled={isLoading} onClick={() => void loadAssets()}>
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
            <Button className="h-8 gap-2" onClick={() => setActiveTab("settings")}>
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>

        <div className="mt-3 flex border-b border-slate-200 text-[length:var(--font-sm)] font-semibold text-slate-500">
          {datasetTabs.map((tab) => (
            <button
              className={cn("px-4 py-2 transition-colors hover:text-slate-900", activeTab === tab.id && "border-b-2 border-primary text-primary")}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className={cn("grid min-h-0 min-w-0 gap-3", showContextPanel ? "xl:grid-cols-[minmax(0,1fr)_300px]" : "grid-cols-1")}>
        <div className="min-h-0 min-w-0 overflow-hidden">
          {message && (
            <div className="mb-2 flex items-center justify-between gap-3 rounded-md bg-blue-50 px-3 py-2 text-[length:var(--font-sm)] font-medium text-primary">
              <span>{message}</span>
              <button className="text-[length:var(--font-sm)] leading-none text-slate-400 hover:text-slate-700" onClick={() => setMessage(null)} type="button">
                x
              </button>
            </div>
          )}
          {activeTab === "overview" && <DatasetOverview classes={classes} dataset={dataset} media={media} />}
          {activeTab === "images" && (
            <DatasetImagesTab
              dataset={dataset}
              media={media}
              preset={mediaPreset}
              onDatasetChanged={onDatasetChanged}
              onMessage={setMessage}
              onReload={() => void loadAssets()}
              tags={tags}
            />
          )}
          {activeTab === "sources" && (
            <DatasetSourcesTab
              dataset={dataset}
              onDatasetChanged={onDatasetChanged}
              onMessage={setMessage}
              onReload={() => void loadAssets()}
              onViewMedia={(preset) => {
                setMediaPreset(preset);
                setActiveTab("images");
              }}
              onSourcesChanged={setSources}
              sources={sources}
            />
          )}
          {activeTab === "classes" && (
            <DatasetClassesTab
              classes={classes}
              dataset={dataset}
              onClassesChanged={setClasses}
              onDatasetChanged={onDatasetChanged}
              onMessage={setMessage}
            />
          )}
          {activeTab === "tags" && (
            <DatasetTagsTab
              dataset={dataset}
              onMessage={setMessage}
              onTagsChanged={setTags}
              tags={tags}
            />
          )}
          {activeTab === "splits" && <DatasetSplitsTab dataset={dataset} onMessage={setMessage} onSplitsChanged={setSplits} splits={splits} />}
          {activeTab === "versions" && (
            <DatasetVersionsTab
              dataset={dataset}
              events={events}
              onMessage={setMessage}
              onOpenVersion={onOpenDatasetWorkspace}
              onVersionCreated={(item) => {
                onDatasetChanged(item);
                void loadAssets();
              }}
              onVersionUpdated={(summary) => {
                setVersions((items) => items.map((item) => (item.dataset.id === summary.dataset.id ? summary : item)));
                if (summary.dataset.id === dataset.id) {
                  onDatasetChanged(summary.dataset);
                }
                void loadAssets();
              }}
              versions={versions}
            />
          )}
          {activeTab === "settings" && (
            <DatasetSettingsTab
              dataset={dataset}
              onDatasetChanged={onDatasetChanged}
              onDeleted={onDeleted}
              onMessage={setMessage}
              onRescanned={(item) => {
                onDatasetChanged(item);
                void loadAssets();
              }}
            />
          )}
        </div>
        {showContextPanel && <DatasetContextPanel classes={classes} dataset={dataset} media={media} />}
      </div>
    </section>
  );
}

function DatasetOverview({ classes, dataset, media }: { classes: DatasetClassItem[]; dataset: DatasetItem; media: DatasetMediaItem[] }) {
  const cards = [
    { icon: FileImage, label: "Images", value: formatCount(dataset.stats.images) },
    { icon: FileText, label: "Annotations", value: formatCount(dataset.stats.annotations) },
    { icon: Layers3, label: "Classes", value: formatCount(dataset.stats.classes) },
    { icon: CheckCircle2, label: "Verified", value: percentLabel(dataset.stats.verified_percent) },
  ];
  const topClasses = [...classes].sort((a, b) => b.instances - a.instances).slice(0, 5);

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_1fr] gap-3">
      <div className="grid gap-3 md:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="flex items-center gap-3 p-3">
              <div className="summary-icon">
                <card.icon className="h-4 w-4" />
              </div>
              <div>
                <div className="ui-stat-value">{card.value}</div>
                <div className="ui-label mt-1">{card.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid min-h-0 gap-3 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="min-h-0">
          <CardContent className="flex h-full min-h-0 flex-col p-4">
            <h2 className="ui-section-title mb-3">Dataset Progress</h2>
            <div className="space-y-4">
              <ProgressBar label="Labeled" value={dataset.stats.labeled_percent} />
              <ProgressBar label="Verified" value={dataset.stats.verified_percent} />
              <div>
                <h3 className="ui-card-title mb-2">Split Distribution</h3>
                <SplitBars splits={dataset.splits} />
                <div className="mt-3">
                  <SplitRows splits={dataset.splits} />
                </div>
              </div>
              <div className="space-y-2 border-t border-slate-100 pt-3 text-[length:var(--font-xs)]">
                <InfoRow label="Source" value={dataset.source_path || "not configured"} />
                <InfoRow label="Storage" value={dataset.storage_path || "not configured"} />
                <InfoRow label="Format" value={dataset.format} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-0">
          <CardContent className="flex h-full min-h-0 flex-col p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="ui-section-title">Class Index</h2>
              <Badge>{classes.length}</Badge>
            </div>
            {topClasses.length ? (
              <div className="space-y-2 overflow-auto pr-1">
                {topClasses.map((item) => (
                  <ClassBar classItem={item} key={item.id} max={topClasses[0]?.instances ?? 1} />
                ))}
              </div>
            ) : (
              <EmptyState compact title="No classes indexed" subtitle="Rescan after adding labels or class names." />
            )}
            <div className="mt-auto border-t border-slate-100 pt-3 text-[length:var(--font-xs)] text-slate-500">
              Loaded media preview: {formatCount(media.length)} item{media.length === 1 ? "" : "s"}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DatasetImagesTab({
  dataset,
  media,
  preset,
  onDatasetChanged,
  onMessage,
  onReload,
  tags,
}: {
  dataset: DatasetItem;
  media: DatasetMediaItem[];
  preset: MediaPreset | null;
  onDatasetChanged: (dataset: DatasetItem) => void;
  onMessage: (message: string | null) => void;
  onReload: () => void;
  tags: string[];
}) {
  const [search, setSearch] = useState("");
  const [split, setSplit] = useState("All");
  const [kind, setKind] = useState("All");
  const [labelState, setLabelState] = useState("All");
  const [verifiedState, setVerifiedState] = useState("All");
  const [viewMode, setViewMode] = useState<DatasetViewMode>("grid");
  const [page, setPage] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadSplit, setUploadSplit] = useState("Auto");
  const [extractFrames, setExtractFrames] = useState(true);
  const [frameInterval, setFrameInterval] = useState(30);
  const [assumedFps, setAssumedFps] = useState(30);
  const [bulkSplit, setBulkSplit] = useState("Train");
  const [bulkTagInput, setBulkTagInput] = useState("");
  const [videoPlans, setVideoPlans] = useState<Record<string, BrowserVideoPlan>>({});
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [isBulkBusy, setIsBulkBusy] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const pageSize = viewMode === "grid" ? 24 : 16;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return media.filter((item) => {
      const matchesSearch = !query || item.name.toLowerCase().includes(query) || item.path.toLowerCase().includes(query);
      const matchesSplit = split === "All" || item.split === split;
      const matchesKind = kind === "All" || item.kind === kind.toLowerCase();
      const matchesLabel =
        labelState === "All" || (labelState === "Annotated" && item.annotated) || (labelState === "Unlabeled" && !item.annotated);
      const matchesVerified =
        verifiedState === "All" || (verifiedState === "Verified" && item.verified) || (verifiedState === "Unverified" && !item.verified);
      return matchesSearch && matchesSplit && matchesKind && matchesLabel && matchesVerified;
    });
  }, [kind, labelState, media, search, split, verifiedState]);

  const pageCount = Math.max(Math.ceil(filtered.length / pageSize), 1);
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);
  const uploadVideoRows = useMemo(
    () =>
      uploadFiles.filter(isVideoUploadFile).map((file) => {
        const plan = videoPlans[fileKey(file)];
        const durationSeconds = plan?.durationSeconds ?? null;
        return {
          durationSeconds,
          estimatedFrames: extractFrames ? estimateBrowserFrames(durationSeconds, assumedFps, frameInterval) : 0,
          file,
          plan,
        };
      }),
    [assumedFps, extractFrames, frameInterval, uploadFiles, videoPlans],
  );
  const uploadImageCount = uploadFiles.filter((file) => !isVideoUploadFile(file)).length;
  const uploadEstimatedFrames = uploadVideoRows.reduce((sum, row) => sum + row.estimatedFrames, 0);
  const uploadTotalBytes = uploadFiles.reduce((sum, file) => sum + file.size, 0);
  const selectedSet = useMemo(() => new Set(selectedPaths), [selectedPaths]);

  useEffect(() => {
    setPage(1);
  }, [kind, labelState, search, split, verifiedState, viewMode]);

  useEffect(() => {
    if (!preset) return;
    if (preset.kind) setKind(preset.kind);
    if (preset.split) setSplit(preset.split);
    if (preset.search !== undefined) setSearch(preset.search);
    setPage(1);
  }, [preset]);

  useEffect(() => {
    setSelectedPaths((current) => current.filter((path) => media.some((item) => item.path === path)));
  }, [media]);

  function addFiles(files: FileList | File[]) {
    const nextFiles = Array.from(files);
    if (!nextFiles.length) return;
    setUploadFiles((current) => [...current, ...nextFiles]);
    for (const file of nextFiles.filter(isVideoUploadFile)) {
      void inspectBrowserVideo(file).then((plan) => {
        setVideoPlans((current) => ({ ...current, [fileKey(file)]: plan }));
      });
    }
  }

  async function uploadFilesNow() {
    if (!uploadFiles.length) return;
    setIsUploading(true);
    onMessage(null);
    try {
      const summary = await uploadDatasetAssets(dataset.id, uploadFiles, {
        extractVideoFrames: extractFrames,
        frameInterval,
        splitPolicy: uploadSplit,
      });
      onDatasetChanged(summary.dataset);
      setUploadFiles([]);
      setVideoPlans({});
      onReload();
      const warningText = formatWarningSummary(summary.warnings);
      onMessage(`Uploaded ${summary.files_saved} files, extracted ${summary.frames_saved} frames.${warningText}`);
    } catch (reason) {
      onMessage(reason instanceof Error ? reason.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  async function deleteMediaItem(item: DatasetMediaItem) {
    const confirmed = window.confirm(`Delete ${item.name} from the dataset folder?`);
    if (!confirmed) return;
    setDeletingPath(item.path);
    onMessage(null);
    try {
      const updated = await deleteDatasetMedia(dataset.id, item.path);
      onDatasetChanged(updated);
      onReload();
      onMessage(`Deleted ${item.name}`);
    } catch (reason) {
      onMessage(reason instanceof Error ? reason.message : "Delete media failed");
    } finally {
      setDeletingPath(null);
    }
  }

  function toggleSelection(path: string) {
    setSelectedPaths((current) => (current.includes(path) ? current.filter((item) => item !== path) : [...current, path]));
  }

  function clearSelection() {
    setSelectedPaths([]);
  }

  function selectAllFiltered() {
    setSelectedPaths(filtered.map((item) => item.path));
  }

  async function runBulkAction(payload: { operation: string; split?: string | null; tags?: string[] }, successFallback: string) {
    if (!selectedPaths.length) return;
    setIsBulkBusy(true);
    onMessage(null);
    try {
      const summary = await applyDatasetMediaBulkAction(dataset.id, {
        operation: payload.operation,
        paths: selectedPaths,
        split: payload.split,
        tags: payload.tags,
      });
      onDatasetChanged(summary.dataset);
      clearSelection();
      onReload();
      onMessage(summary.message || successFallback);
    } catch (reason) {
      onMessage(reason instanceof Error ? reason.message : "Bulk media update failed");
    } finally {
      setIsBulkBusy(false);
    }
  }

  async function excludeSelected() {
    const confirmed = window.confirm(`Exclude ${selectedPaths.length} selected files from ${dataset.version}? Files stay on disk and in other versions.`);
    if (!confirmed) return;
    await runBulkAction({ operation: "exclude" }, "Files excluded from current version");
  }

  async function moveSelectedToSplit() {
    await runBulkAction({ operation: "move_split", split: bulkSplit }, `Moved selected files to ${bulkSplit}`);
  }

  async function addTagsToSelected() {
    const parsedTags = bulkTagInput
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (!parsedTags.length) {
      onMessage("Enter at least one tag");
      return;
    }
    await runBulkAction({ operation: "add_tags", tags: parsedTags }, "Tags added to selected files");
    setBulkTagInput("");
  }

  return (
    <div className="grid h-full min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-3">
      <Card>
        <CardContent className="space-y-3 p-3">
          <div
            className={cn(
              "grid min-h-[52px] min-w-[760px] grid-cols-[150px_126px_124px_74px_74px_88px_82px] items-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-3 py-2 transition-colors",
              isDragging && "border-primary bg-blue-50",
            )}
            onDragLeave={() => setIsDragging(false)}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              addFiles(event.dataTransfer.files);
            }}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[length:var(--font-sm)] font-semibold text-slate-900">
                <Upload className="h-4 w-4 text-primary" />
                Drop files here
              </div>
            </div>
            <SelectField value={uploadSplit} onChange={setUploadSplit}>
              <option>Auto</option>
              <option>Train</option>
              <option>Val</option>
              <option>Test</option>
            </SelectField>
            <label className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 text-[length:var(--font-xs)] font-semibold text-slate-600">
              <input className="accent-primary" checked={extractFrames} onChange={(event) => setExtractFrames(event.target.checked)} type="checkbox" />
              Extract frames
            </label>
            <label className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 text-[length:var(--font-xs)] font-semibold text-slate-500">
              Step
              <input
                className="w-8 bg-transparent text-[length:var(--font-sm)] text-slate-800 outline-none"
                min={1}
                onChange={(event) => setFrameInterval(Number(event.target.value) || 1)}
                title="Frame interval"
                type="number"
                value={frameInterval}
              />
            </label>
            <label className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 text-[length:var(--font-xs)] font-semibold text-slate-500">
              FPS
              <input
                className="w-8 bg-transparent text-[length:var(--font-sm)] text-slate-800 outline-none"
                min={1}
                onChange={(event) => setAssumedFps(Number(event.target.value) || 1)}
                title="Estimated FPS for browser-side frame planning"
                type="number"
                value={assumedFps}
              />
            </label>
            <label className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-slate-50 px-2 text-[length:var(--font-sm)] font-semibold text-slate-700 hover:bg-slate-100">
              <Upload className="h-4 w-4" />
              Choose
              <input
                accept="image/*,video/*,.jpg,.jpeg,.png,.bmp,.tif,.tiff,.webp,.mp4,.mov,.m4v,.avi,.mkv,.wmv,.webm"
                className="hidden"
                multiple
                onChange={(event) => {
                  if (event.target.files) addFiles(event.target.files);
                }}
                type="file"
              />
            </label>
            <Button className="h-8 px-2" disabled={!uploadFiles.length || isUploading} onClick={() => void uploadFilesNow()}>
              {isUploading ? "..." : uploadFiles.length ? `Upload ${uploadFiles.length}` : "Upload"}
            </Button>
          </div>

          {uploadFiles.length > 0 && (
            <BrowserFramePlanPanel
              assumedFps={assumedFps}
              estimatedFrames={uploadEstimatedFrames}
              imageCount={uploadImageCount}
              onClear={() => {
                setUploadFiles([]);
                setVideoPlans({});
              }}
              rows={uploadVideoRows}
              totalBytes={uploadTotalBytes}
              totalFiles={uploadFiles.length}
            />
          )}

          <div className="grid items-end gap-2 lg:grid-cols-[minmax(180px,1fr)_132px_132px_132px_132px_auto]">
            <label className="flex h-8 min-w-0 items-center gap-2 rounded-md border border-slate-200 px-3 text-slate-400">
              <Search className="h-4 w-4" />
              <input
                className="min-w-0 flex-1 bg-transparent text-[length:var(--font-sm)] outline-none placeholder:text-slate-400"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search media..."
                value={search}
              />
            </label>
            <FilterField label="Split">
              <SelectField value={split} onChange={setSplit}>
                <option>All</option>
                <option>Train</option>
                <option>Val</option>
                <option>Test</option>
              </SelectField>
            </FilterField>
            <FilterField label="Media type">
              <SelectField value={kind} onChange={setKind}>
                <option>All</option>
                <option>image</option>
                <option>video</option>
              </SelectField>
            </FilterField>
            <FilterField label="Labels">
              <SelectField value={labelState} onChange={setLabelState}>
                <option>All</option>
                <option>Annotated</option>
                <option>Unlabeled</option>
              </SelectField>
            </FilterField>
            <FilterField label="Verified">
              <SelectField value={verifiedState} onChange={setVerifiedState}>
                <option>All</option>
                <option>Verified</option>
                <option>Unverified</option>
              </SelectField>
            </FilterField>
            <div className="flex h-8 overflow-hidden rounded-md border border-slate-200">
              <IconToggle active={viewMode === "grid"} title="Grid view" onClick={() => setViewMode("grid")}>
                <Grid2X2 className="h-4 w-4" />
              </IconToggle>
              <IconToggle active={viewMode === "list"} title="List view" onClick={() => setViewMode("list")}>
                <List className="h-4 w-4" />
              </IconToggle>
            </div>
          </div>

          {selectedPaths.length > 0 && (
            <div className="grid gap-2 rounded-lg border border-blue-100 bg-blue-50/50 p-3 xl:grid-cols-[auto_auto_120px_auto_minmax(180px,1fr)_auto_auto]">
              <div className="flex h-8 items-center text-[length:var(--font-sm)] font-semibold text-slate-800">
                {formatCount(selectedPaths.length)} selected
              </div>
              <Button variant="secondary" className="h-8" disabled={isBulkBusy} onClick={selectAllFiltered}>
                Select filtered
              </Button>
              <SelectField value={bulkSplit} onChange={setBulkSplit}>
                <option>Train</option>
                <option>Val</option>
                <option>Test</option>
              </SelectField>
              <Button variant="secondary" className="h-8 gap-2" disabled={isBulkBusy} onClick={() => void moveSelectedToSplit()}>
                <Scissors className="h-4 w-4" />
                Move split
              </Button>
              <div className="min-w-0">
                <input
                  className="h-8 w-full rounded-md border border-slate-200 bg-white px-3 text-[length:var(--font-sm)] outline-none placeholder:text-slate-400"
                  list="dataset-tag-catalog"
                  onChange={(event) => setBulkTagInput(event.target.value)}
                  placeholder="Add tags to selection..."
                  value={bulkTagInput}
                />
                <datalist id="dataset-tag-catalog">
                  {tags.map((tag) => (
                    <option key={tag} value={tag} />
                  ))}
                </datalist>
              </div>
              <Button variant="secondary" className="h-8 gap-2" disabled={isBulkBusy} onClick={() => void addTagsToSelected()}>
                <Tags className="h-4 w-4" />
                Add tags
              </Button>
              <div className="flex items-center justify-end gap-2">
                <Button variant="secondary" className="h-8" disabled={isBulkBusy} onClick={clearSelection}>
                  Clear
                </Button>
                <Button className="h-8 gap-2 bg-rose-500 hover:bg-rose-600" disabled={isBulkBusy} onClick={() => void excludeSelected()}>
                  <Trash2 className="h-4 w-4" />
                  Exclude from version
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="min-h-0 overflow-auto pr-1">
        {!media.length ? (
          <EmptyState title="No media found" subtitle={dataset.source_path || "Dataset source path is empty."} />
        ) : !pageItems.length ? (
          <EmptyState title="No media matches filters" subtitle="Adjust search or filter values." />
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-2">
            {pageItems.map((item) => (
              <MediaCard
                deleting={deletingPath === item.path}
                item={item}
                key={item.id}
                onDelete={() => void deleteMediaItem(item)}
                onToggleSelect={() => toggleSelection(item.path)}
                selected={selectedSet.has(item.path)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {pageItems.map((item) => (
              <MediaRow
                deleting={deletingPath === item.path}
                item={item}
                key={item.id}
                onDelete={() => void deleteMediaItem(item)}
                onToggleSelect={() => toggleSelection(item.path)}
                selected={selectedSet.has(item.path)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 bg-white pt-2">
        <Pagination currentPage={page} pageCount={pageCount} total={filtered.length} onPageChange={setPage} pageSize={pageSize} />
      </div>
    </div>
  );
}

function BrowserFramePlanPanel({
  assumedFps,
  estimatedFrames,
  imageCount,
  onClear,
  rows,
  totalBytes,
  totalFiles,
}: {
  assumedFps: number;
  estimatedFrames: number;
  imageCount: number;
  onClear: () => void;
  rows: Array<{ durationSeconds: number | null; estimatedFrames: number; file: File; plan?: BrowserVideoPlan }>;
  totalBytes: number;
  totalFiles: number;
}) {
  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <div className="ui-card-title">Frame plan</div>
          <div className="mt-1 text-[length:var(--font-xs)] text-slate-500">
            {totalFiles} files, {rows.length} videos, {imageCount} images, {formatBytes(totalBytes)} total.
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="ui-stat-value">{formatCount(estimatedFrames)}</div>
            <div className="ui-meta mt-1 text-slate-500">estimated frames</div>
          </div>
          <Button variant="secondary" className="h-8" onClick={onClear}>
            Clear
          </Button>
        </div>
      </div>

      {rows.length ? (
        <div className="max-h-[170px] overflow-auto rounded-md border border-slate-200 bg-white">
          <div className="grid grid-cols-[minmax(180px,1fr)_90px_90px_100px] border-b border-slate-100 px-3 py-2 text-[length:var(--font-xs)] font-semibold uppercase tracking-[0.08em] text-slate-400">
            <span>Video</span>
            <span>Duration</span>
            <span>Size</span>
            <span>Frames</span>
          </div>
          {rows.map((row) => (
            <div className="grid grid-cols-[minmax(180px,1fr)_90px_90px_100px] items-center border-b border-slate-100 px-3 py-2 text-[length:var(--font-xs)] last:border-b-0" key={fileKey(row.file)}>
              <span className="min-w-0">
                <span className="block truncate font-semibold text-slate-700">{row.file.name}</span>
                {row.plan?.error && <span className="block truncate text-[length:var(--font-xs)] text-amber-600">{row.plan.error}</span>}
              </span>
              <span className="text-slate-500">{formatDuration(row.durationSeconds)}</span>
              <span className="text-slate-500">{formatBytes(row.file.size)}</span>
              <span className="font-semibold text-slate-700">{formatCount(row.estimatedFrames)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[length:var(--font-xs)] text-slate-500">
          No videos selected. Images will be copied without frame extraction.
        </div>
      )}
      {rows.length > 0 && (
        <div className="mt-2 text-[length:var(--font-xs)] leading-4 text-slate-500">
          Browser estimate uses {assumedFps} FPS. Exact count is written after ffmpeg extracts frames.
        </div>
      )}
    </div>
  );
}

function SourceFramePlanPanel({ plan }: { plan: DatasetVideoPlanSummary }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <div className="ui-card-title">Source frame plan</div>
          <div className="mt-1 text-[length:var(--font-xs)] text-slate-500">
            {formatCount(plan.video_count)} videos, {formatBytes(plan.total_size_bytes)}, step {plan.frame_interval}, split {plan.split_policy}.
          </div>
        </div>
        <div className="text-right">
          <div className="ui-stat-value">{formatCount(plan.estimated_frames)}</div>
          <div className="ui-meta mt-1 text-slate-500">estimated frames</div>
        </div>
      </div>
      {plan.warnings.length > 0 && (
        <div className="mb-2 rounded-md bg-amber-50 px-3 py-2 text-[length:var(--font-xs)] text-amber-700">{plan.warnings.join(" ")}</div>
      )}
      {plan.items.length ? (
        <div className="max-h-[190px] overflow-auto rounded-md border border-slate-200">
          <div className="grid grid-cols-[minmax(180px,1fr)_76px_84px_84px_84px] border-b border-slate-100 bg-slate-50 px-3 py-2 text-[length:var(--font-xs)] font-semibold uppercase tracking-[0.08em] text-slate-400">
            <span>Video</span>
            <span>Split</span>
            <span>Duration</span>
            <span>FPS</span>
            <span>Frames</span>
          </div>
          {plan.items.map((item) => (
            <div className="grid grid-cols-[minmax(180px,1fr)_76px_84px_84px_84px] items-center border-b border-slate-100 px-3 py-2 text-[length:var(--font-xs)] last:border-b-0" key={item.path}>
              <span className="min-w-0">
                <span className="block truncate font-semibold text-slate-700">{item.name}</span>
                <span className="block truncate text-[length:var(--font-xs)] text-slate-400" title={item.path}>
                  {item.path}
                </span>
                {item.warning && <span className="block truncate text-[length:var(--font-xs)] text-amber-600">{item.warning}</span>}
              </span>
              <span className="text-slate-500">{item.split}</span>
              <span className="text-slate-500">{formatDuration(item.duration_seconds)}</span>
              <span className="text-slate-500">{item.fps ? item.fps.toFixed(1) : "-"}</span>
              <span className="font-semibold text-slate-700">{formatCount(item.estimated_frames)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-[length:var(--font-xs)] text-slate-500">
          No videos found in this source folder.
        </div>
      )}
    </div>
  );
}

function DatasetSourcesTab({
  dataset,
  onDatasetChanged,
  onMessage,
  onReload,
  onViewMedia,
  onSourcesChanged,
  sources,
}: {
  dataset: DatasetItem;
  onDatasetChanged: (dataset: DatasetItem) => void;
  onMessage: (message: string | null) => void;
  onReload: () => void;
  onViewMedia: (preset: MediaPreset) => void;
  onSourcesChanged: (sources: DatasetSourceItem[]) => void;
  sources: DatasetSourceItem[];
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [sourcePath, setSourcePath] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceType, setSourceType] = useState("folder");
  const [splitPolicy, setSplitPolicy] = useState("Auto");
  const [copyAssets, setCopyAssets] = useState(true);
  const [extractFrames, setExtractFrames] = useState(false);
  const [frameInterval, setFrameInterval] = useState(30);
  const [notes, setNotes] = useState("");
  const [sourcePlan, setSourcePlan] = useState<DatasetVideoPlanSummary | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [extractingSourceId, setExtractingSourceId] = useState<number | null>(null);
  const totalImages = sources.reduce((sum, item) => sum + item.images, 0);
  const totalVideos = sources.reduce((sum, item) => sum + item.videos, 0);
  const totalFrames = sources.reduce((sum, item) => sum + item.frames, 0);
  const uploadCount = sources.filter((item) => item.source_type === "upload").length;
  const pendingFrameSource = sources.find((source) => source.videos > 0 && source.frames === 0);

  async function createSource() {
    if (!sourcePath.trim()) return;
    setIsBusy(true);
    onMessage(null);
    try {
      const summary = await addDatasetSource(dataset.id, {
        copy_assets: copyAssets,
        extract_video_frames: extractFrames,
        frame_interval: frameInterval,
        name: sourceName.trim() || undefined,
        notes,
        source_path: sourcePath.trim(),
        source_type: sourceType,
        split_policy: splitPolicy,
      });
      onDatasetChanged(summary.dataset);
      onSourcesChanged(summary.sources);
      setSourcePath("");
      setSourceName("");
      setNotes("");
      setSourcePlan(null);
      setShowAdd(false);
      onReload();
      const warningText = formatWarningSummary(summary.warnings);
      onMessage(`Source added: ${summary.source.name}.${warningText}`);
    } catch (reason) {
      onMessage(reason instanceof Error ? reason.message : "Add source failed");
    } finally {
      setIsBusy(false);
    }
  }

  async function analyzeSource() {
    if (!sourcePath.trim()) return;
    setIsPlanning(true);
    onMessage(null);
    try {
      const plan = await previewDatasetSourceVideoPlan(dataset.id, {
        frame_interval: frameInterval,
        source_path: sourcePath.trim(),
        split_policy: splitPolicy,
      });
      setSourcePlan(plan);
    } catch (reason) {
      setSourcePlan(null);
      onMessage(reason instanceof Error ? reason.message : "Video plan failed");
    } finally {
      setIsPlanning(false);
    }
  }

  async function extractFramesForSource(source: DatasetSourceItem) {
    setExtractingSourceId(source.id);
    onMessage(null);
    try {
      const summary = await extractDatasetSourceFrames(dataset.id, source.id, { frame_interval: frameInterval });
      onDatasetChanged(summary.dataset);
      onSourcesChanged(summary.sources);
      onReload();
      const warningText = formatWarningSummary(summary.warnings);
      onMessage(`Extracted ${summary.frames_saved} frames from ${summary.source.name}.${warningText}`);
    } catch (reason) {
      onMessage(reason instanceof Error ? reason.message : "Extract frames failed");
    } finally {
      setExtractingSourceId(null);
    }
  }

  return (
    <div className="grid h-full min-h-0 min-w-0 grid-rows-[auto_1fr] gap-3">
      <div className="grid min-w-0 grid-cols-2 gap-3 2xl:grid-cols-4">
        <SourceMetric label="Sources" value={formatCount(sources.length)} />
        <SourceMetric label="Images" value={formatCount(totalImages)} />
        <SourceMetric label="Videos" value={formatCount(totalVideos)} />
        <SourceMetric label="Frames" value={formatCount(totalFrames)} detail={`${formatCount(uploadCount)} upload batches`} />
      </div>

      <Card className="min-h-0">
        <CardContent className="flex h-full min-h-0 flex-col p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="ui-section-title">Sources / Batches</h2>
              <p className="mt-1 text-[length:var(--font-xs)] text-slate-500">Track every folder, upload batch, and version branch that forms this dataset.</p>
            </div>
            <Button className="h-8 gap-2" onClick={() => setShowAdd((value) => !value)}>
              <Plus className="h-4 w-4" />
              Add Source
            </Button>
          </div>

          {showAdd && (
            <div className="mb-3 space-y-2 rounded-lg border border-blue-100 bg-blue-50/40 p-3">
              <div className="grid gap-2 xl:grid-cols-[minmax(220px,1fr)_180px_120px_120px]">
                <TextInput
                  onChange={(value) => {
                    setSourcePath(value);
                    setSourcePlan(null);
                  }}
                  placeholder="Source folder path"
                  value={sourcePath}
                />
                <TextInput onChange={setSourceName} placeholder="Batch name, optional" value={sourceName} />
                <SelectField value={sourceType} onChange={setSourceType}>
                  <option value="folder">Folder</option>
                  <option value="raw">Raw</option>
                  <option value="export">Export</option>
                  <option value="external">External</option>
                </SelectField>
                <SelectField
                  value={splitPolicy}
                  onChange={(value) => {
                    setSplitPolicy(value);
                    setSourcePlan(null);
                  }}
                >
                  <option>Auto</option>
                  <option>Train</option>
                  <option>Val</option>
                  <option>Test</option>
                </SelectField>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-[length:var(--font-xs)] font-semibold text-slate-600">
                  <input checked={copyAssets} onChange={(event) => setCopyAssets(event.target.checked)} type="checkbox" />
                  Copy assets into dataset
                </label>
                <label className="flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-[length:var(--font-xs)] font-semibold text-slate-600">
                  <input checked={extractFrames} onChange={(event) => setExtractFrames(event.target.checked)} type="checkbox" />
                  Extract video frames
                </label>
                <input
                  className="h-8 w-20 rounded-md border border-slate-200 bg-white px-2 text-[length:var(--font-sm)] outline-none"
                  min={1}
                  onChange={(event) => {
                    setFrameInterval(Number(event.target.value) || 1);
                    setSourcePlan(null);
                  }}
                  title="Frame interval"
                  type="number"
                  value={frameInterval}
                />
                <div className="min-w-[220px] flex-1">
                  <TextInput onChange={setNotes} placeholder="Notes, optional" value={notes} />
                </div>
                <Button variant="secondary" className="h-8" disabled={isPlanning || !sourcePath.trim()} onClick={() => void analyzeSource()}>
                  {isPlanning ? "Analyzing..." : "Analyze"}
                </Button>
                <Button className="h-8" disabled={isBusy || !sourcePath.trim()} onClick={() => void createSource()}>
                  {isBusy ? "Adding..." : "Add"}
                </Button>
              </div>
              {sourcePlan && <SourceFramePlanPanel plan={sourcePlan} />}
            </div>
          )}

          {pendingFrameSource && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[length:var(--font-xs)] leading-5 text-amber-800">
              <span>
                Videos are indexed, but no extracted frames are tracked yet. Extract frames from the upload batch, then open Images to label them.
              </span>
              <div className="flex items-center gap-2">
                <Button variant="secondary" className="h-7 gap-1 px-2 text-[length:var(--font-xs)]" onClick={() => onViewMedia({ kind: "video", search: sourceVideoSearch(pendingFrameSource), split: sourcePrimarySplit(pendingFrameSource) })}>
                  <PlaySquare className="h-3.5 w-3.5" />
                  View videos
                </Button>
                <Button className="h-7 gap-1 px-2 text-[length:var(--font-xs)]" disabled={extractingSourceId === pendingFrameSource.id} onClick={() => void extractFramesForSource(pendingFrameSource)}>
                  <Scissors className="h-3.5 w-3.5" />
                  {extractingSourceId === pendingFrameSource.id ? "Extracting..." : "Extract frames"}
                </Button>
              </div>
            </div>
          )}

          <div className="min-h-0 overflow-x-auto overflow-y-auto rounded-lg border border-slate-200">
            <div className="grid min-w-[820px] grid-cols-[minmax(170px,1.35fr)_70px_110px_82px_104px_72px_82px_132px] border-b border-slate-200 bg-slate-50 px-3 py-2 text-[length:var(--font-xs)] font-semibold text-slate-500">
              <span>Source</span>
              <span>Type</span>
              <span>Media</span>
              <span>Labels</span>
              <span>Splits</span>
              <span>Status</span>
              <span>Updated</span>
              <span>Actions</span>
            </div>
            {sources.length ? (
              sources.map((source) => (
                <div className="grid min-w-[820px] grid-cols-[minmax(170px,1.35fr)_70px_110px_82px_104px_72px_82px_132px] items-center border-b border-slate-100 px-3 py-3 text-[length:var(--font-sm)] last:border-b-0" key={source.id}>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900">{source.name}</div>
                    <div className="mt-0.5 truncate text-[length:var(--font-xs)] text-slate-500" title={source.source_path}>
                      {source.source_path || source.target_path || "internal"}
                    </div>
                    {source.notes && <div className="mt-0.5 truncate text-[length:var(--font-xs)] text-slate-400">{source.notes}</div>}
                  </div>
                  <Badge tone={source.source_type === "upload" ? "info" : source.source_type === "export" ? "warning" : "default"}>
                    {source.source_type}
                  </Badge>
                  <div className="text-slate-600">
                    <div>{formatCount(source.images)} images</div>
                    <div className="text-[length:var(--font-xs)] text-slate-400">{formatCount(source.videos)} videos</div>
                    {source.videos > 0 && (
                      <div className={cn("text-[length:var(--font-xs)]", source.frames > 0 ? "text-slate-400" : "text-amber-600")}>
                        {source.frames > 0 ? `${formatCount(source.frames)} frames` : "frames not extracted"}
                      </div>
                    )}
                  </div>
                  <div className="text-slate-600">
                    <div>{formatCount(source.annotations)} ann.</div>
                    <div className="text-[length:var(--font-xs)] text-slate-400">{formatCount(source.classes)} classes</div>
                  </div>
                  <SourceSplitMini source={source} />
                  <Badge tone={source.status === "Ready" ? "success" : "default"}>{source.status}</Badge>
                  <span className="text-slate-500">{formatDateTime(source.updated_at)}</span>
                  <SourceActions
                    extracting={extractingSourceId === source.id}
                    onExtract={() => void extractFramesForSource(source)}
                    onViewFrames={() => onViewMedia({ kind: "image", search: sourceFrameSearch(source), split: sourcePrimarySplit(source) })}
                    onViewVideos={() => onViewMedia({ kind: "video", search: sourceVideoSearch(source), split: sourcePrimarySplit(source) })}
                    source={source}
                  />
                </div>
              ))
            ) : (
              <div className="p-3">
                <EmptyState compact title="No sources tracked" subtitle="Add a source folder or upload files to create the first batch record." />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DatasetClassesTab({
  classes,
  dataset,
  onClassesChanged,
  onDatasetChanged,
  onMessage,
}: {
  classes: DatasetClassItem[];
  dataset: DatasetItem;
  onClassesChanged: (classes: DatasetClassItem[]) => void;
  onDatasetChanged: (dataset: DatasetItem) => void;
  onMessage: (message: string | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState("instances");
  const [newClassName, setNewClassName] = useState("");
  const [importText, setImportText] = useState("");
  const [importMode, setImportMode] = useState("append");
  const [showImport, setShowImport] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return classes
      .filter((item) => !query || item.name.toLowerCase().includes(query) || item.id.toLowerCase().includes(query))
      .sort((a, b) => {
        if (sortMode === "name") return a.name.localeCompare(b.name);
        if (sortMode === "id") return a.id.localeCompare(b.id, undefined, { numeric: true });
        return b.instances - a.instances;
      });
  }, [classes, search, sortMode]);

  async function copyClasses() {
    const text = classes.map((item) => `${item.id}\t${item.name}\t${item.instances}`).join("\n");
    await navigator.clipboard?.writeText(text).catch(() => undefined);
  }

  async function createClass() {
    if (!newClassName.trim()) return;
    setIsBusy(true);
    onMessage(null);
    try {
      const nextClasses = await addDatasetClass(dataset.id, newClassName.trim());
      onClassesChanged(nextClasses);
      onDatasetChanged({ ...dataset, stats: { ...dataset.stats, classes: nextClasses.length } });
      setNewClassName("");
      onMessage("Class added");
    } catch (reason) {
      onMessage(reason instanceof Error ? reason.message : "Add class failed");
    } finally {
      setIsBusy(false);
    }
  }

  async function importClasses() {
    const names = importText
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (!names.length) return;
    setIsBusy(true);
    onMessage(null);
    try {
      const nextClasses = await importDatasetClasses(dataset.id, names, importMode);
      onClassesChanged(nextClasses);
      onDatasetChanged({ ...dataset, stats: { ...dataset.stats, classes: nextClasses.length } });
      setImportText("");
      setShowImport(false);
      onMessage(`Imported ${nextClasses.length} classes`);
    } catch (reason) {
      onMessage(reason instanceof Error ? reason.message : "Import classes failed");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Card className="h-full min-h-0">
      <CardContent className="flex h-full min-h-0 flex-col p-4">
        <div className="mb-3 grid items-center gap-2 xl:grid-cols-[minmax(210px,260px)_112px_108px_minmax(240px,1fr)_140px_86px]">
          <div className="min-w-0">
            <TextInput onChange={setNewClassName} placeholder="New class name" value={newClassName} />
          </div>
          <Button className="h-8 gap-2 whitespace-nowrap" disabled={isBusy || !newClassName.trim()} onClick={() => void createClass()}>
            <Plus className="h-4 w-4" />
            Add Class
          </Button>
          <Button variant="secondary" className="h-8 gap-2" onClick={() => setShowImport((value) => !value)}>
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <label className="flex h-8 min-w-0 items-center gap-2 rounded-md border border-slate-200 px-3 text-slate-400">
            <Search className="h-4 w-4" />
            <input
              className="min-w-0 flex-1 bg-transparent text-[length:var(--font-sm)] outline-none placeholder:text-slate-400"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search classes..."
              value={search}
            />
          </label>
          <SelectField value={sortMode} onChange={setSortMode}>
            <option value="instances">Instances</option>
            <option value="name">Name</option>
            <option value="id">Class id</option>
          </SelectField>
          <Button variant="secondary" className="h-8 gap-2" onClick={() => void copyClasses()}>
            <Copy className="h-4 w-4" />
            Copy
          </Button>
        </div>

        {showImport && (
          <div className="mb-3 grid gap-2 rounded-lg border border-blue-100 bg-blue-50/40 p-3 md:grid-cols-[1fr_130px_auto]">
            <textarea
              className="min-h-[86px] rounded-md border border-slate-200 bg-white px-3 py-2 text-[length:var(--font-sm)] outline-none"
              onChange={(event) => setImportText(event.target.value)}
              placeholder={"person\ncar\ndrone"}
              value={importText}
            />
            <SelectField value={importMode} onChange={setImportMode}>
              <option value="append">Append</option>
              <option value="replace">Replace</option>
            </SelectField>
            <Button className="h-8" disabled={isBusy || !importText.trim()} onClick={() => void importClasses()}>
              Import List
            </Button>
          </div>
        )}

        {!classes.length ? (
          <EmptyState title="No classes indexed" subtitle="Create classes manually or import a class list before labeling." />
        ) : (
        <div className="min-h-0 overflow-auto rounded-lg border border-slate-200">
          <div className="grid grid-cols-[70px_minmax(160px,1fr)_110px_180px] border-b border-slate-200 bg-slate-50 px-3 py-2 text-[length:var(--font-xs)] font-semibold text-slate-500">
            <span>ID</span>
            <span>Class</span>
            <span>Instances</span>
            <span>Distribution</span>
          </div>
          {filtered.map((item) => (
            <div className="grid grid-cols-[70px_minmax(160px,1fr)_110px_180px] items-center border-b border-slate-100 px-3 py-2 text-[length:var(--font-sm)] last:border-b-0" key={item.id}>
              <span className="text-slate-500">{item.id}</span>
              <span className="flex items-center gap-2 font-medium">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name}
              </span>
              <span className="text-slate-600">{formatCount(item.instances)}</span>
              <DistributionBar color={item.color} max={filtered[0]?.instances ?? 1} value={item.instances} />
            </div>
          ))}
        </div>
        )}
      </CardContent>
    </Card>
  );
}

function DatasetTagsTab({
  dataset,
  onMessage,
  onTagsChanged,
  tags,
}: {
  dataset: DatasetItem;
  onMessage: (message: string | null) => void;
  onTagsChanged: (tags: string[]) => void;
  tags: string[];
}) {
  const [newTag, setNewTag] = useState("");
  const [search, setSearch] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tags.filter((item) => !query || item.toLowerCase().includes(query));
  }, [search, tags]);

  async function saveTags(nextTags: string[], successMessage: string) {
    setIsBusy(true);
    onMessage(null);
    try {
      const response = await updateDatasetTagCatalog(dataset.id, nextTags);
      onTagsChanged(response.tags);
      onMessage(successMessage);
    } catch (reason) {
      onMessage(reason instanceof Error ? reason.message : "Update tags failed");
    } finally {
      setIsBusy(false);
    }
  }

  async function createTag() {
    const value = newTag.trim();
    if (!value) return;
    if (tags.some((item) => item.toLowerCase() === value.toLowerCase())) {
      onMessage("This tag already exists");
      return;
    }
    await saveTags([...tags, value], "Tag added");
    setNewTag("");
  }

  async function removeTag(tag: string) {
    await saveTags(tags.filter((item) => item !== tag), `Removed tag ${tag}`);
  }

  async function copyTags() {
    await navigator.clipboard?.writeText(tags.join("\n")).catch(() => undefined);
    onMessage("Tag list copied");
  }

  return (
    <Card className="h-full min-h-0">
      <CardContent className="flex h-full min-h-0 flex-col p-4">
        <div className="mb-3 grid items-center gap-2 xl:grid-cols-[minmax(210px,280px)_112px_minmax(240px,1fr)_86px]">
          <div className="min-w-0">
            <TextInput onChange={setNewTag} placeholder="New tag (night, cloudy...)" value={newTag} />
          </div>
          <Button className="h-8 gap-2 whitespace-nowrap" disabled={isBusy || !newTag.trim()} onClick={() => void createTag()}>
            <Tags className="h-4 w-4" />
            Add Tag
          </Button>
          <label className="flex h-8 min-w-0 items-center gap-2 rounded-md border border-slate-200 px-3 text-slate-400">
            <Search className="h-4 w-4" />
            <input
              className="min-w-0 flex-1 bg-transparent text-[length:var(--font-sm)] outline-none placeholder:text-slate-400"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tags..."
              value={search}
            />
          </label>
          <Button variant="secondary" className="h-8 gap-2" onClick={() => void copyTags()}>
            <Copy className="h-4 w-4" />
            Copy
          </Button>
        </div>

        <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50/40 px-3 py-2 text-[length:var(--font-sm)] text-slate-600">
          Define scene tags here once, then select them per image inside Labeling. Good examples: <span className="font-medium">night</span>, <span className="font-medium">cloudy</span>, <span className="font-medium">indoor</span>, <span className="font-medium">backlight</span>.
        </div>

        {!tags.length ? (
          <EmptyState title="No tags defined" subtitle="Create dataset-level tags here, then use them per image in the labeling workspace." />
        ) : (
          <div className="min-h-0 overflow-auto rounded-lg border border-slate-200 p-3">
            <div className="flex flex-wrap gap-2">
              {filtered.length ? (
                filtered.map((tag) => (
                  <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2" key={tag}>
                    <span className="text-[length:var(--font-sm)] font-medium text-slate-800">{tag}</span>
                    <button
                      className="text-[length:var(--font-xs)] font-semibold text-slate-400 hover:text-rose-500"
                      disabled={isBusy}
                      onClick={() => void removeTag(tag)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                ))
              ) : (
                <div className="w-full rounded-lg border border-dashed border-slate-200 p-3 text-[length:var(--font-sm)] text-slate-500">
                  No tags match the current search.
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DatasetSplitsTab({
  dataset,
  onMessage,
  onSplitsChanged,
  splits,
}: {
  dataset: DatasetItem;
  onMessage: (message: string | null) => void;
  onSplitsChanged: (splits: DatasetSplitItem[]) => void;
  splits: DatasetSplitItem[];
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [splitName, setSplitName] = useState("");
  const [splitDescription, setSplitDescription] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const displaySplits = splits.length
    ? splits
    : splitRows(dataset.splits).map((row) => ({
        color: row.color === "bg-primary" ? "#2F6DF6" : row.color === "bg-violet-500" ? "#8B5CF6" : "#10B981",
        description: "",
        images: row.value,
        name: row.label,
        percent: row.percent,
        system: true,
        total: row.value,
        videos: 0,
      }));

  async function createSplit() {
    if (!splitName.trim()) return;
    setIsBusy(true);
    onMessage(null);
    try {
      const nextSplits = await addDatasetSplit(dataset.id, splitName.trim(), splitDescription.trim());
      onSplitsChanged(nextSplits);
      setSplitName("");
      setSplitDescription("");
      setShowAdd(false);
      onMessage("Split added");
    } catch (reason) {
      onMessage(reason instanceof Error ? reason.message : "Add split failed");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_1fr] gap-3">
      <div className="grid gap-3 md:grid-cols-4">
        <SplitMetric label="Total" value={dataset.stats.images} percent={100} color="bg-slate-500" />
        <SplitMetric label="Train" value={dataset.splits.train} percent={splitPercent(dataset.splits.train, dataset.splits)} color="bg-primary" />
        <SplitMetric label="Validation" value={dataset.splits.val} percent={splitPercent(dataset.splits.val, dataset.splits)} color="bg-violet-500" />
        <SplitMetric label="Test" value={dataset.splits.test} percent={splitPercent(dataset.splits.test, dataset.splits)} color="bg-emerald-500" />
      </div>
      <Card className="min-h-0">
        <CardContent className="grid h-full min-h-0 gap-4 p-4 lg:grid-cols-[240px_1fr]">
          <div className="flex items-center justify-center">
            <div className="relative h-[180px] w-[180px] rounded-full bg-[conic-gradient(#2f6df6_0_80%,#8b5cf6_80%_90%,#34d399_90%_100%)]">
              <div className="absolute inset-8 flex flex-col items-center justify-center rounded-full bg-white">
                <span className="ui-stat-value">{formatCount(dataset.stats.images)}</span>
                <span className="ui-label">Images</span>
              </div>
            </div>
          </div>
          <div className="min-h-0 overflow-auto">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="ui-section-title">Dataset Splits</h2>
                <p className="mt-1 text-[length:var(--font-xs)] text-slate-500">Upload policy can auto-balance new assets toward 80/10/10.</p>
              </div>
              <Button className="h-8 gap-2" onClick={() => setShowAdd((value) => !value)}>
                <Plus className="h-4 w-4" />
                Add Split
              </Button>
            </div>
            {showAdd && (
              <div className="mb-3 grid gap-2 rounded-lg border border-blue-100 bg-blue-50/40 p-3 md:grid-cols-[180px_1fr_auto]">
                <TextInput onChange={setSplitName} placeholder="Split name" value={splitName} />
                <TextInput onChange={setSplitDescription} placeholder="Description" value={splitDescription} />
                <Button className="h-8" disabled={isBusy || !splitName.trim()} onClick={() => void createSplit()}>
                  Create
                </Button>
              </div>
            )}
            <div className="rounded-lg border border-slate-200">
              <div className="grid grid-cols-[1fr_90px_90px_90px_1fr] border-b border-slate-200 bg-slate-50 px-3 py-2 text-[length:var(--font-xs)] font-semibold text-slate-500">
                <span>Split</span>
                <span>Images</span>
                <span>Videos</span>
                <span>Share</span>
                <span>Description</span>
              </div>
              {displaySplits.map((row) => (
                <div className="grid grid-cols-[1fr_90px_90px_90px_1fr] items-center border-b border-slate-100 px-3 py-3 text-[length:var(--font-sm)] last:border-b-0" key={row.name}>
                  <span className="flex items-center gap-2 font-medium">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                    {row.name}
                  </span>
                  <span>{formatCount(row.images)}</span>
                  <span>{formatCount(row.videos)}</span>
                  <span>{row.percent}%</span>
                  <span className="truncate text-slate-500">{row.description || "Dataset split"}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DatasetVersionsTab({
  dataset,
  events,
  onMessage,
  onOpenVersion,
  onVersionCreated,
  onVersionUpdated,
  versions,
}: {
  dataset: DatasetItem;
  events: DatasetEventItem[];
  onMessage: (message: string | null) => void;
  onOpenVersion: (datasetId: number) => void;
  onVersionCreated: (dataset: DatasetItem) => void;
  onVersionUpdated: (summary: DatasetVersionSummary) => void;
  versions: DatasetVersionSummary[];
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [versionName, setVersionName] = useState("");
  const [description, setDescription] = useState("");
  const [exportingId, setExportingId] = useState<number | null>(null);
  const [rebuildingId, setRebuildingId] = useState<number | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function createVersion() {
    setIsBusy(true);
    onMessage(null);
    try {
      const created = await createDatasetVersion(dataset.id, {
        description,
        version: versionName.trim() || undefined,
      });
      setShowCreate(false);
      setVersionName("");
      setDescription("");
      onVersionCreated(created);
      onMessage(`Version ${created.version} snapshot created`);
    } catch (reason) {
      onMessage(reason instanceof Error ? reason.message : "Create version failed");
    } finally {
      setIsBusy(false);
    }
  }

  async function rebuildManifest(versionDatasetId: number, versionLabel: string) {
    setRebuildingId(versionDatasetId);
    onMessage(null);
    try {
      const summary = await rebuildDatasetVersionManifest(versionDatasetId);
      onVersionUpdated(summary);
      onMessage(`Manifest refreshed for ${dataset.name} ${versionLabel}`);
    } catch (reason) {
      onMessage(reason instanceof Error ? reason.message : "Rebuild manifest failed");
    } finally {
      setRebuildingId(null);
    }
  }

  async function exportYolo(versionDatasetId: number, versionLabel: string) {
    setExportingId(versionDatasetId);
    onMessage(null);
    try {
      const summary = await exportDatasetVersionYolo(versionDatasetId);
      onMessage(
        `YOLO export ready for ${dataset.name} ${versionLabel}: ${summary.images_exported} images, ${summary.labels_exported} labels, ${summary.skipped_videos} videos skipped. Path: ${summary.export_path}`,
      );
    } catch (reason) {
      onMessage(reason instanceof Error ? reason.message : "YOLO export failed");
    } finally {
      setExportingId(null);
    }
  }

  return (
    <div className="grid h-full min-h-0 gap-3 lg:grid-rows-[minmax(0,1fr)_260px]">
      <Card className="min-h-0">
        <CardContent className="flex h-full min-h-0 flex-col p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="ui-section-title">Dataset Versions</h2>
              <p className="mt-1 text-[length:var(--font-xs)] text-slate-500">Create a new editable snapshot from the current dataset state.</p>
            </div>
            <Button className="h-8 gap-2" onClick={() => setShowCreate((value) => !value)}>
              <Plus className="h-4 w-4" />
              New Snapshot
            </Button>
          </div>
          {showCreate && (
            <div className="mb-3 grid gap-2 rounded-lg border border-blue-100 bg-blue-50/40 p-3 md:grid-cols-[160px_1fr_auto]">
              <TextInput onChange={setVersionName} placeholder="v1.1, optional" value={versionName} />
              <TextInput onChange={setDescription} placeholder="What will change in this version?" value={description} />
              <Button className="h-8" disabled={isBusy} onClick={() => void createVersion()}>
                Create Snapshot
              </Button>
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="grid gap-2 2xl:grid-cols-2">
              {versions.map((item) => {
                const isCurrent = item.dataset.id === dataset.id;
                const manifestHealthy = item.missing_files === 0;
                return (
                  <div className="rounded-xl border border-slate-200 bg-white p-3" key={item.dataset.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="ui-card-title truncate">
                            {item.dataset.name} {item.dataset.version}
                          </h3>
                          <Badge tone={isCurrent ? "success" : "default"}>{isCurrent ? "Open now" : item.dataset.status}</Badge>
                          <Badge tone={manifestHealthy ? "info" : "warning"}>{item.has_manifest ? "Frozen manifest" : "Live scan fallback"}</Badge>
                        </div>
                        <p className="mt-1 text-[length:var(--font-xs)] text-slate-500">
                          {item.dataset.task} · {item.dataset.format} · Updated {formatDateTime(item.dataset.updated_at)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button variant="secondary" className="h-7 gap-2 px-2.5" onClick={() => onOpenVersion(item.dataset.id)}>
                          <Image className="h-3.5 w-3.5" />
                          Open
                        </Button>
                        <Button
                          variant="secondary"
                          className="h-7 gap-2 px-2.5"
                          disabled={exportingId === item.dataset.id}
                          onClick={() => void exportYolo(item.dataset.id, item.dataset.version)}
                        >
                          <Save className="h-3.5 w-3.5" />
                          {exportingId === item.dataset.id ? "Exporting..." : "Export YOLO"}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-1.5 md:grid-cols-3 xl:grid-cols-6 2xl:grid-cols-3">
                      <VersionStatCell label="Tracked" value={formatCount(item.tracked_files)} />
                      <VersionStatCell label="Images" value={formatCount(item.image_files)} />
                      <VersionStatCell label="Videos" value={formatCount(item.video_files)} />
                      <VersionStatCell label="Labeled" value={formatCount(item.annotated_files)} />
                      <VersionStatCell label="Verified" value={formatCount(item.verified_files)} />
                      <VersionStatCell label="Sources" value={formatCount(item.source_count)} />
                    </div>

                    <div className="mt-2 rounded-lg border border-slate-200/80 bg-slate-50/70 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-[length:var(--font-sm)] font-semibold text-slate-900">
                            <span className={cn("h-2 w-2 rounded-full", manifestHealthy ? "bg-emerald-500" : "bg-amber-500")} />
                            {manifestHealthy ? "Manifest healthy" : `${formatCount(item.missing_files)} files missing`}
                          </div>
                          <div className="mt-0.5 truncate text-[length:var(--font-xs)] text-slate-500" title={item.manifest_path}>
                            {item.manifest_path}
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          className="h-7 shrink-0 gap-2 px-2.5"
                          disabled={rebuildingId === item.dataset.id}
                          onClick={() => void rebuildManifest(item.dataset.id, item.dataset.version)}
                        >
                          <RefreshCcw className="h-3.5 w-3.5" />
                          {rebuildingId === item.dataset.id ? "Refreshing..." : "Rebuild"}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-2">
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <div className="text-[length:var(--font-xs)] font-semibold uppercase tracking-[0.14em] text-slate-400">Sample Files</div>
                        <div className="text-[length:var(--font-xs)] text-slate-500">
                          {item.sample_files.length ? `${Math.min(item.sample_files.length, 3)} shown` : "No samples"}
                        </div>
                      </div>
                      {item.sample_files.length ? (
                        <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-2">
                          {item.sample_files.slice(0, 3).map((sample) => (
                            <div className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2" key={sample.path}>
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-primary">
                                {sample.kind === "video" ? <PlaySquare className="h-3.5 w-3.5" /> : <FileImage className="h-3.5 w-3.5" />}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[length:var(--font-xs)] font-semibold text-slate-900">{sample.name}</div>
                                <div className="mt-0.5 flex items-center gap-1.5 text-[length:var(--font-xs)] text-slate-500">
                                  <span>{sample.split}</span>
                                  <span>·</span>
                                  <span>{sample.kind}</span>
                                  {sample.annotated && <span>· labeled</span>}
                                  {sample.verified && <span>· verified</span>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-[length:var(--font-xs)] text-slate-500">
                          No tracked files in this snapshot yet.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="min-h-0">
        <CardContent className="flex h-full min-h-0 flex-col p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="ui-section-title">Version History</h2>
            <Badge>{events.length}</Badge>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {events.length ? (
              <div className="relative space-y-3 pl-5">
                <div className="absolute bottom-2 left-[7px] top-2 w-px bg-blue-100" />
                {events.map((event) => (
                  <div className="relative" key={event.id}>
                    <span className="absolute -left-[18px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-blue-50" />
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <GitBranch className="h-4 w-4 text-primary" />
                            <span className="text-[length:var(--font-sm)] font-semibold">{event.title}</span>
                            <Badge tone={eventTone(event.event_type)}>{event.event_type}</Badge>
                          </div>
                          <p className="mt-1 text-[length:var(--font-xs)] leading-5 text-slate-500">{event.description || "No description."}</p>
                        </div>
                        <div className="shrink-0 text-right text-[length:var(--font-xs)] text-slate-500">
                          <div>{formatDateTime(event.created_at)}</div>
                          <div>{event.author}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No history yet" subtitle="Imports, uploads, rescans, split and class changes will appear here." />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function eventTone(eventType: string): "default" | "success" | "danger" | "warning" | "info" {
  if (eventType === "media" || eventType === "import") return "success";
  if (eventType === "settings") return "warning";
  if (eventType === "scan" || eventType === "version") return "info";
  return "default";
}

function DatasetSettingsTab({
  dataset,
  onDatasetChanged,
  onDeleted,
  onMessage,
  onRescanned,
}: {
  dataset: DatasetItem;
  onDatasetChanged: (dataset: DatasetItem) => void;
  onDeleted: (datasetId: number) => void;
  onMessage: (message: string | null) => void;
  onRescanned: (dataset: DatasetItem) => void;
}) {
  const [name, setName] = useState(dataset.name);
  const [version, setVersion] = useState(dataset.version);
  const [topic, setTopic] = useState(dataset.topic);
  const [task, setTask] = useState(dataset.task);
  const [format, setFormat] = useState(dataset.format);
  const [status, setStatus] = useState(dataset.status);
  const [sourcePath, setSourcePath] = useState(dataset.source_path);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    setName(dataset.name);
    setVersion(dataset.version);
    setTopic(dataset.topic);
    setTask(dataset.task);
    setFormat(dataset.format);
    setStatus(dataset.status);
    setSourcePath(dataset.source_path);
  }, [dataset]);

  async function saveSettings() {
    setIsBusy(true);
    onMessage(null);
    try {
      const updated = await updateDataset(dataset.id, { format, name, source_path: sourcePath, status, task, topic, version });
      onDatasetChanged(updated);
      onMessage("Dataset settings saved");
    } catch (reason) {
      onMessage(reason instanceof Error ? reason.message : "Save failed");
    } finally {
      setIsBusy(false);
    }
  }

  async function rescan() {
    setIsBusy(true);
    onMessage(null);
    try {
      const updated = await rescanDataset(dataset.id);
      onRescanned(updated);
      onMessage("Dataset statistics updated");
    } catch (reason) {
      onMessage(reason instanceof Error ? reason.message : "Rescan failed");
    } finally {
      setIsBusy(false);
    }
  }

  async function openFolder() {
    onMessage(null);
    try {
      await openDatasetFolder(dataset.id);
    } catch (reason) {
      onMessage(reason instanceof Error ? reason.message : "Open folder failed");
    }
  }

  async function remove() {
    const confirmed = window.confirm(`Delete ${dataset.name} ${dataset.version}? Managed copied files and version workspace data will be removed from disk.`);
    if (!confirmed) return;
    setIsBusy(true);
    onMessage(null);
    try {
      await deleteDataset(dataset.id);
      onDeleted(dataset.id);
    } catch (reason) {
      onMessage(reason instanceof Error ? reason.message : "Delete failed");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Card className="h-full min-h-0">
      <CardContent className="flex h-full min-h-0 flex-col p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="ui-section-title">Dataset Settings</h2>
          <Button className="h-8 gap-2" disabled={isBusy || !name.trim()} onClick={() => void saveSettings()}>
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Name">
            <TextInput value={name} onChange={setName} placeholder="Dataset name" />
          </Field>
          <Field label="Version">
            <TextInput value={version} onChange={setVersion} placeholder="v1.0" />
          </Field>
          <Field label="Topic">
            <TextInput value={topic} onChange={setTopic} placeholder="Topic" />
          </Field>
          <Field label="Task">
            <SelectField value={task} onChange={setTask}>
              {taskOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </SelectField>
          </Field>
          <Field label="Format">
            <SelectField value={format} onChange={setFormat}>
              {formatOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </SelectField>
          </Field>
          <Field label="Status">
            <SelectField value={status} onChange={setStatus}>
              <option>Ready</option>
              <option>Draft</option>
              <option>Archived</option>
            </SelectField>
          </Field>
          <div className="md:col-span-2">
            <Field label="Source path">
              <TextInput value={sourcePath} onChange={setSourcePath} placeholder="Dataset media folder path" />
            </Field>
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <Button variant="secondary" className="h-8 gap-2" disabled={isBusy} onClick={() => void rescan()}>
            <RefreshCcw className="h-4 w-4" />
            Rescan
          </Button>
          <Button variant="secondary" className="h-8 gap-2" onClick={() => void openFolder()}>
            <Folder className="h-4 w-4" />
            Open Folder
          </Button>
          <Button variant="secondary" className="h-8 gap-2 text-rose-500 hover:bg-rose-50" disabled={isBusy} onClick={() => void remove()}>
            <Trash2 className="h-4 w-4" />
            Delete Registry
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DatasetContextPanel({ classes, dataset, media }: { classes: DatasetClassItem[]; dataset: DatasetItem; media: DatasetMediaItem[] }) {
  const topClasses = [...classes].sort((a, b) => b.instances - a.instances).slice(0, 5);
  return (
    <div className="min-h-0 space-y-3 overflow-auto pr-1">
      <Card>
        <CardContent className="p-4">
          <h2 className="ui-section-title mb-3">Dataset Information</h2>
          <div className="space-y-2 text-[length:var(--font-xs)]">
            <InfoRow label="Name" value={`${dataset.name} ${dataset.version}`} />
            <InfoRow label="Task" value={dataset.task} />
            <InfoRow label="Format" value={dataset.format} />
            <InfoRow label="Created" value={new Date(dataset.created_at).toLocaleDateString()} />
            <InfoRow label="Updated" value={formatDateTime(dataset.updated_at)} />
            <InfoRow label="Location" value={dataset.source_path || "not configured"} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h2 className="ui-section-title mb-3">Statistics</h2>
          <div className="grid grid-cols-[96px_1fr] items-center gap-3">
            <div className="relative h-[96px] rounded-full bg-[conic-gradient(#2f6df6_0_80%,#8b5cf6_80%_90%,#34d399_90%_100%)]">
              <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-white">
                <span className="ui-stat-value">{formatCount(dataset.stats.images)}</span>
                <span className="ui-meta text-slate-500">Images</span>
              </div>
            </div>
            <SplitRows splits={dataset.splits} compact />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[length:var(--font-xs)]">
            <MetricCell label="Media indexed" value={formatCount(media.length)} />
            <MetricCell label="Classes" value={formatCount(dataset.stats.classes)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="ui-section-title">Top Classes</h2>
            <Badge>{classes.length}</Badge>
          </div>
          {topClasses.length ? (
            <div className="space-y-2">
              {topClasses.map((item) => (
                <ClassBar classItem={item} compact key={item.id} max={topClasses[0]?.instances ?? 1} />
              ))}
            </div>
          ) : (
            <EmptyState compact title="No classes" subtitle="Class index is empty." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MediaCard({
  deleting,
  item,
  onDelete,
  onToggleSelect,
  selected,
}: {
  deleting: boolean;
  item: DatasetMediaItem;
  onDelete: () => void;
  onToggleSelect: () => void;
  selected: boolean;
}) {
  const canPreviewVideo = item.kind === "video" && supportsBrowserVideoPreview(item);

  return (
    <div className={cn("overflow-hidden rounded-lg border bg-white", selected ? "border-primary ring-1 ring-blue-200" : "border-slate-200")}>
      <div className="relative flex h-[88px] items-center justify-center bg-slate-100 text-primary">
        {item.preview_url && item.kind === "image" ? (
          <img alt={item.name} className="h-full w-full object-cover" src={item.preview_url} />
        ) : item.preview_url && canPreviewVideo ? (
          <>
            <video className="h-full w-full object-cover" muted playsInline preload="metadata" src={item.preview_url} />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/25 via-transparent to-transparent" />
            <PlaySquare className="pointer-events-none absolute bottom-2 left-2 h-4 w-4 text-white drop-shadow-sm" />
          </>
        ) : item.kind === "video" ? (
          <div className="flex flex-col items-center gap-1 text-slate-500">
            <PlaySquare className="h-9 w-9 opacity-70" />
            {!canPreviewVideo && <span className="text-[10px] font-semibold uppercase tracking-[0.08em]">No preview</span>}
          </div>
        ) : (
          <Image className="h-9 w-9 opacity-70" />
        )}
        <label className="absolute bottom-2 left-2 flex h-6 w-6 items-center justify-center rounded-md bg-white/90 shadow-sm">
          <input checked={selected} onChange={onToggleSelect} type="checkbox" />
        </label>
        <SplitBadge split={item.split} />
        <button
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-white/90 text-slate-500 shadow-sm hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50"
          disabled={deleting}
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          title="Delete media"
          type="button"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-2 p-1.5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[length:var(--font-xs)] font-semibold">{item.name}</div>
          <div className="mt-0.5 truncate text-[length:var(--font-xs)] text-slate-500">{mediaMeta(item)}</div>
        </div>
        <CheckCircle2 className={cn("h-4 w-4", item.annotated ? "text-emerald-500" : "text-slate-300")} />
      </div>
    </div>
  );
}

function MediaRow({
  deleting,
  item,
  onDelete,
  onToggleSelect,
  selected,
}: {
  deleting: boolean;
  item: DatasetMediaItem;
  onDelete: () => void;
  onToggleSelect: () => void;
  selected: boolean;
}) {
  const canPreviewVideo = item.kind === "video" && supportsBrowserVideoPreview(item);

  return (
    <div className={cn("grid grid-cols-[36px_56px_1fr_80px_100px_100px_40px] items-center gap-3 rounded-lg border bg-white p-2 text-[length:var(--font-sm)]", selected ? "border-primary ring-1 ring-blue-200" : "border-slate-200")}>
      <label className="flex justify-center">
        <input checked={selected} onChange={onToggleSelect} type="checkbox" />
      </label>
      <div className="flex h-10 w-12 items-center justify-center overflow-hidden rounded-md bg-slate-100 text-primary">
        {item.preview_url && item.kind === "image" ? (
          <img alt={item.name} className="h-full w-full object-cover" src={item.preview_url} />
        ) : item.preview_url && canPreviewVideo ? (
          <video className="h-full w-full object-cover" muted playsInline preload="metadata" src={item.preview_url} />
        ) : item.kind === "video" ? (
          <PlaySquare className="h-5 w-5" />
        ) : (
          <Image className="h-5 w-5" />
        )}
      </div>
      <div className="min-w-0">
        <div className="truncate font-semibold">{item.name}</div>
        <div className="truncate text-[length:var(--font-xs)] text-slate-500">{item.path}</div>
      </div>
      <span>{item.split}</span>
      <span>{mediaMeta(item)}</span>
      <Badge tone={item.annotated ? "success" : "default"}>{item.annotated ? "Annotated" : "Unlabeled"}</Badge>
      <button
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50"
        disabled={deleting}
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        title="Delete media"
        type="button"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function ProgressBar({ compact, label, value }: { compact?: boolean; label?: string; value: number }) {
  return (
    <div>
      {!compact && (
        <div className="mb-1 flex items-center justify-between text-[length:var(--font-xs)]">
          <span className="font-semibold text-slate-600">{label}</span>
          <span className="text-slate-500">{percentLabel(value)}</span>
        </div>
      )}
      <div className={cn("overflow-hidden rounded-full bg-slate-100", compact ? "h-1.5" : "h-2")}>
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
      </div>
      {compact && <div className="mt-1 text-[length:var(--font-xs)] text-slate-500">{percentLabel(value)}</div>}
    </div>
  );
}

function SplitBars({ splits }: { splits: DatasetItem["splits"] }) {
  const rows = splitRows(splits);
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
      {rows.map((row) => (
        <div className={row.color} key={row.label} style={{ width: `${row.percent}%` }} />
      ))}
    </div>
  );
}

function SplitRows({ compact, splits }: { compact?: boolean; splits: DatasetItem["splits"] }) {
  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      {splitRows(splits).map((row) => (
        <div className="grid grid-cols-[1fr_auto] gap-2 text-[length:var(--font-xs)]" key={row.label}>
          <span className="flex items-center gap-2 text-slate-600">
            <span className={cn("h-2 w-2 rounded-full", row.color)} />
            {row.label}
          </span>
          <span className="font-medium text-slate-500">
            {formatCount(row.value)} ({row.percent}%)
          </span>
        </div>
      ))}
    </div>
  );
}

function SplitMetric({ color, label, percent, value }: { color: string; label: string; percent: number; value: number }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="mb-2 flex items-center gap-2 text-[length:var(--font-xs)] font-semibold text-slate-600">
          <span className={cn("h-2.5 w-2.5 rounded-full", color)} />
          {label}
        </div>
        <div className="ui-stat-value">{formatCount(value)}</div>
        <div className="mt-2 text-[length:var(--font-xs)] text-slate-500">{percent}%</div>
      </CardContent>
    </Card>
  );
}

function SourceMetric({ detail, label, value }: { detail?: string; label: string; value: string }) {
  return (
    <Card className="min-w-0">
      <CardContent className="p-3">
        <div className="ui-label truncate">{label}</div>
        <div className="ui-stat-value mt-2">{value}</div>
        <div className="mt-2 truncate text-[length:var(--font-xs)] text-slate-500">{detail ?? "Tracked"}</div>
      </CardContent>
    </Card>
  );
}

function SourceActions({
  extracting,
  onExtract,
  onViewFrames,
  onViewVideos,
  source,
}: {
  extracting: boolean;
  onExtract: () => void;
  onViewFrames: () => void;
  onViewVideos: () => void;
  source: DatasetSourceItem;
}) {
  const hasVideo = source.videos > 0;
  const hasFramesOrImages = source.frames > 0 || source.images > 0;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {hasVideo && (
        <button
          className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 px-2 text-[length:var(--font-xs)] font-semibold text-slate-600 hover:bg-slate-50"
          onClick={onViewVideos}
          type="button"
        >
          <PlaySquare className="h-3.5 w-3.5" />
          Videos
        </button>
      )}
      {hasFramesOrImages && (
        <button
          className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 px-2 text-[length:var(--font-xs)] font-semibold text-slate-600 hover:bg-slate-50"
          onClick={onViewFrames}
          type="button"
        >
          <Image className="h-3.5 w-3.5" />
          {source.frames > 0 ? "Frames" : "Images"}
        </button>
      )}
      {hasVideo && source.frames === 0 && (
        <button
          className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2 text-[length:var(--font-xs)] font-semibold text-white hover:bg-[#245fe4] disabled:opacity-50"
          disabled={extracting}
          onClick={onExtract}
          type="button"
        >
          <Scissors className="h-3.5 w-3.5" />
          {extracting ? "Cutting" : "Extract"}
        </button>
      )}
    </div>
  );
}

function SourceSplitMini({ source }: { source: DatasetSourceItem }) {
  const total = source.train + source.val + source.test;
  if (!total) {
    return <span className="text-[length:var(--font-xs)] text-slate-400">No split</span>;
  }
  const train = Math.round((source.train / total) * 100);
  const val = Math.round((source.val / total) * 100);
  const test = Math.max(100 - train - val, 0);
  return (
    <div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="bg-primary" style={{ width: `${train}%` }} />
        <div className="bg-violet-500" style={{ width: `${val}%` }} />
        <div className="bg-emerald-500" style={{ width: `${test}%` }} />
      </div>
      <div className="mt-1 text-[length:var(--font-xs)] text-slate-400">
        {source.train}/{source.val}/{source.test}
      </div>
    </div>
  );
}

function sourcePrimarySplit(source: DatasetSourceItem) {
  const rows = [
    { label: "Train", value: source.train },
    { label: "Val", value: source.val },
    { label: "Test", value: source.test },
  ];
  const best = rows.sort((a, b) => b.value - a.value)[0];
  return best.value > 0 ? best.label : "All";
}

function sourceVideoSearch(source: DatasetSourceItem) {
  void source;
  return "";
}

function sourceFrameSearch(source: DatasetSourceItem) {
  void source;
  return "";
}

function ClassBar({ classItem, compact, max }: { classItem: DatasetClassItem; compact?: boolean; max: number }) {
  const width = max > 0 ? Math.max((classItem.instances / max) * 100, classItem.instances > 0 ? 4 : 0) : 0;
  return (
    <div className={compact ? "grid grid-cols-[1fr_60px] items-center gap-2" : "grid grid-cols-[88px_1fr_64px] items-center gap-2"}>
      <span className="truncate text-[length:var(--font-xs)] text-slate-600">{classItem.name}</span>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: classItem.color }} />
      </div>
      <span className="text-right text-[length:var(--font-xs)] text-slate-500">{formatCount(classItem.instances)}</span>
    </div>
  );
}

function DistributionBar({ color, max, value }: { color: string; max: number; value: number }) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 4 : 0) : 0;
  return (
    <div className="grid grid-cols-[1fr_46px] items-center gap-2">
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
      </div>
      <span className="text-right text-[length:var(--font-xs)] text-slate-500">{formatCount(value)}</span>
    </div>
  );
}

function Pagination({
  currentPage,
  onPageChange,
  pageCount,
  pageSize,
  total,
}: {
  currentPage: number;
  onPageChange: (page: number) => void;
  pageCount: number;
  pageSize: number;
  total: number;
}) {
  const start = total ? (currentPage - 1) * pageSize + 1 : 0;
  const end = Math.min(currentPage * pageSize, total);
  return (
    <div className="flex items-center justify-between text-[length:var(--font-xs)] text-slate-500">
      <span>
        Showing {start} to {end} of {formatCount(total)}
      </span>
      <div className="flex items-center gap-1">
        <button
          className="h-7 w-7 rounded-md border border-slate-200 text-slate-500 disabled:opacity-40"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          type="button"
        >
          {"<"}
        </button>
        <span className="rounded-md bg-primary px-3 py-1.5 font-semibold text-white">{currentPage}</span>
        <button
          className="h-7 w-7 rounded-md border border-slate-200 text-slate-500 disabled:opacity-40"
          disabled={currentPage >= pageCount}
          onClick={() => onPageChange(Math.min(currentPage + 1, pageCount))}
          type="button"
        >
          {">"}
        </button>
      </div>
    </div>
  );
}

function EmptyState({ compact, subtitle, title }: { compact?: boolean; subtitle: string; title: string }) {
  return (
    <div className={cn("flex h-full min-h-[160px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60", compact && "min-h-[96px]")}>
      <div className="max-w-[320px] px-4 text-center">
        <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-primary">
          <Database className="h-4 w-4" />
        </div>
        <div className="ui-card-title">{title}</div>
        <div className="mt-1 text-[length:var(--font-xs)] leading-5 text-slate-500">{subtitle}</div>
      </div>
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200/80 p-2">
      <div className="ui-card-title">{value}</div>
      <div className="ui-meta mt-1 text-slate-500">{label}</div>
    </div>
  );
}

function VersionStatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200/80 bg-slate-50/60 px-2.5 py-2">
      <div className="text-[length:var(--font-base)] font-semibold text-slate-900">{value}</div>
      <div className="mt-0.5 text-[length:var(--font-xs)] text-slate-500">{label}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2">
      <span className="font-semibold text-slate-600">{label}</span>
      <span className="min-w-0 max-w-[190px] truncate text-right text-slate-500" title={value}>
        {value}
      </span>
    </div>
  );
}

function SplitBadge({ split }: { split: string }) {
  const tone = split === "Val" ? "bg-violet-500" : split === "Test" ? "bg-emerald-500" : "bg-primary";
  return <span className={cn("absolute left-2 top-2 rounded-md px-2 py-0.5 text-[length:var(--font-xs)] font-semibold text-white", tone)}>{split}</span>;
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block">
      <span className="ui-label mb-1 block text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function FilterField({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block min-w-[132px]">
      <span className="mb-1 block text-[length:var(--font-xs)] font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function TextInput({ onChange, placeholder, value }: { onChange: (value: string) => void; placeholder: string; value: string }) {
  return (
    <input
      className="h-8 w-full rounded-md border border-slate-200 bg-white px-3 text-[length:var(--font-sm)] outline-none placeholder:text-slate-400 focus:border-primary"
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      value={value}
    />
  );
}

function SelectField({ children, onChange, value }: { children: ReactNode; onChange: (value: string) => void; value: string }) {
  return (
    <select
      className="h-8 w-full rounded-md border border-slate-200 bg-white px-3 text-[length:var(--font-sm)] outline-none focus:border-primary"
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      {children}
    </select>
  );
}

function SelectControl({
  children,
  icon,
  onChange,
  value,
}: {
  children: ReactNode;
  icon?: ReactNode;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 text-slate-500">
      {icon}
      <select className="min-w-[118px] bg-transparent text-[length:var(--font-sm)] outline-none" onChange={(event) => onChange(event.target.value)} value={value}>
        {children}
      </select>
      <ChevronDown className="h-3.5 w-3.5" />
    </label>
  );
}

function IconToggle({ active, children, onClick, title }: { active: boolean; children: ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      className={cn("flex w-9 items-center justify-center border-l border-slate-200 first:border-l-0", active ? "bg-blue-50 text-primary" : "text-slate-500 hover:bg-slate-50")}
      onClick={onClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

function splitRows(splits: DatasetItem["splits"]) {
  const total = splits.train + splits.val + splits.test;
  return [
    { color: "bg-primary", label: "Train", percent: splitPercent(splits.train, splits), value: splits.train },
    { color: "bg-violet-500", label: "Validation", percent: splitPercent(splits.val, splits), value: splits.val },
    { color: "bg-emerald-500", label: "Test", percent: splitPercent(splits.test, splits), value: splits.test },
  ].map((row) => ({ ...row, percent: total ? row.percent : 0 }));
}

function splitPercent(value: number, splits: DatasetItem["splits"]) {
  const total = splits.train + splits.val + splits.test;
  return total ? Math.round((value / total) * 100) : 0;
}

function isVideoUploadFile(file: File) {
  return file.type.startsWith("video/") || /\.(mp4|avi|mov|mkv|wmv|m4v|webm)$/i.test(file.name);
}

function fileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function inspectBrowserVideo(file: File): Promise<BrowserVideoPlan> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : null;
      URL.revokeObjectURL(url);
      resolve({ durationSeconds: duration });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ durationSeconds: null, error: "Could not read metadata" });
    };
    video.src = url;
  });
}

function estimateBrowserFrames(durationSeconds: number | null, assumedFps: number, frameInterval: number) {
  if (!durationSeconds || durationSeconds <= 0) return 0;
  return Math.ceil((durationSeconds * Math.max(assumedFps, 1)) / Math.max(frameInterval, 1));
}

function formatDuration(value: number | null | undefined) {
  if (!value || value <= 0) return "-";
  const totalSeconds = Math.round(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatBytes(value: number) {
  if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
}

function formatWarningSummary(warnings: string[]) {
  if (!warnings.length) return "";
  const uniqueWarnings = [...new Set(warnings)];
  const needsDecoder = uniqueWarnings.some((warning) => warning.includes("opencv-python-headless") || warning.includes("ffmpeg"));
  if (needsDecoder) {
    return ` ${uniqueWarnings.length} video${uniqueWarnings.length === 1 ? "" : "s"} could not be decoded. Install opencv-python-headless in the backend environment or add ffmpeg to PATH.`;
  }
  const visibleWarnings = uniqueWarnings.slice(0, 2).join(" ");
  return ` ${visibleWarnings}${uniqueWarnings.length > 2 ? ` +${uniqueWarnings.length - 2} more.` : ""}`;
}

function mediaMeta(item: DatasetMediaItem) {
  if (item.width && item.height) return `${item.width} x ${item.height}`;
  if (item.kind === "video") {
    const extension = item.name.split(".").pop()?.toLowerCase();
    return extension ? `video · ${extension}` : "video";
  }
  return "image";
}

function supportsBrowserVideoPreview(item: DatasetMediaItem) {
  return /\.(mp4|mov|m4v|webm)$/i.test(item.preview_url || item.path || item.name);
}
