import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useContext } from "react";
import { useUrl } from "../helpers/useUrl";
import { WithProjects, ProjectsContext } from "../helpers/ProjectsContext";
import { ProjectResourceList } from "../helpers/ProjectResourceList";
import { usePostHogClient } from "../helpers/usePostHogClient";
import ErrorHandler from "./error-handler";

type Dashboard = {
  id: number;
  name: string;
  description: string;
  pinned: boolean;
  is_shared: boolean;
  deleted: boolean;
  created_at: string;
  created_by?: {
    email?: string;
  };
};

type RecordValue = Record<string, unknown>;

type DashboardMetric = {
  id: string;
  title: string;
  summary?: string;
  subtitle?: string;
  resultMarkdown?: string;
  type?: string;
  status?: string;
  url?: string;
};

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim();
}

function formatValue(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return new Intl.NumberFormat().format(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return undefined;
}

function latestSeriesValue(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;

  for (const point of [...value].reverse()) {
    if (Array.isArray(point)) {
      const latest = formatValue(point.at(-1));
      if (latest) return latest;
    }
    const formatted = formatValue(point);
    if (formatted) return formatted;
  }
}

function resultTable(value: unknown): Pick<DashboardMetric, "summary" | "subtitle" | "resultMarkdown"> {
  if (typeof value !== "string" || !value.includes("|")) return {};

  const rows = value
    .split("\n")
    .map((row) => row.split("|").map((cell) => cell.trim()))
    .filter((row) => row.length > 1 && row.some(Boolean));
  if (rows.length < 2) return {};

  const dataRows = rows.slice(1);
  const markdown = [
    `## Results`,
    "",
    `| ${rows[0].join(" | ")} |`,
    `| ${rows[0].map(() => "---").join(" | ")} |`,
    ...dataRows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");

  if (dataRows.length === 1) {
    const row = dataRows[0];
    return {
      summary: formatValue(row.at(-1)),
      subtitle: firstString(row[0]),
      resultMarkdown: markdown,
    };
  }

  return { summary: `${dataRows.length} rows`, subtitle: "Multiple result rows", resultMarkdown: markdown };
}

function metricSummary(metric: RecordValue, insight: RecordValue): string | undefined {
  for (const source of [metric, insight]) {
    for (const key of ["current_value", "aggregated_value", "value", "count", "total"]) {
      const summary = formatValue(source[key]);
      if (summary) return summary;
    }

    const result = source.result;
    if (isRecord(result)) {
      for (const key of ["current_value", "aggregated_value", "value", "count", "total"]) {
        const summary = formatValue(result[key]);
        if (summary) return summary;
      }
      const series = latestSeriesValue(result.data);
      if (series) return series;
    }
  }
}

function dashboardMetrics(data: unknown, dashboardUrl: string): DashboardMetric[] {
  const response = isRecord(data) ? data : {};
  const items = Array.isArray(data)
    ? data
    : Array.isArray(response.results)
      ? response.results
      : Array.isArray(response.insights)
        ? response.insights
        : [];

  return items.map((item, index) => {
    const metric = isRecord(item) ? item : {};
    const insight = isRecord(metric.insight) ? metric.insight : metric;
    const query = isRecord(insight.query) ? insight.query : {};
    const shortId = firstString(insight.short_id, metric.short_id);
    const insightId = firstString(insight.id, metric.insight_id, metric.id);
    const type = firstString(
      insight.type,
      metric.type,
      query.kind,
      isRecord(insight.filters) ? insight.filters.insight : undefined,
    );
    const status = firstString(metric.status, insight.status, metric.last_refresh, metric.last_calculated_at);
    const table = resultTable(insight.result ?? metric.result);

    return {
      id: `${shortId ?? insightId ?? index}`,
      title: firstString(metric.name, insight.name, metric.title, insight.title) ?? `Dashboard item ${index + 1}`,
      summary: table.summary ?? metricSummary(metric, insight),
      subtitle: table.subtitle,
      resultMarkdown: table.resultMarkdown,
      type,
      status,
      url: shortId ? `${dashboardUrl.replace(/dashboard\/.*$/, "")}insight/${shortId}` : undefined,
    };
  });
}

function DashboardContents({ dashboard }: { dashboard: Dashboard }) {
  const { selectedId } = useContext(ProjectsContext);
  const dashboardUrl = useUrl(`dashboard/${dashboard.id}`);
  const { data, isLoading, error } = usePostHogClient<unknown>(
    selectedId ? `projects/${selectedId}/dashboards/${dashboard.id}/run_insights/?refresh=force_cache` : "",
    { execute: Boolean(selectedId) },
  );
  const metrics = dashboardMetrics(data, dashboardUrl);

  return (
    <ErrorHandler error={error}>
      <List isLoading={isLoading} searchBarPlaceholder="Search dashboard metrics..." navigationTitle={dashboard.name}>
        {data && metrics.length > 0 ? (
          <List.Section title={`${dashboard.name} (${metrics.length})`}>
            {metrics.map((metric) => (
              <List.Item
                key={metric.id}
                icon={Icon.BarChart}
                title={metric.title}
                subtitle={metric.subtitle ?? (metric.summary ? `Current: ${metric.summary}` : undefined)}
                accessories={[metric.type, metric.status]
                  .filter((text): text is string => Boolean(text))
                  .map((text) => ({ text }))}
                detail={
                  <List.Item.Detail
                    markdown={metric.resultMarkdown}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Dashboard" text={dashboard.name} />
                        {metric.summary && (
                          <List.Item.Detail.Metadata.Label title="Current Value" text={metric.summary} />
                        )}
                        {metric.type && <List.Item.Detail.Metadata.Label title="Type" text={metric.type} />}
                        {metric.status && <List.Item.Detail.Metadata.Label title="Status" text={metric.status} />}
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={<MetricActions metric={metric} dashboardUrl={dashboardUrl} />}
              />
            ))}
          </List.Section>
        ) : null}
        {data && metrics.length === 0 ? (
          <List.EmptyView title="No dashboard items" description="This dashboard has no insights to show." />
        ) : null}
      </List>
    </ErrorHandler>
  );
}

function MetricActions({ metric, dashboardUrl }: { metric: DashboardMetric; dashboardUrl: string }) {
  const url = metric.url ?? dashboardUrl;
  return (
    <ActionPanel title={metric.title}>
      <ActionPanel.Section>
        <Action.OpenInBrowser url={url} title={metric.url ? "Open Insight in PostHog" : "Open Dashboard in PostHog"} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function Dashboards() {
  return (
    <ProjectResourceList<Dashboard> endpoint="dashboards" searchBarPlaceholder="Search dashboards..." isShowingDetail>
      {(dashboards) => dashboards.map((dashboard) => <ResultsListSection key={dashboard.id} dashboard={dashboard} />)}
    </ProjectResourceList>
  );
}

const ResultsListSection = ({ dashboard }: { dashboard: Dashboard }) => {
  const appUrl = useUrl(`dashboard/${dashboard.id}`);

  return (
    <List.Item
      key={dashboard.id}
      title={dashboard.name}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Name" text={dashboard.name} />
              <List.Item.Detail.Metadata.Separator />
              {dashboard.description && (
                <>
                  <List.Item.Detail.Metadata.Label title="Description" text={dashboard.description} />
                  <List.Item.Detail.Metadata.Separator />
                </>
              )}
              <List.Item.Detail.Metadata.Label title="Pinned" text={dashboard.pinned.toString()} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Shared" text={dashboard.is_shared.toString()} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Created At" text={dashboard.created_at} />
              <List.Item.Detail.Metadata.Separator />
              {dashboard.created_by?.email && (
                <>
                  <List.Item.Detail.Metadata.Label title="Created By" text={dashboard.created_by.email} />
                  <List.Item.Detail.Metadata.Separator />
                </>
              )}
              <List.Item.Detail.Metadata.Label title="Deleted" text={dashboard.deleted.toString()} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel title={dashboard.name}>
          <Action.Push
            title="Show Dashboard Metrics"
            icon={Icon.BarChart}
            target={<DashboardContents dashboard={dashboard} />}
          />
          <ActionPanel.Section>
            <Action.OpenInBrowser url={appUrl} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy URL"
              content={appUrl}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

export default function Command() {
  return (
    <WithProjects>
      <Dashboards />
    </WithProjects>
  );
}
