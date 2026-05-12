import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Hand,
  Image as ImageIcon,
  Layers3,
  Minus,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Save,
  Search,
  SquareDashedMousePointer,
  Tags,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useDataset,
  useDatasetAnnotation,
  useDatasetClasses,
  useDatasetMedia,
  useDatasets,
  useDatasetTagCatalog,
  useSaveDatasetAnnotation,
} from "@/hooks";
import { cn } from "@/lib/utils";
import type { DatasetAnnotationShape, DatasetClassItem, DatasetItem, DatasetMediaItem } from "@/types/workspace";

type LabelingMode = "browser" | "editor";
type MediaFilter = "all" | "annotated" | "awaiting_review" | "unlabeled";
type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
type ToolMode = "draw" | "pan";
type Point2D = {
  x: number;
  y: number;
};
type ViewportBox = {
  height: number;
  left: number;
  top: number;
  width: number;
};
type DrawInteraction = {
  currentX: number;
  currentY: number;
  startX: number;
  startY: number;
  type: "draw";
};
type MoveInteraction = {
  anchorX: number;
  anchorY: number;
  indices: number[];
  initial: DatasetAnnotationShape[];
  type: "move";
};
type ResizeInteraction = {
  handle: ResizeHandle;
  index: number;
  initial: DatasetAnnotationShape;
  type: "resize";
};
type SelectInteraction = {
  currentX: number;
  currentY: number;
  startX: number;
  startY: number;
  type: "select";
};
type PanInteraction = {
  initialPan: Point2D;
  startClientX: number;
  startClientY: number;
  type: "pan";
};
type InteractionState = DrawInteraction | MoveInteraction | ResizeInteraction | SelectInteraction | PanInteraction;
type EditorSnapshot = {
  annotations: DatasetAnnotationShape[];
  imageTags: string[];
  verified: boolean;
};

export function LabelingPage({
  onSelectDataset,
  selectedDatasetId,
}: {
  onSelectDataset?: (datasetId: number, projectId: number | null) => void;
  selectedDatasetId?: number | null;
}) {
  const { data: datasets = [] } = useDatasets();
  const [mode, setMode] = useState<LabelingMode>("browser");
  const [activeDatasetId, setActiveDatasetId] = useState<number | null>(selectedDatasetId ?? null);

  useEffect(() => {
    if (!datasets.length) {
      setActiveDatasetId(null);
      setMode("browser");
      return;
    }
    if (activeDatasetId != null && datasets.some((item) => item.id === activeDatasetId)) {
      return;
    }
    if (selectedDatasetId != null && datasets.some((item) => item.id === selectedDatasetId)) {
      setActiveDatasetId(selectedDatasetId);
      return;
    }
    setActiveDatasetId(datasets[0].id);
  }, [activeDatasetId, datasets, selectedDatasetId]);

  const activeDataset = useMemo(
    () => datasets.find((item) => item.id === activeDatasetId) ?? null,
    [activeDatasetId, datasets],
  );

  function handleOpenDataset(dataset: DatasetItem) {
    setActiveDatasetId(dataset.id);
    onSelectDataset?.(dataset.id, dataset.project_id);
    setMode("editor");
  }

  if (mode === "editor" && activeDatasetId != null) {
    return <LabelingEditor datasetId={activeDatasetId} onBack={() => setMode("browser")} />;
  }

  return (
    <LabelingBrowser
      activeDatasetId={activeDataset?.id ?? selectedDatasetId ?? null}
      datasets={datasets}
      onOpenDataset={handleOpenDataset}
    />
  );
}

