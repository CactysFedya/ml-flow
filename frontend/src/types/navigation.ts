import {
  Activity,
  BarChart3,
  Boxes,
  Database,
  FlaskConical,
  FolderOpen,
  GitBranch,
  LayoutDashboard,
  Layers3,
  PenTool,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type AppPage =
  | "dashboard"
  | "projects"
  | "datasets"
  | "labeling"
  | "autolabel"
  | "versions"
  | "training"
  | "automl"
  | "experiments"
  | "pipelines"
  | "models"
  | "settings";

export type NavItem = {
  id: AppPage;
  label: string;
  icon: LucideIcon;
};

export const sidebarSections: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "WORKSPACE",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "projects", label: "Projects", icon: FolderOpen },
    ],
  },
  {
    label: "DATA",
    items: [
      { id: "datasets", label: "Datasets", icon: Database },
      { id: "labeling", label: "Labeling", icon: PenTool },
      { id: "autolabel", label: "AutoLabel", icon: Sparkles },
      { id: "versions", label: "Versions", icon: Layers3 },
    ],
  },
  {
    label: "TRAINING",
    items: [
      { id: "training", label: "Training", icon: Activity },
      { id: "automl", label: "AutoML", icon: FlaskConical },
      { id: "experiments", label: "Experiments", icon: BarChart3 },
    ],
  },
  {
    label: "PIPELINE",
    items: [
      { id: "pipelines", label: "Pipelines", icon: GitBranch },
      { id: "models", label: "Models", icon: Boxes },
    ],
  },
  {
    label: "SETTINGS",
    items: [{ id: "settings", label: "Settings", icon: Settings }],
  },
];
