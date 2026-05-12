import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Database,
  Folder,
  FolderOpen,
  HardDrive,
  Images,
  Link2,
  PlusCircle,
  Save,
  Search,
  Settings,
  Tags,
  Trash2,
  User,
  X,
  Edit,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  createProject,
  deleteProject,
  getDatasets,
  getProject,
  getProjects,
  openProjectFolder,
  updateDataset,
  updateProject,
} from "@/lib/api";
import { formatCount, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useProjects, useDeleteProject } from "@/hooks";
import { useModal } from "@/hooks/useModal";
import { CreateProjectModal, EditProjectModal } from "@/components/modals/ProjectModals";
import { DeleteConfirmModal } from "@/components/modals/DeleteConfirmModal";
import type { DatasetItem, ProjectDetail, ProjectSummary } from "@/types/workspace";

type ProjectTab = "overview" | "datasets" | "activity" | "settings";

const projectTabs: Array<{ id: ProjectTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "datasets", label: "Datasets" },
  { id: "activity", label: "Activity" },
  { id: "settings", label: "Settings" },
];

// NEW: Demo компонент для тестирования Modal System
function ProjectsListWithModals() {
  const { data: projects, isLoading } = useProjects();
  const deleteProject = useDeleteProject();
  const { openModal } = useModal();

  const handleCreateClick = () => {
    openModal({
      id: `create-project-${Date.now()}`,
      title: "Create New Project",
      component: CreateProjectModal,
      props: {},
    });
  };

  const handleEditClick = (project: ProjectSummary) => {
    openModal({
      id: `edit-project-${project.id}`,
      title: "Edit Project",
      component: EditProjectModal,
      props: { project },
    });
  };

  const handleDeleteClick = (project: ProjectSummary) => {
    openModal({
      id: `delete-project-${project.id}`,
      title: "Delete Project",
      component: DeleteConfirmModal,
      props: {
        title: "Delete Project?",
        message: "Are you sure you want to delete this project?",
        itemName: project.name,
        isLoading: deleteProject.isPending,
        onConfirm: () => deleteProject.mutateAsync(project.id),
      },
    });
  };

  if (isLoading) {
    return <div className="p-4">Loading projects...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">Projects (with React Query + Modal)</h3>
        <Button onClick={handleCreateClick} className="gap-2">
          <PlusCircle className="h-4 w-4" />
          New Project
        </Button>
      </div>

      <div className="grid gap-2">
        {projects?.map((project) => (
          <Card key={project.id} className="hover:shadow-md transition-shadow">
            <CardContent className="flex items-center justify-between pt-4">
              <div>
                <div className="font-semibold text-slate-900">{project.name}</div>
                <div className="text-sm text-slate-500">{project.description || "No description"}</div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => handleEditClick(project)}
                  className="gap-2 text-sm"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleDeleteClick(project)}
                  className="gap-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {projects?.length === 0 && (
        <div className="text-center py-8 text-slate-500 border border-dashed rounded-lg">
          No projects yet. Click "New Project" to create one!
        </div>
      )}
    </div>
  );
}