function LabelingBrowser({
  activeDatasetId,
  datasets,
  onOpenDataset,
}: {
  activeDatasetId: number | null;
  datasets: DatasetItem[];
  onOpenDataset: (dataset: DatasetItem) => void;
}) {
  const [search, setSearch] = useState("");
  const [taskFilter, setTaskFilter] = useState("All Tasks");
  const [statusFilter, setStatusFilter] = useState("All Status");

  const filteredDatasets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return datasets.filter((dataset) => {
      const matchesSearch =
        !query ||
        dataset.name.toLowerCase().includes(query) ||
        dataset.version.toLowerCase().includes(query) ||
        dataset.task.toLowerCase().includes(query);
      const matchesTask = taskFilter === "All Tasks" || dataset.task === taskFilter;
      const matchesStatus = statusFilter === "All Status" || dataset.status === statusFilter;
      return matchesSearch && matchesTask && matchesStatus;
    });
  }, [datasets, search, statusFilter, taskFilter]);

  const taskOptions = useMemo(() => ["All Tasks", ...uniqueStrings(datasets.map((item) => item.task))], [datasets]);
  const statusOptions = useMemo(() => ["All Status", ...uniqueStrings(datasets.map((item) => item.status))], [datasets]);

  return (
    <section className="ui-page h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden">
      <div>
        <h1 className="ui-title">Labeling</h1>
        <p className="ui-subtitle mt-1">Select a dataset to start or continue annotation</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_180px]">
        <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-400">
          <Search className="h-4 w-4" />
          <input
            className="w-full bg-transparent text-[length:var(--font-sm)] text-slate-700 outline-none placeholder:text-slate-400"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search datasets..."
            value={search}
          />
        </label>
        <select className="form-select h-10 rounded-xl" onChange={(event) => setTaskFilter(event.target.value)} value={taskFilter}>
          {taskOptions.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select className="form-select h-10 rounded-xl" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
          {statusOptions.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>

      <div className="min-h-0 overflow-auto pr-1">
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredDatasets.length ? (
            filteredDatasets.map((dataset) => (
              <DatasetBrowserCard
                dataset={dataset}
                key={`${dataset.id}-${dataset.version}`}
                selected={activeDatasetId === dataset.id}
                onOpen={() => onOpenDataset(dataset)}
              />
            ))
          ) : (
            <Card className="flex min-h-[220px] items-center justify-center">
              <CardContent className="space-y-2 text-center">
                <div className="ui-section-title">No datasets found</div>
                <div className="ui-subtitle">Try another search or create a dataset in the Datasets section first.</div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}

function DatasetBrowserCard({
  dataset,
  onOpen,
  selected,
}: {
  dataset: DatasetItem;
  onOpen: () => void;
  selected: boolean;
}) {
  const labeledPercent = dataset.stats.labeled_percent || percent(dataset.stats.labeled, dataset.stats.images);
  const verifiedPercent = dataset.stats.verified_percent || percent(dataset.stats.verified, dataset.stats.images);
  const awaitingReviewCount = Math.max(dataset.stats.labeled - dataset.stats.verified, 0);

  return (
    <Card
      className={cn(
        "overflow-hidden border-slate-200/80 transition-[border-color,box-shadow,transform] duration-150 hover:border-slate-300 hover:shadow-sm",
        selected && "border-blue-200 shadow-[0_0_0_1px_rgba(47,109,246,0.18)]",
      )}
    >
      <CardContent className="p-0">
        <div className="border-b border-slate-100 bg-[linear-gradient(135deg,rgba(47,109,246,0.06),rgba(255,255,255,0))] px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-primary">
                  <ImageIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-[length:var(--font-lg)] font-semibold text-slate-950">
                      {dataset.name} {dataset.version}
                    </h3>
                    <Badge tone={dataset.status === "Ready" ? "success" : "warning"}>{dataset.status}</Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[length:var(--font-xs)] text-slate-500">
                    <span>{dataset.task}</span>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <span>{dataset.format}</span>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <span>{formatCount(dataset.stats.images)} images</span>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-[length:var(--font-xs)] leading-5 text-slate-500">
                {dataset.stats.labeled
                  ? `${formatCount(dataset.stats.labeled)} images are already annotated and ready for review.`
                  : "No annotations yet. Start from the first image."}
              </p>
            </div>
            <StatusPill tone={awaitingReviewCount > 0 ? "amber" : labeledPercent > 0 ? "blue" : "slate"}>
              {awaitingReviewCount > 0
                ? `${formatCount(awaitingReviewCount)} awaiting review`
                : labeledPercent > 0
                  ? `${labeledPercent.toFixed(1)}% labeled`
                  : "New dataset"}
            </StatusPill>
          </div>
        </div>

        <div className="grid gap-3 p-3 xl:grid-cols-[minmax(0,1fr)_168px]">
          <div className="min-w-0">
            <div className="grid gap-2 sm:grid-cols-2">
              <DatasetCardMetric icon={ImageIcon} label="Images" value={formatCount(dataset.stats.images)} />
              <DatasetCardMetric icon={Layers3} label="Classes" value={formatCount(dataset.stats.classes)} />
              <DatasetCardMetric icon={SquareDashedMousePointer} label="Annotated" value={formatCount(dataset.stats.labeled)} />
              <DatasetCardMetric icon={CheckCircle2} label="Verified" value={formatCount(dataset.stats.verified)} />
            </div>

            <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-[length:var(--font-sm)] font-semibold text-slate-900">Progress</div>
                <div className="text-[length:var(--font-xs)] text-slate-500">
                  {formatCount(dataset.stats.labeled)} labeled / {formatCount(dataset.stats.verified)} verified
                </div>
              </div>
              <div className="space-y-2">
                <ProgressBlock label="Annotation" value={`${labeledPercent.toFixed(1)}%`} width={labeledPercent} />
                <ProgressBlock label="Review" value={`${verifiedPercent.toFixed(1)}%`} width={verifiedPercent} tone="emerald" />
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(241,245,249,0.82))] p-3">
            <div className="grid gap-2 text-[length:var(--font-sm)]">
              <InfoMetric label="Task" value={dataset.task} />
              <InfoMetric label="Format" value={dataset.format} />
              <InfoMetric label="Version" value={dataset.version} />
              <InfoMetric label="Queue" value={formatCount(awaitingReviewCount)} />
            </div>
            <Button className="h-10 gap-2 shadow-[0_10px_24px_rgba(47,109,246,0.16)]" onClick={onOpen}>
              <Play className="h-4 w-4" />
              {dataset.stats.labeled ? "Continue" : "Start"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LabelingEditor({ datasetId, onBack }: { datasetId: number; onBack: () => void }) {
  const { data: dataset = null } = useDataset(datasetId);
  const { data: media = [], isLoading: mediaLoading } = useDatasetMedia(datasetId);
  const { data: classes = [] } = useDatasetClasses(datasetId);
  const { data: tagCatalog = { tags: [] } } = useDatasetTagCatalog(datasetId);
  const saveAnnotation = useSaveDatasetAnnotation(datasetId, { notify: false });

  const imageItems = useMemo(() => media.filter((item) => item.kind === "image"), [media]);
  const classEntries = useMemo(
    () =>
      classes.map((item, index) => ({
        ...item,
        classId: Number.isFinite(Number(item.id)) ? Number(item.id) : index,
      })),
    [classes],
  );

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MediaFilter>("all");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedAnnotationIndex, setSelectedAnnotationIndex] = useState<number | null>(null);
  const [selectedAnnotationIndices, setSelectedAnnotationIndices] = useState<number[]>([]);
  const [activeTool, setActiveTool] = useState<ToolMode>("draw");
  const [navigationMode, setNavigationMode] = useState<"all" | "unlabeled" | "review">("all");

  const annotationQuery = useDatasetAnnotation(datasetId, selectedPath);
  const [annotations, setAnnotations] = useState<DatasetAnnotationShape[]>([]);
  const [verified, setVerified] = useState(false);
  const [imageTags, setImageTags] = useState<string[]>([]);
  const [loadedKey, setLoadedKey] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point2D>({ x: 0, y: 0 });
  const [historyPast, setHistoryPast] = useState<EditorSnapshot[]>([]);
  const [historyFuture, setHistoryFuture] = useState<EditorSnapshot[]>([]);
  const [lastSaveFailed, setLastSaveFailed] = useState(false);
  const [clipboardCount, setClipboardCount] = useState(0);

  const annotationsRef = useRef<DatasetAnnotationShape[]>([]);
  const verifiedRef = useRef(false);
  const imageTagsRef = useRef<string[]>([]);
  const selectedPathRef = useRef<string | null>(null);
  const selectedAnnotationIndicesRef = useRef<number[]>([]);
  const interactionStartSnapshotRef = useRef<EditorSnapshot | null>(null);
  const savePromiseRef = useRef<Promise<unknown> | null>(null);
  const clipboardRef = useRef<DatasetAnnotationShape[] | null>(null);

  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  useEffect(() => {
    verifiedRef.current = verified;
  }, [verified]);

  useEffect(() => {
    imageTagsRef.current = imageTags;
  }, [imageTags]);

  useEffect(() => {
    selectedPathRef.current = selectedPath;
  }, [selectedPath]);

  useEffect(() => {
    selectedAnnotationIndicesRef.current = selectedAnnotationIndices;
  }, [selectedAnnotationIndices]);

  useEffect(() => {
    const nextAnnotations = annotationQuery.data?.annotations ?? [];
    const nextVerified = Boolean(annotationQuery.data?.verified);
    const nextTags = sortStrings(annotationQuery.data?.tags ?? []);
    setAnnotations(nextAnnotations);
    setVerified(nextVerified);
    setImageTags(nextTags);
    setLoadedKey(annotationStateKey(nextAnnotations, nextVerified, nextTags));
    setSelectedAnnotationIndex(null);
    setSelectedAnnotationIndices([]);
    setHistoryPast([]);
    setHistoryFuture([]);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setLastSaveFailed(false);
  }, [annotationQuery.data?.annotations, annotationQuery.data?.path, annotationQuery.data?.tags, annotationQuery.data?.verified]);

  useEffect(() => {
    if (selectedPath) return;
    setAnnotations([]);
    setVerified(false);
    setImageTags([]);
    setLoadedKey("");
    setSelectedAnnotationIndex(null);
    setSelectedAnnotationIndices([]);
    setHistoryPast([]);
    setHistoryFuture([]);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [selectedPath]);

  const dirty = useMemo(
    () => annotationStateKey(annotations, verified, imageTags) !== loadedKey,
    [annotations, imageTags, loadedKey, verified],
  );

  const displayItems = useMemo(
    () =>
      imageItems.map((item) =>
        item.path === selectedPath
          ? {
              ...item,
              annotated: annotations.length > 0,
              tags: imageTags,
              verified,
            }
          : item,
      ),
    [annotations.length, imageItems, imageTags, selectedPath, verified],
  );

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return displayItems.filter((item) => {
      const matchesSearch = !query || item.name.toLowerCase().includes(query);
      if (!matchesSearch) return false;
      if (filter === "unlabeled") return !item.annotated;
      if (filter === "annotated") return item.annotated;
      if (filter === "awaiting_review") return item.annotated && !item.verified;
      return true;
    });
  }, [displayItems, filter, search]);

  useEffect(() => {
    if (!filteredItems.length) {
      if (!dirty) {
        setSelectedPath(null);
      }
      return;
    }
    if (!selectedPath) {
      setSelectedPath(filteredItems[0].path);
      return;
    }
    if (!dirty && !filteredItems.some((item) => item.path === selectedPath)) {
      setSelectedPath(filteredItems[0].path);
    }
  }, [dirty, filteredItems, selectedPath]);

  useEffect(() => {
    if (selectedClassId == null && classEntries.length) {
      setSelectedClassId(classEntries[0].classId);
    }
  }, [classEntries, selectedClassId]);

  const selectedMedia = useMemo(
    () => displayItems.find((item) => item.path === selectedPath) ?? null,
    [displayItems, selectedPath],
  );
  const navigationItems = useMemo(() => {
    if (navigationMode === "unlabeled") {
      return displayItems.filter((item) => !item.annotated);
    }
    if (navigationMode === "review") {
      return displayItems.filter((item) => item.annotated && !item.verified);
    }
    return displayItems;
  }, [displayItems, navigationMode]);

  useEffect(() => {
    if (!navigationItems.length) return;
    if (!selectedPath) return;
    if (dirty) return;
    if (navigationItems.some((item) => item.path === selectedPath)) return;
    setSelectedPath(navigationItems[0].path);
  }, [dirty, navigationItems, selectedPath]);

  const currentIndex = useMemo(
    () => filteredItems.findIndex((item) => item.path === selectedMedia?.path),
    [filteredItems, selectedMedia?.path],
  );
  const absoluteIndex = useMemo(
    () => displayItems.findIndex((item) => item.path === selectedMedia?.path),
    [displayItems, selectedMedia?.path],
  );
  const navigationIndex = useMemo(
    () => navigationItems.findIndex((item) => item.path === selectedMedia?.path),
    [navigationItems, selectedMedia?.path],
  );

  const selectedClass = classEntries.find((item) => item.classId === selectedClassId) ?? null;
  const selectedAnnotation = selectedAnnotationIndex != null ? annotations[selectedAnnotationIndex] ?? null : null;
  const selectedAnnotations = useMemo(
    () => normalizeAnnotationIndices(selectedAnnotationIndices, annotations.length).map((index) => annotations[index]).filter(Boolean),
    [annotations, selectedAnnotationIndices],
  );
  const selectedAnnotationCount = selectedAnnotations.length;
  const annotatedCount = displayItems.filter((item) => item.annotated).length;
  const verifiedCount = displayItems.filter((item) => item.verified).length;
  const awaitingReviewCount = displayItems.filter((item) => item.annotated && !item.verified).length;
  const unlabeledCount = Math.max(displayItems.length - annotatedCount, 0);
  const displayIndexByPath = useMemo(
    () => new Map(displayItems.map((item, index) => [item.path, index + 1])),
    [displayItems],
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [viewport, setViewport] = useState<ViewportBox | null>(null);
  const [interaction, setInteraction] = useState<InteractionState | null>(null);

  function buildSnapshot(
    nextAnnotations = annotationsRef.current,
    nextVerified = verifiedRef.current,
    nextTags = imageTagsRef.current,
  ): EditorSnapshot {
    return {
      annotations: cloneAnnotations(nextAnnotations),
      imageTags: sortStrings(nextTags),
      verified: nextVerified,
    };
  }

  function applySnapshot(snapshot: EditorSnapshot, selectedIndex?: number | null) {
    const nextAnnotations = cloneAnnotations(snapshot.annotations);
    setAnnotations(nextAnnotations);
    setVerified(snapshot.verified);
    setImageTags(sortStrings(snapshot.imageTags));
    if (selectedIndex !== undefined) {
      const normalized = selectedIndex == null ? [] : [selectedIndex];
      setSelectedAnnotationIndex(selectedIndex);
      setSelectedAnnotationIndices(normalized);
    } else {
      const preserved = normalizeAnnotationIndices(selectedAnnotationIndicesRef.current, nextAnnotations.length);
      setSelectedAnnotationIndices(preserved);
      setSelectedAnnotationIndex(preserved.length ? preserved[preserved.length - 1] : null);
    }
    setLastSaveFailed(false);
  }

  function commitSnapshot(snapshot: EditorSnapshot, selectedIndex?: number | null) {
    const current = buildSnapshot();
    if (annotationStateKey(current.annotations, current.verified, current.imageTags) === annotationStateKey(snapshot.annotations, snapshot.verified, snapshot.imageTags)) {
      return false;
    }
    setHistoryPast((past) => [...past.slice(-49), current]);
    setHistoryFuture([]);
    applySnapshot(snapshot, selectedIndex);
    return true;
  }

  function commitAnnotations(nextAnnotations: DatasetAnnotationShape[], selectedIndex?: number | null) {
    return commitSnapshot(buildSnapshot(nextAnnotations, verifiedRef.current, imageTagsRef.current), selectedIndex);
  }

  function commitVerification(nextVerified: boolean) {
    return commitSnapshot(buildSnapshot(annotationsRef.current, nextVerified, imageTagsRef.current));
  }

  function commitTags(nextTags: string[]) {
    return commitSnapshot(buildSnapshot(annotationsRef.current, verifiedRef.current, nextTags));
  }

  function rememberInteractionStart() {
    interactionStartSnapshotRef.current = buildSnapshot();
  }

  function finalizeInteraction(nextAnnotations: DatasetAnnotationShape[], selectedIndex?: number | null) {
    const start = interactionStartSnapshotRef.current;
    const nextSnapshot = buildSnapshot(nextAnnotations, verifiedRef.current, imageTagsRef.current);
    if (
      start &&
      annotationStateKey(start.annotations, start.verified, start.imageTags) !==
        annotationStateKey(nextSnapshot.annotations, nextSnapshot.verified, nextSnapshot.imageTags)
    ) {
      setHistoryPast((past) => [...past.slice(-49), start]);
      setHistoryFuture([]);
    }
    applySnapshot(nextSnapshot, selectedIndex);
    interactionStartSnapshotRef.current = null;
  }

  function undo() {
    if (!historyPast.length) return;
    const previous = historyPast[historyPast.length - 1];
    const current = buildSnapshot();
    setHistoryPast((past) => past.slice(0, -1));
    setHistoryFuture((future) => [current, ...future.slice(0, 49)]);
    applySnapshot(previous);
  }

  function redo() {
    if (!historyFuture.length) return;
    const next = historyFuture[0];
    const current = buildSnapshot();
    setHistoryFuture((future) => future.slice(1));
    setHistoryPast((past) => [...past.slice(-49), current]);
    applySnapshot(next);
  }

  function fitCanvas() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function setAnnotationSelection(index: number, options?: { range?: boolean; toggle?: boolean }) {
    const total = annotationsRef.current.length;
    if (!total) {
      setSelectedAnnotationIndex(null);
      setSelectedAnnotationIndices([]);
      return;
    }

    if (options?.range && selectedAnnotationIndex != null) {
      const start = Math.min(selectedAnnotationIndex, index);
      const end = Math.max(selectedAnnotationIndex, index);
      const range = Array.from({ length: end - start + 1 }, (_, offset) => start + offset);
      setSelectedAnnotationIndex(index);
      setSelectedAnnotationIndices(range);
      return;
    }

    if (options?.toggle) {
      const current = normalizeAnnotationIndices(selectedAnnotationIndicesRef.current, total);
      const exists = current.includes(index);
      const next = exists ? current.filter((item) => item !== index) : [...current, index];
      const normalized = normalizeAnnotationIndices(next, total);
      setSelectedAnnotationIndices(normalized);
      setSelectedAnnotationIndex(normalized.length ? (exists && selectedAnnotationIndex === index ? normalized[normalized.length - 1] : index) : null);
      return;
    }

    setSelectedAnnotationIndex(index);
    setSelectedAnnotationIndices([index]);
  }

  function clearAnnotationSelection() {
    setSelectedAnnotationIndex(null);
    setSelectedAnnotationIndices([]);
  }

  function updateZoom(nextZoom: number, focus?: { clientX: number; clientY: number }) {
    if (!viewport || !containerRef.current) {
      setZoom(clamp(nextZoom, 1, 4));
      return;
    }

    const boundedZoom = clamp(nextZoom, 1, 4);
    if (boundedZoom === zoom) return;

    if (!focus) {
      setZoom(boundedZoom);
      setPan((current) => clampPan(current, viewport, boundedZoom));
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const stageLeft = viewport.left + pan.x;
    const stageTop = viewport.top + pan.y;
    const relativeX = clamp01((focus.clientX - rect.left - stageLeft) / (viewport.width * zoom));
    const relativeY = clamp01((focus.clientY - rect.top - stageTop) / (viewport.height * zoom));
    const nextPan = clampPan(
      {
        x: focus.clientX - rect.left - viewport.left - relativeX * viewport.width * boundedZoom,
        y: focus.clientY - rect.top - viewport.top - relativeY * viewport.height * boundedZoom,
      },
      viewport,
      boundedZoom,
    );
    setZoom(boundedZoom);
    setPan(nextPan);
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (!selectedMedia?.preview_url || !viewport) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.12 : 0.12;
    updateZoom(zoom + delta, { clientX: event.clientX, clientY: event.clientY });
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const refresh = () => {
      const mediaWidth = selectedMedia?.width ?? imageRef.current?.naturalWidth ?? 0;
      const mediaHeight = selectedMedia?.height ?? imageRef.current?.naturalHeight ?? 0;
      if (!container || !mediaWidth || !mediaHeight) {
        setViewport(null);
        return;
      }
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const scale = Math.min(containerWidth / mediaWidth, containerHeight / mediaHeight);
      const width = mediaWidth * scale;
      const height = mediaHeight * scale;
      setViewport({
        height,
        left: (containerWidth - width) / 2,
        top: (containerHeight - height) / 2,
        width,
      });
    };

    refresh();
    const observer = new ResizeObserver(refresh);
    observer.observe(container);
    if (imageRef.current) {
      observer.observe(imageRef.current);
    }
    return () => observer.disconnect();
  }, [selectedMedia?.height, selectedMedia?.path, selectedMedia?.width]);

  const draftRect = interaction?.type === "draw" ? interaction : null;
  const selectionRect = interaction?.type === "select" ? interaction : null;

  async function saveCurrent(overrides?: Partial<{ annotations: DatasetAnnotationShape[]; verified: boolean; tags: string[] }>) {
    const path = selectedPathRef.current;
    if (!path) return null;
    if (savePromiseRef.current) {
      return savePromiseRef.current;
    }
    const nextAnnotations = cloneAnnotations(overrides?.annotations ?? annotationsRef.current);
    const nextVerified = overrides?.verified ?? verifiedRef.current;
    const nextTags = sortStrings(overrides?.tags ?? imageTagsRef.current);
    const request = saveAnnotation
      .mutateAsync({
        path,
        annotations: nextAnnotations,
        tags: nextTags,
        verified: nextVerified,
      })
      .then((response) => {
        const nextKey = annotationStateKey(response.annotations, response.verified, response.tags);
        setAnnotations(response.annotations);
        setVerified(response.verified);
        setImageTags(sortStrings(response.tags));
        setLoadedKey(nextKey);
        setLastSaveFailed(false);
        return response;
      })
      .catch((error) => {
        setLastSaveFailed(true);
        throw error;
      })
      .finally(() => {
        savePromiseRef.current = null;
      });
    savePromiseRef.current = request;
    return request;
  }

  async function saveAndStay() {
    if (!dirty) return;
    await saveCurrent();
  }

  async function selectImage(path: string) {
    if (path === selectedPath) return;
    if (dirty) {
      const saved = await saveCurrent();
      if (!saved) return;
    }
    setSelectedPath(path);
  }

  async function navigateImage(step: number) {
    if (!navigationItems.length || navigationIndex < 0) return;
    const nextIndex = clamp(navigationIndex + step, 0, navigationItems.length - 1);
    if (nextIndex === navigationIndex) return;
    await selectImage(navigationItems[nextIndex].path);
  }

  async function jumpToNextInQueue(predicate: (item: DatasetMediaItem) => boolean) {
    if (!displayItems.length) return;
    const startIndex = absoluteIndex >= 0 ? absoluteIndex + 1 : 0;
    const ordered = [...displayItems.slice(startIndex), ...displayItems.slice(0, startIndex)];
    const nextItem = ordered.find(predicate);
    if (!nextItem) return;
    await selectImage(nextItem.path);
  }

  async function saveAndNavigate(step: number) {
    if (!selectedMedia) return;
    const saved = await saveCurrent();
    if (!saved) return;
    const nextIndex = clamp(navigationIndex + step, 0, navigationItems.length - 1);
    if (nextIndex !== navigationIndex) {
      setSelectedPath(navigationItems[nextIndex].path);
    }
  }

  function toggleVerified() {
    commitVerification(!verifiedRef.current);
  }

  async function handleBack() {
    if (dirty) {
      await saveCurrent();
    }
    onBack();
  }

  function beginPan(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    setInteraction({
      initialPan: pan,
      startClientX: event.clientX,
      startClientY: event.clientY,
      type: "pan",
    });
  }

  function beginCanvasInteraction(event: React.MouseEvent<HTMLDivElement>) {
    if (!viewport) return;
    if (event.button === 1 || activeTool === "pan") {
      beginPan(event);
      return;
    }
    if (event.button !== 0) return;
    const point = clientPointToNormalized(event.clientX, event.clientY, containerRef.current, viewport, zoom, pan, false);
    if (!point || !isPointInside(point)) return;
    if (event.shiftKey) {
      setInteraction({
        currentX: point.x,
        currentY: point.y,
        startX: point.x,
        startY: point.y,
        type: "select",
      });
      return;
    }
    if (selectedClassId == null) return;
    rememberInteractionStart();
    clearAnnotationSelection();
    setInteraction({
      currentX: point.x,
      currentY: point.y,
      startX: point.x,
      startY: point.y,
      type: "draw",
    });
  }

  function beginMove(index: number, event: React.MouseEvent<HTMLDivElement>) {
    if (!viewport) return;
    if (event.button === 1 || activeTool === "pan") {
      event.stopPropagation();
      beginPan(event);
      return;
    }
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey) {
      event.stopPropagation();
      setAnnotationSelection(index, { range: event.shiftKey, toggle: event.metaKey || event.ctrlKey });
      return;
    }
    const point = clientPointToNormalized(event.clientX, event.clientY, containerRef.current, viewport, zoom, pan, true);
    const initial = annotations[index];
    if (!point || !initial) return;
    event.stopPropagation();
    rememberInteractionStart();
    const selectedIndices = normalizeAnnotationIndices(
      selectedAnnotationIndicesRef.current.length && selectedAnnotationIndicesRef.current.includes(index)
        ? selectedAnnotationIndicesRef.current
        : [index],
      annotationsRef.current.length,
    );
    setSelectedAnnotationIndices(selectedIndices);
    setSelectedAnnotationIndex(selectedIndices[selectedIndices.length - 1] ?? index);
    setInteraction({
      anchorX: point.x,
      anchorY: point.y,
      indices: selectedIndices,
      initial: selectedIndices.map((selectedIndex) => ({ ...annotations[selectedIndex] })),
      type: "move",
    });
  }

  function beginResize(index: number, handle: ResizeHandle, event: React.MouseEvent<HTMLDivElement>) {
    if (!viewport) return;
    if (event.button === 1 || activeTool === "pan") {
      event.stopPropagation();
      beginPan(event);
      return;
    }
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey) {
      event.stopPropagation();
      setAnnotationSelection(index, { range: event.shiftKey, toggle: event.metaKey || event.ctrlKey });
      return;
    }
    const initial = annotations[index];
    if (!initial) return;
    event.stopPropagation();
    rememberInteractionStart();
    setAnnotationSelection(index);
    setInteraction({
      handle,
      index,
      initial,
      type: "resize",
    });
  }

  function changeSelectedAnnotationClass(classId: number) {
    const targetIndices = normalizeAnnotationIndices(
      selectedAnnotationIndicesRef.current.length ? selectedAnnotationIndicesRef.current : selectedAnnotationIndex != null ? [selectedAnnotationIndex] : [],
      annotationsRef.current.length,
    );
    if (!targetIndices.length) return;
    const nextAnnotations = annotationsRef.current.map((item, index) =>
      targetIndices.includes(index) ? { ...item, class_id: classId } : item,
    );
    commitAnnotations(nextAnnotations, targetIndices[targetIndices.length - 1] ?? null);
    setSelectedClassId(classId);
  }

  function duplicateSelectedAnnotation() {
    const sourceIndices = normalizeAnnotationIndices(
      selectedAnnotationIndicesRef.current.length ? selectedAnnotationIndicesRef.current : selectedAnnotationIndex != null ? [selectedAnnotationIndex] : [],
      annotationsRef.current.length,
    );
    if (!sourceIndices.length) return;
    const baseAnnotations = cloneAnnotations(annotationsRef.current);
    const duplicated = sourceIndices
      .map((index) => annotationsRef.current[index])
      .filter(Boolean)
      .map((source, offset) => ({
        ...source,
        x_center: round6(clamp(source.x_center + 0.02 * (offset + 1), source.width / 2, 1 - source.width / 2)),
        y_center: round6(clamp(source.y_center + 0.02 * (offset + 1), source.height / 2, 1 - source.height / 2)),
      }));
    const nextAnnotations = [...baseAnnotations, ...duplicated];
    const appendedIndices = duplicated.map((_, offset) => baseAnnotations.length + offset);
    commitAnnotations(nextAnnotations, appendedIndices[appendedIndices.length - 1] ?? null);
    setSelectedAnnotationIndices(appendedIndices);
  }

  function nudgeSelectedAnnotation(deltaX: number, deltaY: number) {
    const targetIndices = normalizeAnnotationIndices(
      selectedAnnotationIndicesRef.current.length ? selectedAnnotationIndicesRef.current : selectedAnnotationIndex != null ? [selectedAnnotationIndex] : [],
      annotationsRef.current.length,
    );
    if (!targetIndices.length) return;
    const nextAnnotations = cloneAnnotations(annotationsRef.current);
    for (const index of targetIndices) {
      const source = annotationsRef.current[index];
      if (!source) continue;
      const halfWidth = source.width / 2;
      const halfHeight = source.height / 2;
      nextAnnotations[index] = {
        ...source,
        x_center: round6(clamp(source.x_center + deltaX, halfWidth, 1 - halfWidth)),
        y_center: round6(clamp(source.y_center + deltaY, halfHeight, 1 - halfHeight)),
      };
    }
    commitAnnotations(nextAnnotations, targetIndices[targetIndices.length - 1] ?? null);
  }

  function deleteSelectedAnnotation() {
    const targetIndices = normalizeAnnotationIndices(
      selectedAnnotationIndicesRef.current.length ? selectedAnnotationIndicesRef.current : selectedAnnotationIndex != null ? [selectedAnnotationIndex] : [],
      annotationsRef.current.length,
    );
    if (!targetIndices.length) return;
    const targetSet = new Set(targetIndices);
    const nextAnnotations = annotationsRef.current.filter((_, index) => !targetSet.has(index));
    const nextSelected = nextAnnotations.length ? clamp(targetIndices[0], 0, nextAnnotations.length - 1) : null;
    commitAnnotations(nextAnnotations, nextSelected);
  }

  function copySelectedAnnotations() {
    const sourceIndices = normalizeAnnotationIndices(
      selectedAnnotationIndicesRef.current.length ? selectedAnnotationIndicesRef.current : selectedAnnotationIndex != null ? [selectedAnnotationIndex] : [],
      annotationsRef.current.length,
    );
    if (!sourceIndices.length) return;
    clipboardRef.current = sourceIndices.map((index) => ({ ...annotationsRef.current[index] }));
    setClipboardCount(clipboardRef.current.length);
  }

  function pasteAnnotations() {
    if (!clipboardRef.current?.length) return;
    const baseAnnotations = cloneAnnotations(annotationsRef.current);
    const appended = clipboardRef.current.map((source, offset) => ({
      ...source,
      x_center: round6(clamp(source.x_center + 0.02 * (offset + 1), source.width / 2, 1 - source.width / 2)),
      y_center: round6(clamp(source.y_center + 0.02 * (offset + 1), source.height / 2, 1 - source.height / 2)),
    }));
    const nextAnnotations = [...baseAnnotations, ...appended];
    const appendedIndices = appended.map((_, offset) => baseAnnotations.length + offset);
    commitAnnotations(nextAnnotations, appendedIndices[appendedIndices.length - 1] ?? null);
    setSelectedAnnotationIndices(appendedIndices);
  }

  function toggleImageTag(tag: string) {
    const nextTags = imageTagsRef.current.includes(tag)
      ? imageTagsRef.current.filter((item) => item !== tag)
      : sortStrings([...imageTagsRef.current, tag]);
    commitTags(nextTags);
  }

  async function promoteAutosave() {
    if (!selectedMedia || !dirty || interaction || saveAnnotation.isPending) return;
    await saveCurrent();
  }

  useEffect(() => {
    if (!interaction || !viewport) return;

    const handleMove = (event: MouseEvent) => {
      if (interaction.type === "pan") {
        setPan(
          clampPan(
            {
              x: interaction.initialPan.x + (event.clientX - interaction.startClientX),
              y: interaction.initialPan.y + (event.clientY - interaction.startClientY),
            },
            viewport,
            zoom,
          ),
        );
        return;
      }

      const point = clientPointToNormalized(event.clientX, event.clientY, containerRef.current, viewport, zoom, pan, true);
      if (!point) return;

      if (interaction.type === "draw") {
        setInteraction((current) =>
          current?.type === "draw"
            ? {
                ...current,
                currentX: point.x,
                currentY: point.y,
              }
            : current,
        );
        return;
      }

      if (interaction.type === "select") {
        setInteraction((current) =>
          current?.type === "select"
            ? {
                ...current,
                currentX: point.x,
                currentY: point.y,
              }
            : current,
        );
        return;
      }

      if (interaction.type === "move") {
        setAnnotations((current) =>
          current.map((item, index) => {
            const moveIndex = interaction.indices.indexOf(index);
            if (moveIndex === -1) {
              return item;
            }
            return moveAnnotation(interaction.initial[moveIndex], interaction.anchorX, interaction.anchorY, point.x, point.y);
          }),
        );
        return;
      }

      setAnnotations((current) =>
        current.map((item, index) =>
          index === interaction.index ? resizeAnnotation(interaction.initial, interaction.handle, point.x, point.y) : item,
        ),
      );
    };

    const handleUp = () => {
      if (interaction.type === "pan") {
        setInteraction(null);
        return;
      }

      if (interaction.type === "select") {
        const selectedIndices = selectAnnotationsInRect(
          annotationsRef.current,
          interaction.startX,
          interaction.startY,
          interaction.currentX,
          interaction.currentY,
        );
        setSelectedAnnotationIndices(selectedIndices);
        setSelectedAnnotationIndex(selectedIndices.length ? selectedIndices[selectedIndices.length - 1] : null);
        setInteraction(null);
        return;
      }

      if (interaction.type === "draw" && selectedClassId != null) {
        const left = clamp01(Math.min(interaction.startX, interaction.currentX));
        const top = clamp01(Math.min(interaction.startY, interaction.currentY));
        const right = clamp01(Math.max(interaction.startX, interaction.currentX));
        const bottom = clamp01(Math.max(interaction.startY, interaction.currentY));
        const width = right - left;
        const height = bottom - top;
        if (width >= 0.01 && height >= 0.01) {
          const nextAnnotations = [
            ...cloneAnnotations(annotationsRef.current),
            {
              class_id: selectedClassId,
              height: round6(height),
              width: round6(width),
              x_center: round6(left + width / 2),
              y_center: round6(top + height / 2),
            },
          ];
          finalizeInteraction(nextAnnotations, nextAnnotations.length - 1);
        } else {
          interactionStartSnapshotRef.current = null;
        }
      } else {
        finalizeInteraction(annotationsRef.current, selectedAnnotationIndex);
      }
      setInteraction(null);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [interaction, pan, selectedAnnotationIndex, selectedClassId, viewport, zoom]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (selectedAnnotationIndex != null && event.altKey) {
        const step = event.shiftKey ? 0.01 : 0.0025;
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          nudgeSelectedAnnotation(-step, 0);
          return;
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          nudgeSelectedAnnotation(step, 0);
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          nudgeSelectedAnnotation(0, -step);
          return;
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          nudgeSelectedAnnotation(0, step);
          return;
        }
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && event.shiftKey) {
        event.preventDefault();
        redo();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
        return;
      }
      if ((event.ctrlKey && event.key.toLowerCase() === "y") || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && event.shiftKey)) {
        event.preventDefault();
        redo();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        void navigateImage(1);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        void navigateImage(-1);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        void jumpToNextInQueue((item) => item.annotated && !item.verified);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        void jumpToNextInQueue((item) => !item.annotated);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveCurrent();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c") {
        event.preventDefault();
        copySelectedAnnotations();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        if (annotationsRef.current.length) {
          const allIndices = annotationsRef.current.map((_, index) => index);
          setSelectedAnnotationIndex(allIndices[allIndices.length - 1] ?? null);
          setSelectedAnnotationIndices(allIndices);
        }
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "v") {
        event.preventDefault();
        pasteAnnotations();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelectedAnnotation();
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        void saveAndNavigate(1);
        return;
      }
      if (event.key === " ") {
        event.preventDefault();
        void toggleVerified();
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedAnnotationIndex != null) {
        event.preventDefault();
        deleteSelectedAnnotation();
        return;
      }
      if (event.key === "0") {
        event.preventDefault();
        fitCanvas();
        return;
      }
      if (event.key === "=" || event.key === "+") {
        event.preventDefault();
        updateZoom(zoom + 0.15);
        return;
      }
      if (event.key === "-") {
        event.preventDefault();
        updateZoom(zoom - 0.15);
        return;
      }
      const numeric = Number(event.key);
      if (Number.isInteger(numeric) && numeric >= 1 && numeric <= Math.min(classEntries.length, 9)) {
        const entry = classEntries[numeric - 1];
        if (entry) {
          if (selectedAnnotationIndex != null) {
            changeSelectedAnnotationClass(entry.classId);
            return;
          }
          setSelectedClassId(entry.classId);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [absoluteIndex, classEntries, displayItems, historyFuture.length, historyPast.length, navigationMode, selectedAnnotationIndex, zoom]);

  useEffect(() => {
    if (!dirty || !selectedMedia || interaction || saveAnnotation.isPending) return;
    const timeoutId = window.setTimeout(() => {
      void promoteAutosave();
    }, 1000);
    return () => window.clearTimeout(timeoutId);
  }, [annotations, dirty, imageTags, interaction, selectedMedia, verified, saveAnnotation.isPending]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  if (!dataset) {
    return (
      <section className="ui-page h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
        <div>
          <h1 className="ui-title">Labeling</h1>
          <p className="ui-subtitle mt-1">Loading dataset context...</p>
        </div>
        <Card className="flex min-h-0 items-center justify-center">
          <CardContent className="space-y-2 text-center">
            <div className="ui-section-title">Loading dataset</div>
            <div className="ui-subtitle">Please wait while the annotation workspace is prepared.</div>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="ui-page h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[length:var(--font-xs)] text-slate-500">
            <button className="inline-flex items-center gap-1 font-semibold text-primary" onClick={() => void handleBack()} type="button">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to datasets
            </button>
            <span>/</span>
            <span>
              {dataset.name} {dataset.version}
            </span>
            <span>/</span>
            <span>{selectedMedia?.name ?? "No image selected"}</span>
          </div>
          <h1 className="ui-title">Labeling</h1>
          <p className="ui-subtitle mt-1">Use dataset labels, tags, and review status to prepare versioned annotations for training.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={dataset.status === "Ready" ? "success" : "warning"}>{dataset.status}</Badge>
          <Badge tone={saveAnnotation.isPending ? "warning" : lastSaveFailed ? "warning" : dirty ? "warning" : "default"}>
            {saveAnnotation.isPending ? "Saving..." : lastSaveFailed ? "Save failed" : dirty ? "Unsaved changes" : "Saved"}
          </Badge>
          <Badge tone={verified ? "success" : "default"}>{verified ? "Verified" : "Awaiting review"}</Badge>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <Button className="h-9 gap-2" disabled={!navigationItems.length || navigationIndex <= 0} onClick={() => void navigateImage(-1)} variant="secondary">
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button className="h-9 gap-2" disabled={!navigationItems.length || navigationIndex < 0 || navigationIndex >= navigationItems.length - 1} onClick={() => void navigateImage(1)} variant="secondary">
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[length:var(--font-sm)] font-semibold text-slate-700">
            {navigationIndex >= 0 ? navigationIndex + 1 : 0} / {navigationItems.length || displayItems.length}
          </div>
          <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
            {[
              { key: "all", label: "All", count: displayItems.length },
              { key: "unlabeled", label: "Label queue", count: unlabeledCount },
              { key: "review", label: "Review queue", count: awaitingReviewCount },
            ].map((mode, index) => (
              <button
                className={cn(
                  "inline-flex h-9 items-center gap-2 px-3 text-[length:var(--font-sm)] font-medium transition-colors",
                  index > 0 && "border-l border-slate-200",
                  navigationMode === mode.key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50",
                )}
                key={mode.key}
                onClick={() => setNavigationMode(mode.key as typeof navigationMode)}
                type="button"
              >
                {mode.label}
                <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", navigationMode === mode.key ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500")}>
                  {formatCount(mode.count)}
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
            <button
              className={cn(
                "inline-flex h-9 items-center gap-2 px-3 text-[length:var(--font-sm)] font-medium transition-colors",
                activeTool === "pan" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50",
              )}
              onClick={() => setActiveTool("pan")}
              type="button"
            >
              <Hand className="h-4 w-4" />
              Pan
            </button>
            <button
              className={cn(
                "inline-flex h-9 items-center gap-2 border-l border-slate-200 px-3 text-[length:var(--font-sm)] font-medium transition-colors",
                activeTool === "draw" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50",
              )}
              onClick={() => setActiveTool("draw")}
              type="button"
            >
              <SquareDashedMousePointer className="h-4 w-4" />
              Box
            </button>
          </div>
          <span className="ui-chip">{selectedClass?.name ?? "Pick a label"}</span>
          <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
            <button className="inline-flex h-9 w-9 items-center justify-center text-slate-500 hover:bg-slate-50" onClick={() => updateZoom(zoom - 0.15)} type="button">
              <Minus className="h-4 w-4" />
            </button>
            <div className="min-w-[68px] border-x border-slate-200 px-3 text-center text-[length:var(--font-sm)] font-semibold text-slate-700">
              {Math.round(zoom * 100)}%
            </div>
            <button className="inline-flex h-9 w-9 items-center justify-center text-slate-500 hover:bg-slate-50" onClick={() => updateZoom(zoom + 0.15)} type="button">
              <Plus className="h-4 w-4" />
            </button>
            <button className="inline-flex h-9 items-center px-3 text-[length:var(--font-sm)] font-medium text-slate-500 hover:bg-slate-50" onClick={fitCanvas} type="button">
              Fit
            </button>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button className="h-9 gap-2" disabled={!historyPast.length} onClick={undo} variant="secondary">
              <RotateCcw className="h-4 w-4" />
              Undo
            </Button>
            <Button className="h-9 gap-2" disabled={!historyFuture.length} onClick={redo} variant="secondary">
              <RotateCw className="h-4 w-4" />
              Redo
            </Button>
            <Button className="h-9 gap-2" disabled={!selectedMedia || saveAnnotation.isPending || !dirty} onClick={() => void saveAndStay()}>
              <Save className="h-4 w-4" />
              Save
            </Button>
            <Button className="h-9 gap-2" disabled={!selectedMedia || saveAnnotation.isPending} onClick={() => void saveAndNavigate(1)} variant="secondary">
              Save & Next
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button className="h-9 gap-2" onClick={toggleVerified} variant={verified ? "default" : "secondary"}>
              <CheckCircle2 className="h-4 w-4" />
              {verified ? "Verified" : "Mark Verified"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid min-h-0 gap-4 xl:grid-cols-[320px_minmax(0,1fr)_380px]">
        <Card className="min-h-0 overflow-hidden">
          <CardContent className="flex h-full min-h-0 flex-col p-0">
            <div className="border-b border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="ui-section-title">Files</div>
                  <div className="ui-meta mt-1">{filteredItems.length} images in the current view</div>
                </div>
                <div className="flex items-center gap-2 text-[length:var(--font-xs)] text-slate-500">
                  <span>{annotatedCount} annotated</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>{awaitingReviewCount} awaiting review</span>
                </div>
              </div>

              <label className="mt-3 flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-400">
                <Search className="h-4 w-4" />
                <input
                  className="w-full bg-transparent text-[length:var(--font-sm)] text-slate-700 outline-none placeholder:text-slate-400"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search image name..."
                  value={search}
                />
              </label>

              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  { count: displayItems.length, key: "all", label: "All" },
                  { count: unlabeledCount, key: "unlabeled", label: "Unlabeled" },
                  { count: annotatedCount, key: "annotated", label: "Annotated" },
                  { count: awaitingReviewCount, key: "awaiting_review", label: "Awaiting review" },
                ].map(({ key, label, count }) => (
                  <button
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[length:var(--font-xs)] font-semibold",
                      filter === key ? "border-blue-200 bg-blue-50 text-primary" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
                    )}
                    key={key}
                    onClick={() => setFilter(key as MediaFilter)}
                    type="button"
                  >
                    {label} {formatCount(count)}
                  </button>
                ))}
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-[length:var(--font-sm)] font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!unlabeledCount}
                  onClick={() => void jumpToNextInQueue((item) => !item.annotated)}
                  type="button"
                >
                  <span>Next unlabeled</span>
                  <span className="text-[length:var(--font-xs)] text-slate-500">{formatCount(unlabeledCount)}</span>
                </button>
                <button
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-[length:var(--font-sm)] font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!awaitingReviewCount}
                  onClick={() => void jumpToNextInQueue((item) => item.annotated && !item.verified)}
                  type="button"
                >
                  <span>Next review</span>
                  <span className="text-[length:var(--font-xs)] text-slate-500">{formatCount(awaitingReviewCount)}</span>
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-4">
              {filteredItems.length ? (
                <div className="space-y-2">
                  {filteredItems.map((item) => {
                    const state = mediaState(item);
                    const selected = selectedMedia?.path === item.path;
                    return (
                      <button
                        className={cn(
                          "flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors",
                          selected ? "border-blue-200 bg-blue-50/60" : "border-slate-200/70 bg-white hover:bg-slate-50",
                        )}
                        key={item.path}
                        onClick={() => void selectImage(item.path)}
                        type="button"
                      >
                        <div className="h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                          {item.preview_url ? (
                            <img alt={item.name} className="h-full w-full object-cover" src={item.preview_url} />
                          ) : (
                            <div className="flex h-full items-center justify-center text-slate-400">
                              <ImageIcon className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="truncate text-[length:var(--font-sm)] font-semibold text-slate-900">{item.name}</div>
                            <span className="shrink-0 text-[length:var(--font-2xs)] font-medium text-slate-400">
                              #{displayIndexByPath.get(item.path) ?? 0}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[length:var(--font-xs)] text-slate-500">
                            <span>{item.split}</span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span>{state.label}</span>
                            {selected && annotations.length ? (
                              <>
                                <span className="h-1 w-1 rounded-full bg-slate-300" />
                                <span>{annotations.length} objects</span>
                              </>
                            ) : null}
                            {item.verified ? (
                              <>
                                <span className="h-1 w-1 rounded-full bg-slate-300" />
                                <span>Reviewed</span>
                              </>
                            ) : null}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <StatusPill tone={state.tone}>{state.label}</StatusPill>
                            {item.tags.length ? <StatusPill tone="slate">{item.tags.length} tags</StatusPill> : null}
                            {item.tags.slice(0, 2).map((tag) => (
                              <StatusPill key={tag} tone="slate">
                                {tag}
                              </StatusPill>
                            ))}
                            {item.tags.length > 2 ? <StatusPill tone="slate">+{item.tags.length - 2}</StatusPill> : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-[length:var(--font-sm)] text-slate-500">
                  No images match the current filter.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-0 overflow-hidden">
          <CardContent className="flex h-full min-h-0 flex-col p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="ui-section-title">Annotation Canvas</div>
                <div className="ui-meta mt-1">
                  {selectedMedia
                    ? `${selectedMedia.name} • ${selectedMedia.width ?? "?"} x ${selectedMedia.height ?? "?"}`
                    : "No image selected"}
                </div>
              </div>
              <div className="flex items-center gap-2 text-[length:var(--font-xs)] text-slate-500">
                <span>{annotations.length} objects</span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span>{imageTags.length} tags</span>
              </div>
            </div>

            <div
              ref={containerRef}
              className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950/95"
              onMouseDown={beginCanvasInteraction}
              onWheel={handleWheel}
              style={{ cursor: interaction?.type === "pan" ? "grabbing" : activeTool === "pan" ? "grab" : selectedClassId != null ? "crosshair" : "default" }}
            >
              {selectedMedia?.preview_url ? (
                <>
                  {viewport ? (
                    <div
                      className="absolute"
                      style={{
                        height: viewport.height * zoom,
                        left: viewport.left + pan.x,
                        top: viewport.top + pan.y,
                        width: viewport.width * zoom,
                      }}
                    >
                      <img
                        ref={imageRef}
                        alt={selectedMedia.name}
                        className="absolute inset-0 h-full w-full select-none object-fill"
                        draggable={false}
                        src={selectedMedia.preview_url}
                      />
                      {annotations.map((annotation, index) => {
                        const classInfo = classEntries.find((item) => item.classId === annotation.class_id);
                        const left = (annotation.x_center - annotation.width / 2) * viewport.width * zoom;
                        const top = (annotation.y_center - annotation.height / 2) * viewport.height * zoom;
                        const width = annotation.width * viewport.width * zoom;
                        const height = annotation.height * viewport.height * zoom;
                        const selected = selectedAnnotationIndices.includes(index);

                        return (
                          <div
                            className={cn(
                              "absolute border-2 bg-white/0 transition-shadow",
                              selected ? "shadow-[0_0_0_2px_rgba(255,255,255,0.9)]" : "",
                            )}
                            key={`${annotation.class_id}-${index}`}
                            onMouseDown={(event) => beginMove(index, event)}
                            style={{
                              borderColor: classInfo?.color ?? "#2F6DF6",
                              cursor: "move",
                              height,
                              left,
                              top,
                              width,
                            }}
                          >
                            <span
                              className="absolute left-0 top-0 -translate-y-full rounded-t-md px-1.5 py-0.5 text-[10px] font-semibold text-white"
                              style={{ backgroundColor: classInfo?.color ?? "#2F6DF6" }}
                            >
                              {classInfo?.name ?? `Class ${annotation.class_id}`}
                            </span>

                            {(["nw", "n", "ne", "e", "se", "s", "sw", "w"] as ResizeHandle[]).map((handle) => (
                              <div
                                className={cn(
                                  "absolute h-3 w-3 rounded-full border-2 border-white bg-slate-900 shadow-sm",
                                  handle === "nw" && "-left-1.5 -top-1.5 cursor-nwse-resize",
                                  handle === "n" && "left-1/2 -top-1.5 -translate-x-1/2 cursor-ns-resize",
                                  handle === "ne" && "-right-1.5 -top-1.5 cursor-nesw-resize",
                                  handle === "e" && "-right-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize",
                                  handle === "se" && "-bottom-1.5 -right-1.5 cursor-nwse-resize",
                                  handle === "s" && "-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize",
                                  handle === "sw" && "-bottom-1.5 -left-1.5 cursor-nesw-resize",
                                  handle === "w" && "-left-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize",
                                )}
                                key={handle}
                                onMouseDown={(event) => beginResize(index, handle, event)}
                              />
                            ))}
                          </div>
                        );
                      })}
                      {draftRect ? <DraftOverlay draftRect={draftRect} viewport={viewport} zoom={zoom} /> : null}
                      {selectionRect ? <SelectionOverlay selectionRect={selectionRect} viewport={viewport} zoom={zoom} /> : null}
                    </div>
                  ) : null}
                  {annotationQuery.isLoading ? (
                    <div className="absolute right-4 top-4 rounded-full bg-slate-900/70 px-3 py-1 text-[length:var(--font-xs)] text-white">
                      Loading annotations...
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-[length:var(--font-sm)] text-slate-400">
                  {mediaLoading ? "Loading images..." : "Select an image from the left sidebar to start annotating"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-0 overflow-hidden">
          <CardContent className="flex h-full min-h-0 flex-col p-4">
            <div className="min-h-0 flex-1 space-y-5 overflow-auto pr-1">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="ui-section-title">Dataset Labels</div>
                      <div className="ui-meta mt-1">Pick a class for the next box. Manage the catalog in Datasets.</div>
                    </div>
                    <Badge>{classEntries.length}</Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    {classEntries.length ? (
                      classEntries.map((item, index) => (
                        <button
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left",
                            selectedClassId === item.classId ? "border-blue-200 bg-blue-50 text-primary" : "border-slate-200/70 hover:bg-slate-50",
                          )}
                          key={`${item.classId}-${item.name}`}
                          onClick={() => setSelectedClassId(item.classId)}
                          type="button"
                        >
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="min-w-0 flex-1 truncate text-[length:var(--font-sm)] font-medium">{item.name}</span>
                          <span className="text-[length:var(--font-2xs)] text-slate-500">#{index + 1}</span>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 p-3 text-[length:var(--font-sm)] text-slate-500">
                        No labels yet. Add classes in the dataset workspace first.
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="ui-section-title">Objects on Current Frame</div>
                      <div className="ui-meta mt-1">
                        {annotations.length} objects on this image. {selectedAnnotationCount ? `${selectedAnnotationCount} selected.` : "Select one or more boxes."}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button className="h-9 gap-2" disabled={!selectedAnnotationCount} onClick={copySelectedAnnotations} variant="secondary">
                        <Copy className="h-4 w-4" />
                        Copy
                      </Button>
                      <Button className="h-9 gap-2" disabled={!clipboardCount} onClick={pasteAnnotations} variant="secondary">
                        <Copy className="h-4 w-4" />
                        Paste
                      </Button>
                      <Button className="h-9 gap-2" disabled={!selectedAnnotationCount} onClick={duplicateSelectedAnnotation} variant="secondary">
                        <Copy className="h-4 w-4" />
                        Duplicate
                      </Button>
                      <Button className="h-9 gap-2" disabled={!selectedAnnotationCount} onClick={deleteSelectedAnnotation} variant="secondary">
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  {selectedAnnotation ? (
                    <div className="mb-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
                      <div className="text-[length:var(--font-sm)] font-semibold text-slate-900">
                        {selectedAnnotationCount > 1 ? `Selected objects (${selectedAnnotationCount})` : "Selected object"}
                      </div>
                      <div className="mt-2 text-[length:var(--font-xs)] text-slate-500">
                        {selectedAnnotationCount > 1
                          ? "Change the class for the whole selection or duplicate it as a group."
                          : "Change the label or duplicate the current box."}
                      </div>
                      <select
                        className="form-select mt-3 h-10 rounded-xl bg-white"
                        onChange={(event) => changeSelectedAnnotationClass(Number(event.target.value))}
                        value={selectedAnnotation.class_id}
                      >
                        {classEntries.map((item) => (
                          <option key={`${item.classId}-${item.name}`} value={item.classId}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    {annotations.length ? (
                      annotations.map((annotation, index) => {
                        const classInfo = classEntries.find((item) => item.classId === annotation.class_id);
                        return (
                          <button
                            className={cn(
                              "w-full rounded-xl border px-3 py-2 text-left",
                              selectedAnnotationIndices.includes(index) ? "border-blue-200 bg-blue-50" : "border-slate-200/70 bg-white hover:bg-slate-50",
                            )}
                            key={`${annotation.class_id}-${index}`}
                            onClick={(event) => setAnnotationSelection(index, { range: event.shiftKey, toggle: event.metaKey || event.ctrlKey })}
                            type="button"
                          >
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: classInfo?.color ?? "#2F6DF6" }} />
                              <span className="text-[length:var(--font-sm)] font-semibold text-slate-900">
                                {classInfo?.name ?? `Class ${annotation.class_id}`}
                              </span>
                            </div>
                            <div className="mt-1 text-[length:var(--font-2xs)] text-slate-500">
                              x={annotation.x_center.toFixed(3)} y={annotation.y_center.toFixed(3)} w={annotation.width.toFixed(3)} h={annotation.height.toFixed(3)}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 p-3 text-[length:var(--font-sm)] text-slate-500">
                        No objects yet. Choose a label and drag a box on the image.
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="ui-section-title">Image Tags</div>
                  <div className="ui-meta mt-1">Tags are managed in Datasets → Tags and selected here per image.</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tagCatalog.tags.length ? (
                      tagCatalog.tags.map((tag) => (
                        <button
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-[length:var(--font-xs)] font-semibold",
                            imageTags.includes(tag) ? "border-blue-200 bg-blue-50 text-primary" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
                          )}
                          key={tag}
                          onClick={() => toggleImageTag(tag)}
                          type="button"
                        >
                          {tag}
                        </button>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 p-3 text-[length:var(--font-sm)] text-slate-500">
                        No dataset tags yet. Add them in the dataset workspace first.
                      </div>
                    )}
                  </div>
                  {imageTags.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {imageTags.map((tag) => (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-[length:var(--font-xs)] font-semibold text-slate-700"
                          key={tag}
                        >
                          <Tags className="h-3 w-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div>
                  <div className="ui-section-title">Review</div>
                  <div className="ui-meta mt-1">Keep track of annotation coverage and confirmation progress.</div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <MiniMetric label="Annotated" value={formatCount(annotatedCount)} />
                    <MiniMetric label="Unlabeled" value={formatCount(unlabeledCount)} />
                    <MiniMetric label="Awaiting review" value={formatCount(awaitingReviewCount)} />
                    <MiniMetric label="Verified" value={formatCount(verifiedCount)} />
                  </div>

                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[length:var(--font-sm)] font-semibold text-slate-900">Current image review</div>
                        <div className="mt-1 text-[length:var(--font-xs)] text-slate-500">
                          {verified
                            ? "This frame is confirmed and ready for training or auto-label verification."
                            : "Confirm the frame after checking boxes and tags."}
                        </div>
                      </div>
                      <Button className="h-10 gap-2" onClick={toggleVerified} variant={verified ? "default" : "secondary"}>
                        <CheckCircle2 className="h-4 w-4" />
                        {verified ? "Verified" : "Confirm"}
                      </Button>
                    </div>
                  </div>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function ProgressBlock({
  label,
  tone = "blue",
  value,
  width,
}: {
  label: string;
  tone?: "blue" | "emerald";
  value: string;
  width: number;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[length:var(--font-xs)]">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="text-slate-500">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full", tone === "emerald" ? "bg-emerald-500" : "bg-primary")}
          style={{ width: `${clamp(width, 0, 100)}%` }}
        />
      </div>
    </div>
  );
}

function DatasetCardMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ImageIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 px-3 py-2">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[length:var(--font-2xs)] uppercase tracking-[0.08em]">{label}</span>
      </div>
      <div className="mt-1 text-[length:var(--font-lg)] font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function DraftOverlay({ draftRect, viewport, zoom }: { draftRect: DrawInteraction; viewport: ViewportBox; zoom: number }) {
  const left = Math.min(draftRect.startX, draftRect.currentX) * viewport.width * zoom;
  const top = Math.min(draftRect.startY, draftRect.currentY) * viewport.height * zoom;
  const width = Math.abs(draftRect.currentX - draftRect.startX) * viewport.width * zoom;
  const height = Math.abs(draftRect.currentY - draftRect.startY) * viewport.height * zoom;

  return (
    <div
      className="pointer-events-none absolute border-2 border-dashed border-white bg-white/10"
      style={{ height, left, top, width }}
    />
  );
}

function SelectionOverlay({
  selectionRect,
  viewport,
  zoom,
}: {
  selectionRect: SelectInteraction;
  viewport: ViewportBox;
  zoom: number;
}) {
  const left = Math.min(selectionRect.startX, selectionRect.currentX) * viewport.width * zoom;
  const top = Math.min(selectionRect.startY, selectionRect.currentY) * viewport.height * zoom;
  const width = Math.abs(selectionRect.currentX - selectionRect.startX) * viewport.width * zoom;
  const height = Math.abs(selectionRect.currentY - selectionRect.startY) * viewport.height * zoom;

  return (
    <div
      className="pointer-events-none absolute border border-dashed border-blue-300 bg-blue-400/15"
      style={{ height, left, top, width }}
    />
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3">
      <div className="text-[length:var(--font-xs)] text-slate-500">{label}</div>
      <div className="mt-1 text-[length:var(--font-xl)] font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function StatusPill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "blue" | "emerald" | "slate" | "amber";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[length:var(--font-2xs)] font-semibold",
        tone === "blue" && "bg-blue-50 text-primary",
        tone === "emerald" && "bg-emerald-50 text-emerald-700",
        tone === "amber" && "bg-amber-50 text-amber-700",
        tone === "slate" && "bg-slate-100 text-slate-600",
      )}
    >
      {children}
    </span>
  );
}

function InfoMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white px-3 py-2">
      <div className="text-[length:var(--font-2xs)] uppercase tracking-[0.08em] text-slate-400">{label}</div>
      <div className="mt-1 text-[length:var(--font-sm)] font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function mediaState(item: DatasetMediaItem) {
  if (item.verified) return { label: "Verified", tone: "emerald" as const };
  if (item.annotated) return { label: "Awaiting review", tone: "amber" as const };
  return { label: "Unlabeled", tone: "slate" as const };
}

function clientPointToNormalized(
  clientX: number,
  clientY: number,
  container: HTMLDivElement | null,
  viewport: ViewportBox,
  zoom: number,
  pan: Point2D,
  clampToViewport: boolean,
) {
  if (!container) return null;
  const rect = container.getBoundingClientRect();
  let x = (clientX - rect.left - viewport.left - pan.x) / (viewport.width * zoom);
  let y = (clientY - rect.top - viewport.top - pan.y) / (viewport.height * zoom);
  if (clampToViewport) {
    x = clamp01(x);
    y = clamp01(y);
  }
  return { x, y };
}

function cloneAnnotations(items: DatasetAnnotationShape[]) {
  return items.map((item) => ({ ...item }));
}

function normalizeAnnotationIndices(indices: number[], total: number) {
  return [...new Set(indices.filter((index) => index >= 0 && index < total))].sort((left, right) => left - right);
}

function clampPan(nextPan: Point2D, viewport: ViewportBox, zoom: number) {
  const overflowX = Math.max(viewport.width * zoom - viewport.width, 0);
  const overflowY = Math.max(viewport.height * zoom - viewport.height, 0);
  return {
    x: clamp(nextPan.x, -overflowX, 0),
    y: clamp(nextPan.y, -overflowY, 0),
  };
}

function moveAnnotation(initial: DatasetAnnotationShape, anchorX: number, anchorY: number, nextX: number, nextY: number) {
  const halfWidth = initial.width / 2;
  const halfHeight = initial.height / 2;
  return {
    ...initial,
    x_center: round6(clamp(initial.x_center + (nextX - anchorX), halfWidth, 1 - halfWidth)),
    y_center: round6(clamp(initial.y_center + (nextY - anchorY), halfHeight, 1 - halfHeight)),
  };
}

function resizeAnnotation(initial: DatasetAnnotationShape, handle: ResizeHandle, pointX: number, pointY: number) {
  const minSize = 0.01;
  let left = initial.x_center - initial.width / 2;
  let right = initial.x_center + initial.width / 2;
  let top = initial.y_center - initial.height / 2;
  let bottom = initial.y_center + initial.height / 2;

  if (handle === "nw" || handle === "w" || handle === "sw") {
    left = clamp(pointX, 0, right - minSize);
  }
  if (handle === "ne" || handle === "e" || handle === "se") {
    right = clamp(pointX, left + minSize, 1);
  }
  if (handle === "nw" || handle === "n" || handle === "ne") {
    top = clamp(pointY, 0, bottom - minSize);
  }
  if (handle === "sw" || handle === "s" || handle === "se") {
    bottom = clamp(pointY, top + minSize, 1);
  }

  return {
    ...initial,
    height: round6(bottom - top),
    width: round6(right - left),
    x_center: round6((left + right) / 2),
    y_center: round6((top + bottom) / 2),
  };
}

function selectAnnotationsInRect(
  annotations: DatasetAnnotationShape[],
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
) {
  const left = Math.min(startX, currentX);
  const right = Math.max(startX, currentX);
  const top = Math.min(startY, currentY);
  const bottom = Math.max(startY, currentY);
  if (Math.abs(right - left) < 0.002 && Math.abs(bottom - top) < 0.002) {
    return [];
  }

  return annotations.flatMap((annotation, index) => {
    const annotationLeft = annotation.x_center - annotation.width / 2;
    const annotationRight = annotation.x_center + annotation.width / 2;
    const annotationTop = annotation.y_center - annotation.height / 2;
    const annotationBottom = annotation.y_center + annotation.height / 2;
    const overlaps = annotationLeft <= right && annotationRight >= left && annotationTop <= bottom && annotationBottom >= top;
    return overlaps ? [index] : [];
  });
}

function isPointInside(point: { x: number; y: number }) {
  return point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1;
}

function annotationStateKey(annotations: DatasetAnnotationShape[], verified: boolean, tags: string[]) {
  return JSON.stringify({ annotations, tags: sortStrings(tags), verified });
}

function sortStrings(values: string[]) {
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)];
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Number(((value / total) * 100).toFixed(1));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number) {
  return clamp(value, 0, 1);
}

function round6(value: number) {
  return Number(value.toFixed(6));
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
}
