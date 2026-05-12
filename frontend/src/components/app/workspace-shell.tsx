import type { ReactNode } from "react";
import {
  ChevronDown,
  HelpCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { sidebarSections } from "@/types/navigation";
import type { AppPage } from "@/types/navigation";

export type WorkspaceHeaderOption = {
  id: number;
  label: string;
};

export type WorkspaceHeaderContext = {
  datasetId?: number | null;
  datasetLabel?: string;
  datasetName: string;
  datasetOptions?: WorkspaceHeaderOption[];
  datasetStatus?: string;
  onDatasetChange?: (id: number | null) => void;
  onProjectChange?: (id: number | null) => void;
  projectId?: number | null;
  projectName: string;
  projectOptions?: WorkspaceHeaderOption[];
  showNewButton?: boolean;
  showSearch?: boolean;
};

type WorkspaceShellProps = {
  activePage: AppPage;
  children: ReactNode;
  header: WorkspaceHeaderContext;
  onNavigate: (page: AppPage) => void;
};

export function WorkspaceShell({ activePage, children, header, onNavigate }: WorkspaceShellProps) {
  return (
    <div className="h-[100dvh] min-h-[100dvh] overflow-hidden bg-background">
      <div className="grid h-full min-h-0 w-full overflow-hidden bg-white" style={{ gridTemplateColumns: "var(--shell-sidebar) minmax(0, 1fr)" }}>
        <aside className="flex min-h-0 flex-col border-r border-slate-200/80 bg-gradient-to-b from-white via-white to-slate-50" style={{ padding: "var(--shell-pad-sm)" }}>
          <div className="mb-[calc(var(--page-gap)*1.1)] flex items-center gap-2.5 px-2">
            <div className="flex h-[clamp(32px,2.2vw,38px)] w-[clamp(32px,2.2vw,38px)] items-center justify-center rounded-[var(--panel-radius-sm)] bg-primary text-[length:var(--font-sm)] font-extrabold text-white shadow-[0_8px_16px_rgba(47,109,246,0.16)]">
              M
            </div>
            <div>
              <div className="text-[length:var(--font-xl)] font-extrabold tracking-[-0.05em] text-primary">MLForge</div>
              <div className="text-[length:var(--font-2xs)] text-slate-400">Local ML Workspace</div>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-auto pr-1">
            {sidebarSections.map((section) => (
              <div key={section.label}>
                <div className="mb-1 px-2 text-[length:var(--font-2xs)] font-semibold tracking-[0.16em] text-slate-400">
                  {section.label}
                </div>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <button
                      key={item.id}
                      className={cn(
                        "flex min-h-[var(--control-h)] w-full items-center gap-2.5 rounded-[var(--panel-radius)] border px-[var(--control-px)] text-left text-[length:var(--font-sm)] font-medium transition-colors",
                        activePage === item.id
                          ? "sidebar-item-active border-blue-200/80 text-primary shadow-[inset_0_0_0_1px_rgba(191,219,254,0.55)]"
                          : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900",
                      )}
                      onClick={() => onNavigate(item.id)}
                      type="button"
                    >
                      <item.icon className={cn("h-4 w-4", activePage === item.id ? "opacity-100" : "opacity-80")} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="flex min-w-0 min-h-0 flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-slate-200/80" style={{ minHeight: "var(--shell-header-h)", paddingInline: "var(--shell-pad)" }}>
            <div className="flex min-w-0 items-center gap-0">
              <TopSelect
                label="Project"
                onChange={header.onProjectChange}
                options={header.projectOptions}
                selectedId={header.projectId}
                value={header.projectName}
              />
              <TopSelect
                label={header.datasetLabel ?? "Dataset"}
                onChange={header.onDatasetChange}
                options={header.datasetOptions}
                selectedId={header.datasetId}
                value={header.datasetName}
              />
              {header.datasetStatus ? (
                <div className="ml-3 inline-flex items-center gap-1.5 whitespace-nowrap text-[length:var(--font-sm)] font-medium text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(34,197,94,0.12)]" />
                  {header.datasetStatus}
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              {header.showNewButton ? (
                <button
                  className="inline-flex items-center justify-center bg-primary text-[length:var(--font-sm)] font-semibold text-white shadow-[0_10px_20px_rgba(47,109,246,0.18)] transition-colors hover:bg-[#245fe4]"
                  style={{ height: "var(--control-h)", borderRadius: "var(--panel-radius)", paddingInline: "clamp(14px,1vw,18px)" }}
                  type="button"
                >
                  + New
                </button>
              ) : null}
              <button
                className="inline-flex h-[var(--control-h)] items-center gap-1.5 rounded-[var(--panel-radius-sm)] px-2.5 text-[length:var(--font-sm)] font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                type="button"
              >
                <HelpCircle className="h-4 w-4" />
                Help
              </button>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-hidden bg-white" style={{ padding: "var(--page-inline)" }}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function TopSelect({
  label,
  onChange,
  options,
  selectedId,
  value,
}: {
  label: string;
  onChange?: (id: number | null) => void;
  options?: WorkspaceHeaderOption[];
  selectedId?: number | null;
  value: string;
}) {
  const hasOptions = Boolean(options?.length && onChange);

  return (
    <div className="flex min-w-[clamp(124px,10vw,164px)] items-center gap-2 border-r border-slate-200/80 px-3 py-1 text-left last:border-r-0">
      <span className="shrink-0 text-[length:var(--font-xs)] font-medium text-slate-400">{label}</span>
      {hasOptions ? (
        <div className="relative min-w-0 flex-1">
          <select
            className="h-[26px] w-full appearance-none bg-transparent pr-5 text-[length:var(--font-sm)] font-semibold text-slate-900 outline-none"
            onChange={(event) => onChange?.(event.target.value ? Number(event.target.value) : null)}
            value={selectedId != null ? String(selectedId) : ""}
          >
            {selectedId == null ? <option value="">{value}</option> : null}
            {options?.map((option) => (
              <option key={option.id} value={String(option.id)}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
        </div>
      ) : (
        <>
          <span className="truncate text-[length:var(--font-sm)] font-semibold text-slate-900">{value}</span>
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </>
      )}
    </div>
  );
}
