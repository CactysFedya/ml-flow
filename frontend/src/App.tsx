import { useEffect, useMemo, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { WorkspaceShell } from "@/components/app/workspace-shell";
import type { WorkspaceHeaderContext } from "@/components/app/workspace-shell";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { LabelingPage } from "@/components/labeling/labeling-page";
import { queryClient } from "@/lib/queryClient";
import { DatasetsPage } from "@/components/workspace/datasets-page";
import { ProjectsPage } from "@/components/workspace/projects-page";
import {
  AutoLabelPage,
  AutoMLPage,
  ExperimentsPage,
  ModelsPage,
  PipelinesPage,
  SettingsPage,
  TrainingPage,
  VersionsPage,
} from "@/components/workspace/showcase-pages";
import type { AppPage } from "@/types/navigation";
import type { DatasetItem, ProjectSummary } from "@/types/workspace";
import { NotificationProvider } from "@/context/NotificationContext";
import { ModalProvider } from "@/context/ModalContext";
import { ToastContainer } from "@/components/ui/toast-container";
import { ModalRenderer } from "@/components/ui/modal-renderer";
import { useDatasets, useProjects } from "@/hooks";

function AppContent() {
  const [page, setPage] = useState<AppPage>("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const { data: projects = [] } = useProjects();
  const { data: datasets = [] } = useDatasets();

  useEffect(() => {
    if (!projects.length) {
      if (!datasets.length) {
        setSelectedProjectId(null);
      }
      return;
    }

    if (selectedProjectId == null || !projects.some((item) => item.id === selectedProjectId)) {
      setSelectedProjectId(projects[0].id);
    }
  }, [datasets.length, projects, selectedProjectId]);

  useEffect(() => {
    if (!datasets.length) {
      setSelectedDatasetId(null);
      return;
    }

    const scopedDatasets =
      selectedProjectId != null ? datasets.filter((item) => item.project_id === selectedProjectId) : datasets;
    if (!scopedDatasets.length) {
      setSelectedDatasetId(null);
      return;
    }

    if (selectedDatasetId == null || !scopedDatasets.some((item) => item.id === selectedDatasetId)) {
      setSelectedDatasetId(scopedDatasets[0].id);
    }
  }, [datasets, selectedDatasetId, selectedProjectId]);

  const selectedProject = useMemo(
    () => projects.find((item) => item.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );
  const scopedDatasets = useMemo(
    () => (selectedProjectId != null ? datasets.filter((item) => item.project_id === selectedProjectId) : datasets),
    [datasets, selectedProjectId],
  );
  const selectedDataset = useMemo(
    () => scopedDatasets.find((item) => item.id === selectedDatasetId) ?? datasets.find((item) => item.id === selectedDatasetId) ?? null,
    [datasets, scopedDatasets, selectedDatasetId],
  );
  const header = useMemo(
    () =>
      buildPageHeader(page, {
        datasetOptions: scopedDatasets.map((item) => ({ id: item.id, label: `${item.name} ${item.version}` })),
        datasetStatus: selectedDataset?.status ?? selectedProject?.status ?? "Idle",
        onDatasetChange: setSelectedDatasetId,
        onProjectChange: setSelectedProjectId,
        projectOptions: projects.map((item) => ({ id: item.id, label: item.name })),
        selectedDataset,
        selectedProject,
      }),
    [page, projects, scopedDatasets, selectedDataset, selectedProject],
  );

  return (
    <WorkspaceShell activePage={page} header={header} onNavigate={setPage}>
      {renderPage(page, {
        onSelectDataset: (datasetId, projectId) => {
          setSelectedDatasetId(datasetId);
          if (projectId != null) {
            setSelectedProjectId(projectId);
          }
        },
        selectedDatasetId,
        selectedProjectId,
      })}
    </WorkspaceShell>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ModalProvider>
        <NotificationProvider>
          <AppContent />
          <ToastContainer />
          <ModalRenderer />
        </NotificationProvider>
      </ModalProvider>
    </QueryClientProvider>
  );
}

function renderPage(
  page: AppPage,
  context: {
    onSelectDataset: (datasetId: number, projectId: number | null) => void;
    selectedDatasetId: number | null;
    selectedProjectId: number | null;
  },
) {
  switch (page) {
    case "dashboard":
      return <DashboardPage selectedDatasetId={context.selectedDatasetId} selectedProjectId={context.selectedProjectId} />;
    case "projects":
      return <ProjectsPage />;
    case "datasets":
      return <DatasetsPage />;
    case "labeling":
      return <LabelingPage onSelectDataset={context.onSelectDataset} selectedDatasetId={context.selectedDatasetId} />;
    case "autolabel":
      return <AutoLabelPage />;
    case "training":
      return <TrainingPage />;
    case "automl":
      return <AutoMLPage />;
    case "experiments":
      return <ExperimentsPage />;
    case "models":
      return <ModelsPage />;
    case "versions":
      return <VersionsPage />;
    case "pipelines":
      return <PipelinesPage />;
    case "settings":
      return <SettingsPage />;
    default:
      return <DashboardPage />;
  }
}

function buildPageHeader(
  page: AppPage,
  context: {
    datasetOptions: { id: number; label: string }[];
    datasetStatus: string;
    onDatasetChange: (id: number | null) => void;
    onProjectChange: (id: number | null) => void;
    projectOptions: { id: number; label: string }[];
    selectedDataset: DatasetItem | null;
    selectedProject: ProjectSummary | null;
  },
): WorkspaceHeaderContext {
  const selectedProjectName = context.selectedProject?.name ?? "No project";
  const selectedDatasetName = context.selectedDataset ? `${context.selectedDataset.name} ${context.selectedDataset.version}` : "No dataset";
  const baseHeader: WorkspaceHeaderContext = {
    datasetId: context.selectedDataset?.id ?? null,
    datasetLabel: page === "labeling" ? "Dataset Context" : "Dataset",
    datasetName: page === "settings" ? "Workspace Settings" : selectedDatasetName,
    datasetOptions: page === "settings" ? undefined : context.datasetOptions,
    datasetStatus: context.datasetStatus,
    onDatasetChange: page === "settings" ? undefined : context.onDatasetChange,
    onProjectChange: context.onProjectChange,
    projectId: context.selectedProject?.id ?? null,
    projectName: selectedProjectName,
    projectOptions: context.projectOptions,
  };

  switch (page) {
    case "dashboard":
      return { ...baseHeader, showNewButton: true };
    case "training":
      return { ...baseHeader, showNewButton: true };
    case "projects":
      return { ...baseHeader, datasetLabel: "Dataset" };
    case "settings":
      return { ...baseHeader, datasetLabel: "Workspace", datasetStatus: context.selectedProject?.status ?? "Ready" };
    default:
      return baseHeader;
  }
}
