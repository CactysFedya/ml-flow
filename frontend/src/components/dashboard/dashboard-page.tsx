import { useMemo } from "react";
import {
  Activity,
  BarChart3,
  Boxes,
  Database,
  Folder,
  FlaskConical,
  Images,
  Play,
  PlusCircle,
  Tags,
  Upload,
  Workflow,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useDashboard } from "@/hooks/useDashboard";
import type { DashboardPayload, QuickActionItem } from "@/types/dashboard";

const summaryIcons = {
  datasets: Database,
  images: Images,
  classes: Tags,
  models: Boxes,
  experiments: FlaskConical,
  "best-map": BarChart3,
  "training-jobs": Activity,
} as const;

const chartHasData = (points: unknown[]) => points.length > 0;

export function DashboardPage({ selectedDatasetId, selectedProjectId }: { selectedDatasetId?: number | null; selectedProjectId?: number | null } = {}) {
  const { data: dashboard, isLoading, error } = useDashboard({
    projectId: selectedProjectId ?? null,
    datasetId: selectedDatasetId ?? null,
  });

  const totalClasses = useMemo(() => dashboard?.class_total ?? 0, [dashboard]);

  if (error) {
    return (
      <section className="ui-page-centered flex h-full w-full items-center justify-center">
        <Card className="max-w-xl">
          <CardContent className="space-y-3 p-8">
            <h1 className="text-2xl font-bold tracking-tight">Dashboard failed to load</h1>
            <p className="text-sm text-slate-500">{error instanceof Error ? error.message : "Unknown error"}</p>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (isLoading || !dashboard) {
    return (
      <section className="ui-page-centered flex h-full w-full items-center justify-center">
        <div className="text-sm font-medium text-slate-500">Loading MLForge dashboard...</div>
      </section>
    );
  }

  return (
    <section className="ui-page ui-dashboard-grid min-h-0 content-start">
      <div className="shrink-0">
        <h1 className="ui-title">Dashboard</h1>
        <p className="ui-subtitle mt-1">Overview for the selected project and dataset</p>
      </div>

      <div className="ui-kpi-grid min-h-0">
        {dashboard.cards.map((card) => {
          const Icon = summaryIcons[card.id as keyof typeof summaryIcons] ?? Database;
          return (
            <Card key={card.id} className="min-h-0">
              <CardContent className="grid h-full min-h-0 grid-cols-[auto_1fr] gap-x-2 gap-y-0 px-3 py-2">
                <div className="summary-icon h-8 w-8">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[length:var(--font-2xs)] text-slate-500">{card.title}</div>
                  <div className="mt-1 text-[length:var(--font-xl)] font-bold leading-none tracking-[-0.04em] text-slate-900">{card.value}</div>
                  <div className="mt-1 truncate text-[length:var(--font-2xs)] text-slate-500">{card.subtitle}</div>
                  <button className="mt-1.5 text-[length:var(--font-2xs)] font-semibold text-primary" type="button">
                    {card.action_label}
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="ui-two-col min-h-0">
        <Card className="min-h-0 overflow-hidden">
          <CardContent className="ui-panel-lg flex h-full min-h-0 flex-col p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="ui-section-title">Recent Experiments</h2>
              <button className="text-[length:var(--font-sm)] font-semibold text-primary" type="button">
                View all
              </button>
            </div>
            <div className="min-h-0 overflow-auto">
              {dashboard.experiments.length ? (
                <table className="ui-table">
                  <thead>
                    <tr className="border-b border-slate-200">
                      {["Run", "Model", "Dataset", "mAP@0.5", "Status", "Time"].map((header) => (
                        <th key={header} className="first:pl-0 last:pr-0">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.experiments.map((row) => (
                      <tr key={row.run} className="border-b border-slate-100 last:border-b-0">
                        <td className="first:pl-0">
                          <div className="flex items-center gap-2">
                            <span className={cn("h-2 w-2 rounded-full", row.status === "Failed" ? "bg-rose-500" : "bg-emerald-500")} />
                            <span className="text-[length:var(--font-sm)] font-semibold text-primary">{row.run}</span>
                          </div>
                        </td>
                        <td className="text-slate-700">{row.model}</td>
                        <td className="text-slate-700">{row.dataset}</td>
                        <td className="text-slate-700">{row.metric.toFixed(2)}</td>
                        <td>
                          <Badge tone={row.status === "Failed" ? "danger" : "success"}>{row.status}</Badge>
                        </td>
                        <td className="text-slate-500 last:pr-0">{row.time_label}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <DashboardEmptyState title="No experiments yet" subtitle="Training and evaluation runs will appear here." />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-0 overflow-hidden">
          <CardContent className="ui-panel-lg flex h-full min-h-0 flex-col gap-1.5 p-3">
            <div className="mb-0 flex items-center justify-between">
              <h2 className="ui-section-title">Training Overview</h2>
              <button className="text-[length:var(--font-sm)] font-semibold text-primary" type="button">
                All Jobs
              </button>
            </div>

            {dashboard.training_overview.length ? (
              dashboard.training_overview.map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200/70 p-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[length:var(--font-sm)] font-semibold text-slate-900">{item.title}</div>
                      <div className="mt-1 flex gap-2 text-[length:var(--font-xs)] text-slate-500">
                        <span>{item.run}</span>
                        <span>{item.progress_label}</span>
                      </div>
                    </div>
                    <div className="text-right text-[length:var(--font-xs)] text-slate-500">
                      <div>{item.eta}</div>
                      <div>{item.eta_label}</div>
                    </div>
                  </div>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${item.progress}%` }} />
                  </div>
                  <div className="mt-1 text-right text-[length:var(--font-2xs)] text-slate-500">{item.progress}%</div>
                </div>
              ))
            ) : (
              <DashboardEmptyState title="No training jobs" subtitle="Active training jobs will appear here." compact />
            )}

            {dashboard.resource_usage.length ? (
              <div className="grid min-h-[58px] gap-2 md:grid-cols-3">
                {dashboard.resource_usage.map((item) => (
                  <div key={item.label} className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-1.5">
                    <div className="text-[length:var(--font-2xs)] text-slate-500">{item.label}</div>
                    <div className="mt-1 text-[length:var(--font-2xs)] font-semibold text-slate-900">{item.value}</div>
                    <div className="mt-2 h-7">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={item.points}>
                          <defs>
                            <linearGradient id={`spark-${item.label}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={item.color} stopOpacity={0.35} />
                              <stop offset="100%" stopColor={item.color} stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <Area dataKey="value" fill={`url(#spark-${item.label})`} stroke={item.color} strokeWidth={2} type="monotone" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="ui-three-col min-h-0">
        <Card className="min-h-0 overflow-hidden">
          <CardContent className="ui-panel-md flex h-full min-h-0 flex-col p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="ui-section-title">Metrics</h2>
              <div className="flex items-center gap-2">
                <div className="ui-chip">mAP@0.5</div>
                <button className="ui-chip bg-blue-50 text-primary" type="button">
                  Epoch
                </button>
                <button className="ui-chip text-slate-500" type="button">
                  Step
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 pt-1">
              {chartHasData(dashboard.metric_points) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dashboard.metric_points}>
                    <CartesianGrid stroke="#E9EEF5" vertical={false} />
                    <XAxis axisLine={false} dataKey="epoch" tick={{ fill: "#98A2B3", fontSize: 10 }} tickLine={false} />
                    <YAxis axisLine={false} tick={{ fill: "#98A2B3", fontSize: 10 }} tickLine={false} />
                    <Tooltip />
                    <Line dataKey="map50" dot={{ r: 3 }} stroke="#2F6DF6" strokeWidth={2.5} type="monotone" />
                    <Line dataKey="map5095" dot={{ r: 3 }} stroke="#9B6CFF" strokeWidth={2.5} type="monotone" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <DashboardEmptyState title="No metrics yet" subtitle="Metrics will appear after a training run." />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-0 overflow-hidden">
          <CardContent className="ui-panel-md flex h-full min-h-0 flex-col p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="ui-section-title">Class Distribution</h2>
              <button className="text-[length:var(--font-sm)] font-semibold text-primary" type="button">
                View full report
              </button>
            </div>

            {dashboard.class_distribution.length ? (
              <div className="grid min-h-0 flex-1 items-center gap-3 xl:grid-cols-[120px_1fr]">
                <div className="h-[118px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={dashboard.class_distribution} dataKey="value" innerRadius={40} nameKey="name" outerRadius={58} paddingAngle={2} strokeWidth={0}>
                        {dashboard.class_distribution.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="min-w-0">
                  <div className="mb-2 text-center">
                    <div className="text-[length:var(--font-stat)] font-bold tracking-[-0.05em]">{totalClasses}</div>
                    <div className="text-[length:var(--font-2xs)] text-slate-500">Classes</div>
                  </div>
                  <div className="space-y-1">
                    {dashboard.class_distribution.map((item) => (
                      <div key={item.name} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-[length:var(--font-2xs)]">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="truncate text-slate-600">{item.name}</span>
                        <span className="font-medium text-slate-500">{item.value.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <DashboardEmptyState title="No classes yet" subtitle="Class distribution will appear after you add classes or labels." />
            )}
          </CardContent>
        </Card>

        <Card className="min-h-0 overflow-hidden">
          <CardContent className="ui-panel-md flex h-full min-h-0 flex-col p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="ui-section-title">Recent Datasets</h2>
              <button className="text-[length:var(--font-sm)] font-semibold text-primary" type="button">
                View all
              </button>
            </div>
            <div className="min-h-0 space-y-2 overflow-auto">
              {dashboard.recent_datasets.length ? (
                dashboard.recent_datasets.map((item) => (
                  <div key={item.name} className="flex items-start gap-2 rounded-xl border border-slate-200/70 p-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-primary">
                      <Folder className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[length:var(--font-sm)] font-semibold">{item.name}</div>
                      <div className="mt-1 text-[length:var(--font-2xs)] text-slate-500">{item.updated_label}</div>
                    </div>
                    <div className="rounded-full bg-slate-100 px-2 py-0.5 text-[length:var(--font-2xs)] font-semibold text-slate-500">{item.version}</div>
                  </div>
                ))
              ) : (
                <DashboardEmptyState title="No datasets yet" subtitle="Create or import a dataset to start." compact />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="ui-bottom-split min-h-0">
        <Card className="min-h-0 overflow-hidden">
          <CardContent className="ui-panel-sm flex h-full min-h-0 flex-col p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="ui-section-title">Activity / Logs</h2>
              <Button variant="secondary" className="ui-control-sm rounded-md">
                Clear
              </Button>
            </div>

            <div className="min-h-0 space-y-1.5 overflow-auto">
              {dashboard.activity.length ? (
                dashboard.activity.map((item) => (
                  <div key={`${item.time_label}-${item.message}`} className="grid grid-cols-[auto_auto_1fr] items-center gap-2 rounded-lg bg-slate-50/70 px-2 py-1.5">
                    <span className="text-[length:var(--font-2xs)] text-slate-500">{item.time_label}</span>
                    <Badge tone={item.level === "WARNING" ? "warning" : item.level === "ERROR" ? "danger" : "info"}>{item.level}</Badge>
                    <span className="text-[length:var(--font-2xs)] text-slate-600">{item.message}</span>
                  </div>
                ))
              ) : (
                <DashboardEmptyState title="No activity yet" subtitle="Dataset and training events will appear here." compact />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-0 overflow-hidden">
          <CardContent className="ui-panel-sm flex h-full min-h-0 flex-col p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="ui-section-title">Quick Actions</h2>
            </div>
            <div className="grid min-h-0 auto-rows-[52px] content-start gap-2 md:grid-cols-2">
              {dashboard.quick_actions.map((action) => (
                <QuickAction key={action.id} action={action} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function DashboardEmptyState({ compact, subtitle, title }: { compact?: boolean; subtitle: string; title: string }) {
  return (
    <div
      className={cn(
        "ui-empty-state flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 text-center",
        compact && "min-h-[clamp(74px,10vh,96px)]",
      )}
    >
      <div>
        <div className="text-[length:var(--font-sm)] font-semibold text-slate-800">{title}</div>
        <div className="mt-1 text-[length:var(--font-2xs)] leading-4 text-slate-500">{subtitle}</div>
      </div>
    </div>
  );
}

function QuickAction({ action }: { action: QuickActionItem }) {
  const iconMap = {
    upload: Upload,
    play: Play,
    flask: PlusCircle,
    workflow: Workflow,
  } as const;

  const Icon = iconMap[action.icon as keyof typeof iconMap] ?? PlusCircle;

  return (
    <button className="flex min-h-[clamp(46px,4vw,54px)] items-center gap-2 rounded-xl border border-slate-200/70 bg-white p-2 text-left transition-colors hover:bg-slate-50" type="button">
      <div className="flex h-[clamp(28px,2vw,32px)] w-[clamp(28px,2vw,32px)] items-center justify-center rounded-lg bg-blue-50 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-[length:var(--font-xs)] font-semibold">{action.title}</div>
        <div className="mt-0.5 text-[length:var(--font-2xs)] text-slate-500">{action.subtitle}</div>
      </div>
    </button>
  );
}