export function ProjectsPage() {
  const queryClient = useQueryClient();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selected, setSelected] = useState<ProjectDetail | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [task, setTask] = useState("Object Detection");
  const [storagePath, setStoragePath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [projectSearch, setProjectSearch] = useState("");

  async function refreshProjects(preferredId?: number) {
    const items = await getProjects();
    setProjects(items);
    const nextId = preferredId ?? selectedId ?? items[0]?.id ?? null;
    setSelectedId(nextId);
    if (nextId) {
      setSelected(await getProject(nextId));
    } else {
      setSelected(null);
    }
  }

  useEffect(() => {
    void refreshProjects().catch((reason: Error) => setError(reason.message));
  }, []);

  useEffect(() => {
    if (selectedId === null) {
      setSelected(null);
      return;
    }
    void getProject(selectedId)
      .then(setSelected)
      .catch((reason: Error) => setError(reason.message));
  }, [selectedId]);

  const filteredProjects = useMemo(() => {
    const query = projectSearch.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((project) =>
      [project.name, project.description, project.task, project.owner, project.storage_path]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [projectSearch, projects]);

  async function handleCreateProject() {
    if (!name.trim()) return;
    setError(null);
    try {
      const project = await createProject({
        description,
        name,
        storage_path: storagePath || undefined,
        task,
      });
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      setName("");
      setDescription("");
      setStoragePath("");
      setIsCreating(false);
      await refreshProjects(project.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Create project failed");
    }
  }

  return (
    <section className="ui-page ui-page-tight h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="ui-title">Projects</h1>
          <p className="ui-subtitle mt-1">Manage project datasets, activity and settings</p>
        </div>
        <Button className="h-8 gap-2" onClick={() => setIsCreating((value) => !value)}>
          + New Project
        </Button>
      </div>

      <div className="grid min-h-0 gap-3 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="min-h-0">
          <CardContent className="flex h-full min-h-0 flex-col p-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="ui-section-title">All Projects</h2>
              <Badge>{projects.length}</Badge>
            </div>
            <label className="mb-3 flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-slate-400">
              <Search className="h-4 w-4" />
              <input
                className="min-w-0 flex-1 bg-transparent text-[length:var(--font-sm)] outline-none"
                onChange={(event) => setProjectSearch(event.target.value)}
                placeholder="Search projects..."
                value={projectSearch}
              />
            </label>

            {isCreating && (
              <div className="mb-3 space-y-2 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                <input className="form-input" onChange={(event) => setName(event.target.value)} placeholder="Project name" value={name} />
                <input className="form-input" onChange={(event) => setDescription(event.target.value)} placeholder="Description" value={description} />
                <input className="form-input" onChange={(event) => setTask(event.target.value)} placeholder="Task" value={task} />
                <input className="form-input" onChange={(event) => setStoragePath(event.target.value)} placeholder="Storage path, optional" value={storagePath} />
                <Button className="h-8 w-full" disabled={!name.trim()} onClick={() => void handleCreateProject()}>
                  Create
                </Button>
              </div>
            )}

            {error && <div className="mb-2 rounded-md bg-rose-50 p-2 text-[length:var(--font-xs)] text-rose-500">{error}</div>}

            <div className="min-h-0 space-y-1 overflow-auto pr-1">
              {filteredProjects.length ? (
                filteredProjects.map((project) => (
                  <button
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                      project.id === selectedId ? "border-blue-200 bg-blue-50/70" : "border-transparent hover:border-slate-200 hover:bg-slate-50",
                    )}
                    key={project.id}
                    onClick={() => setSelectedId(project.id)}
                    type="button"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Folder className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="ui-card-title truncate">{project.name}</div>
                      <div className="ui-label truncate">{project.task}</div>
                      <div className="mt-0.5 text-[length:var(--font-xs)] text-slate-500">{formatDateTime(project.updated_at)}</div>
                    </div>
                  </button>
                ))
              ) : (
                <ProjectEmptyState compact title="No projects found" subtitle="Create a project or clear search." />
              )}
            </div>
          </CardContent>
        </Card>

        {selected ? (
          <ProjectDetails
            project={selected}
            onDeleted={() => {
              void Promise.all([
                refreshProjects(),
                queryClient.invalidateQueries({ queryKey: ["projects"] }),
                queryClient.invalidateQueries({ queryKey: ["datasets"] }),
              ]);
            }}
            onProjectChanged={(project) => {
              setSelected(project);
              setProjects((items) => items.map((item) => (item.id === project.id ? project : item)));
              void Promise.all([
                queryClient.invalidateQueries({ queryKey: ["projects"] }),
                queryClient.invalidateQueries({ queryKey: ["datasets"] }),
              ]);
            }}
            onReload={() => void refreshProjects(selected.id)}
          />
        ) : (
          <ProjectEmptyState title="No projects yet" subtitle="Create a project to start collecting datasets, versions, and training runs." />
        )}
      </div>
    </section>
  );
}

function ProjectDetails({
  onDeleted,
  onProjectChanged,
  onReload,
  project,
}: {
  onDeleted: () => void;
  onProjectChanged: (project: ProjectDetail) => void;
  onReload: () => void;
  project: ProjectDetail;
}) {
  const [activeTab, setActiveTab] = useState<ProjectTab>("overview");
  const splitTotals = project.datasets.reduce(
    (acc, dataset) => ({
      train: acc.train + dataset.splits.train,
      val: acc.val + dataset.splits.val,
      test: acc.test + dataset.splits.test,
    }),
    { test: 0, train: 0, val: 0 },
  );

  const stats = [
    { icon: Database, label: "Datasets", value: formatCount(project.dataset_count), detail: "Linked records" },
    { icon: Images, label: "Images", value: formatCount(project.image_count), detail: `${formatCount(project.video_count)} videos` },
    { icon: Tags, label: "Classes", value: formatCount(project.class_count), detail: "Indexed classes" },
    { icon: HardDrive, label: "Storage", value: formatBytes(project.storage_size_bytes), detail: "Approx. indexed size" },
  ];

  return (
    <Card className="min-h-0">
      <CardContent className="flex h-full min-h-0 flex-col p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-primary">
              <Folder className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="ui-title">{project.name}</h2>
                <Badge tone={project.status === "Active" ? "info" : "default"}>{project.status}</Badge>
              </div>
              <p className="ui-subtitle mt-2">{project.task}</p>
            </div>
          </div>
          <Button variant="secondary" className="h-8 gap-2" onClick={onReload}>
            <Activity className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-[length:var(--font-xs)] text-slate-500">
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Created: {new Date(project.created_at).toLocaleDateString()}
          </span>
          <span className="inline-flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Updated: {formatDateTime(project.updated_at)}
          </span>
          <span className="inline-flex items-center gap-2">
            <User className="h-4 w-4" /> Owner: {project.owner}
          </span>
        </div>

        <div className="mt-4 flex border-b border-slate-200 text-[length:var(--font-sm)] font-semibold text-slate-500">
          {projectTabs.map((tab) => (
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

        <div className="mt-3 min-h-0 flex-1 overflow-hidden">
          {activeTab === "overview" && <ProjectOverview project={project} splitTotals={splitTotals} stats={stats} />}
          {activeTab === "datasets" && <ProjectDatasetsTab onProjectChanged={onProjectChanged} project={project} />}
          {activeTab === "activity" && <ProjectActivityTab project={project} />}
          {activeTab === "settings" && <ProjectSettingsTab onDeleted={onDeleted} onProjectChanged={onProjectChanged} project={project} />}
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectOverview({
  project,
  splitTotals,
  stats,
}: {
  project: ProjectDetail;
  splitTotals: { test: number; train: number; val: number };
  stats: Array<{ detail: string; icon: typeof Database; label: string; value: string }>;
}) {
  const taskRows = Object.entries(
    project.datasets.reduce<Record<string, number>>((acc, dataset) => {
      acc[dataset.task] = (acc[dataset.task] ?? 0) + 1;
      return acc;
    }, {}),
  );

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_1fr] gap-3">
      <div className="grid gap-3 md:grid-cols-4">
        {stats.map((item) => (
          <StatCard detail={item.detail} icon={item.icon} key={item.label} label={item.label} value={item.value} />
        ))}
      </div>
      <div className="grid min-h-0 gap-3 lg:grid-cols-[1.2fr_0.8fr_0.9fr]">
        <Card className="min-h-0">
          <CardContent className="flex h-full min-h-0 flex-col p-4">
            <h3 className="ui-card-title mb-2">Description</h3>
            <p className="text-[length:var(--font-sm)] leading-5 text-slate-500">{project.description || "No description yet."}</p>
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-[length:var(--font-xs)]">
              <InfoRow label="Storage" value={project.storage_path || "not configured"} />
              <InfoRow label="Datasets" value={formatCount(project.dataset_count)} />
              <InfoRow label="Activity events" value={formatCount(project.activities.length)} />
            </div>
          </CardContent>
        </Card>
        <Card className="min-h-0">
          <CardContent className="p-4">
            <h3 className="ui-card-title mb-3">Split Distribution</h3>
            <ProjectSplitRows splitTotals={splitTotals} />
          </CardContent>
        </Card>
        <Card className="min-h-0">
          <CardContent className="p-4">
            <h3 className="ui-card-title mb-3">Task Distribution</h3>
            {taskRows.length ? (
              <div className="space-y-2">
                {taskRows.map(([task, count]) => (
                  <div className="grid grid-cols-[1fr_auto] gap-2 text-[length:var(--font-xs)]" key={task}>
                    <span className="truncate text-slate-600">{task}</span>
                    <span className="font-semibold text-slate-500">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <ProjectEmptyState compact title="No tasks" subtitle="Linked datasets will define task distribution." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProjectDatasetsTab({ onProjectChanged, project }: { onProjectChanged: (project: ProjectDetail) => void; project: ProjectDetail }) {
  const [allDatasets, setAllDatasets] = useState<DatasetItem[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getDatasets()
      .then(setAllDatasets)
      .catch((reason: Error) => setError(reason.message));
  }, [project.id]);

  const unlinkedDatasets = allDatasets.filter((dataset) => dataset.project_id !== project.id);
  const visibleDatasets = project.datasets.filter((dataset) => statusFilter === "All" || dataset.status === statusFilter);

  async function linkDataset() {
    const datasetId = Number(selectedDatasetId);
    if (!datasetId) return;
    await updateDataset(datasetId, { project_id: project.id });
    onProjectChanged(await getProject(project.id));
    setSelectedDatasetId("");
  }

  async function unlinkDataset(datasetId: number) {
    await updateDataset(datasetId, { project_id: null });
    onProjectChanged(await getProject(project.id));
  }

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_1fr] gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <select className="form-select w-[150px]" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
            <option>All</option>
            <option>Ready</option>
            <option>Draft</option>
            <option>Archived</option>
          </select>
          <select className="form-select w-[240px]" onChange={(event) => setSelectedDatasetId(event.target.value)} value={selectedDatasetId}>
            <option value="">Link existing dataset</option>
            {unlinkedDatasets.map((dataset) => (
              <option key={dataset.id} value={dataset.id}>
                {dataset.name} {dataset.version}
              </option>
            ))}
          </select>
          <Button className="h-8 gap-2" disabled={!selectedDatasetId} onClick={() => void linkDataset()}>
            <Link2 className="h-4 w-4" />
            Link
          </Button>
        </div>
        {error && <div className="text-[length:var(--font-xs)] text-rose-500">{error}</div>}
      </div>

      <div className="min-h-0 overflow-auto rounded-lg border border-slate-200">
        <div className="grid min-w-full grid-cols-[minmax(200px,1.5fr)_80px_92px_92px_minmax(130px,1fr)_92px_82px] border-b border-slate-200 bg-slate-50 px-3 py-2 text-[length:var(--font-xs)] font-semibold text-slate-500">
          <span>Name</span>
          <span>Version</span>
          <span>Images</span>
          <span>Classes</span>
          <span>Task</span>
          <span>Status</span>
          <span>Action</span>
        </div>
        {visibleDatasets.length ? (
          visibleDatasets.map((dataset) => (
            <div className="grid min-w-full grid-cols-[minmax(200px,1.5fr)_80px_92px_92px_minmax(130px,1fr)_92px_82px] items-center border-b border-slate-100 px-3 py-3 text-[length:var(--font-sm)] last:border-b-0" key={dataset.id}>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{dataset.name}</span>
                <span className="block truncate text-[length:var(--font-xs)] text-slate-500">{dataset.source_path || "no source"}</span>
              </span>
              <Badge>{dataset.version}</Badge>
              <span>{formatCount(dataset.stats.images)}</span>
              <span>{formatCount(dataset.stats.classes)}</span>
              <Badge tone={dataset.task.toLowerCase().includes("classification") ? "warning" : "info"}>{dataset.task}</Badge>
              <Badge tone={dataset.status === "Ready" ? "success" : "default"}>{dataset.status}</Badge>
              <Button variant="secondary" className="h-7 px-2 text-[length:var(--font-xs)]" onClick={() => void unlinkDataset(dataset.id)}>
                Unlink
              </Button>
            </div>
          ))
        ) : (
          <div className="p-3">
            <ProjectEmptyState compact title="No datasets" subtitle="Link existing datasets or create new datasets from the Datasets page." />
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectActivityTab({ project }: { project: ProjectDetail }) {
  return (
    <div className="h-full min-h-0 overflow-y-auto rounded-lg border border-slate-200 p-3">
      {project.activities.length ? (
        <div className="relative space-y-3 pl-5">
          <div className="absolute bottom-2 left-[7px] top-2 w-px bg-blue-100" />
          {project.activities.map((activity) => (
            <div className="relative" key={activity.id}>
              <span className="absolute -left-[18px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-blue-50" />
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge tone="info">{activity.event_type}</Badge>
                      <span className="text-[length:var(--font-sm)] font-semibold">{activity.title}</span>
                    </div>
                    <div className="mt-1 text-[length:var(--font-xs)] text-slate-500">{activity.dataset_name}</div>
                    {activity.description && <p className="mt-1 break-words text-[length:var(--font-xs)] leading-5 text-slate-500">{activity.description}</p>}
                  </div>
                  <div className="shrink-0 text-right text-[length:var(--font-xs)] text-slate-500">{formatDateTime(activity.created_at)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ProjectEmptyState title="No project activity" subtitle="Dataset imports, uploads, rescans and version changes will appear here." />
      )}
    </div>
  );
}

function ProjectSettingsTab({
  onDeleted,
  onProjectChanged,
  project,
}: {
  onDeleted: () => void;
  onProjectChanged: (project: ProjectDetail) => void;
  project: ProjectDetail;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [task, setTask] = useState(project.task);
  const [status, setStatus] = useState(project.status);
  const [owner, setOwner] = useState(project.owner);
  const [storagePath, setStoragePath] = useState(project.storage_path);
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    setName(project.name);
    setDescription(project.description);
    setTask(project.task);
    setStatus(project.status);
    setOwner(project.owner);
    setStoragePath(project.storage_path);
  }, [project]);

  async function save() {
    setIsBusy(true);
    setMessage(null);
    try {
      const updated = await updateProject(project.id, { description, name, owner, status, storage_path: storagePath, task });
      onProjectChanged(updated);
      setMessage("Project saved");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Save project failed");
    } finally {
      setIsBusy(false);
    }
  }

  async function openFolder() {
    setMessage(null);
    try {
      await openProjectFolder(project.id);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Open project folder failed");
    }
  }

  async function remove() {
    const confirmed = window.confirm(`Delete project ${project.name}? Managed datasets and copied workspace files will be removed from disk.`);
    if (!confirmed) return;
    setIsBusy(true);
    setMessage(null);
    try {
      await deleteProject(project.id);
      onDeleted();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Delete project failed");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="grid h-full min-h-0 gap-3 lg:grid-cols-[1fr_320px]">
      <Card className="min-h-0">
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Name">
              <input className="form-input" onChange={(event) => setName(event.target.value)} value={name} />
            </Field>
            <Field label="Owner">
              <input className="form-input" onChange={(event) => setOwner(event.target.value)} value={owner} />
            </Field>
            <Field label="Task">
              <input className="form-input" onChange={(event) => setTask(event.target.value)} value={task} />
            </Field>
            <Field label="Status">
              <select className="form-select" onChange={(event) => setStatus(event.target.value)} value={status}>
                <option>Active</option>
                <option>Paused</option>
                <option>Archived</option>
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Storage path">
                <input className="form-input" onChange={(event) => setStoragePath(event.target.value)} value={storagePath} />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Description">
                <textarea className="min-h-[90px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[length:var(--font-sm)] outline-none focus:border-primary" onChange={(event) => setDescription(event.target.value)} value={description} />
              </Field>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button className="h-8 gap-2" disabled={isBusy || !name.trim()} onClick={() => void save()}>
              <Save className="h-4 w-4" />
              Save
            </Button>
            <Button variant="secondary" className="h-8 gap-2" onClick={() => void openFolder()}>
              <FolderOpen className="h-4 w-4" />
              Open Folder
            </Button>
            <Button variant="secondary" className="h-8 gap-2 text-rose-500 hover:bg-rose-50" disabled={isBusy} onClick={() => void remove()}>
              <Trash2 className="h-4 w-4" />
              Delete Registry
            </Button>
            {message && <span className="text-[length:var(--font-xs)] text-slate-500">{message}</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-4 text-[length:var(--font-xs)]">
          <h3 className="ui-card-title">Project Registry</h3>
          <InfoRow label="Datasets" value={formatCount(project.dataset_count)} />
          <InfoRow label="Images" value={formatCount(project.image_count)} />
          <InfoRow label="Videos" value={formatCount(project.video_count)} />
          <InfoRow label="Classes" value={formatCount(project.class_count)} />
          <InfoRow label="Storage" value={formatBytes(project.storage_size_bytes)} />
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ detail, icon: Icon, label, value }: { detail: string; icon: typeof Database; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-3">
        <div className="summary-icon">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="ui-stat-value">{value}</div>
          <div className="ui-label mt-1">{label}</div>
          <div className="ui-meta mt-1 truncate">{detail}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectSplitRows({ splitTotals }: { splitTotals: { test: number; train: number; val: number } }) {
  const total = splitTotals.train + splitTotals.val + splitTotals.test;
  const rows = [
    { color: "bg-primary", label: "Train", value: splitTotals.train },
    { color: "bg-violet-500", label: "Validation", value: splitTotals.val },
    { color: "bg-emerald-500", label: "Test", value: splitTotals.test },
  ];
  return total ? (
    <div className="space-y-3">
      <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
        {rows.map((row) => (
          <div className={row.color} key={row.label} style={{ width: `${(row.value / total) * 100}%` }} />
        ))}
      </div>
      {rows.map((row) => (
        <div className="grid grid-cols-[1fr_auto] gap-2 text-[length:var(--font-xs)]" key={row.label}>
          <span className="flex items-center gap-2 text-slate-600">
            <span className={cn("h-2 w-2 rounded-full", row.color)} />
            {row.label}
          </span>
          <span className="font-semibold text-slate-500">
            {formatCount(row.value)} ({Math.round((row.value / total) * 100)}%)
          </span>
        </div>
      ))}
    </div>
  ) : (
    <ProjectEmptyState compact title="No split data" subtitle="Split distribution appears after datasets are linked." />
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="block">
      <span className="ui-label mb-1 block text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2">
      <span className="font-semibold text-slate-600">{label}</span>
      <span className="min-w-0 max-w-[220px] truncate text-right text-slate-500" title={value}>
        {value}
      </span>
    </div>
  );
}

function ProjectEmptyState({ compact, subtitle, title }: { compact?: boolean; subtitle: string; title: string }) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[220px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 text-center",
        compact && "min-h-[110px]",
      )}
    >
      <div className="max-w-[360px]">
        <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-primary">
          <Folder className="h-4 w-4" />
        </div>
        <div className="ui-card-title">{title}</div>
        <div className="mt-1 text-[length:var(--font-xs)] leading-5 text-slate-500">{subtitle}</div>
      </div>
    </div>
  );
}

function formatBytes(value: number) {
  if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
}
