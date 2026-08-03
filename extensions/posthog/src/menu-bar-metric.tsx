import { Icon, LaunchType, MenuBarExtra, open, launchCommand, openExtensionPreferences } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { dashboardMetrics } from "./dashboards";
import { usePostHogClient } from "../helpers/usePostHogClient";
import {
  getMenuBarMetricConfig,
  getMenuBarMetricSnapshot,
  setMenuBarMetricSnapshot,
  type MenuBarMetricConfig,
} from "../helpers/menuBarMetric";

function relativeTime(value: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}

export default function Command() {
  const [config] = useState<MenuBarMetricConfig | undefined>(getMenuBarMetricConfig);
  const [snapshot, setSnapshot] = useState(() => getMenuBarMetricSnapshot(config?.metricId));
  const path = config
    ? `projects/${config.projectId}/dashboards/${config.dashboardId}/run_insights/?refresh=force_cache`
    : "";
  const { data, isLoading, error, revalidate } = usePostHogClient<unknown>(path, { execute: Boolean(config) });
  const metric = useMemo(
    () =>
      config && data
        ? dashboardMetrics(data, config.dashboardUrl).find((item) => item.id === config.metricId)
        : undefined,
    [config, data],
  );

  useEffect(() => {
    if (!config || !metric?.summary) return;
    setMenuBarMetricSnapshot(config.metricId, metric.summary);
    setSnapshot(getMenuBarMetricSnapshot(config.metricId));
  }, [config, metric?.summary]);

  const displayValue = metric?.summary ?? snapshot?.displayValue;
  const stale = Boolean(error && displayValue);
  const title = displayValue ? `${displayValue}${stale ? " · stale" : ""}` : undefined;
  const refreshedAt = snapshot?.observedAt ? relativeTime(snapshot.observedAt) : undefined;

  return (
    <MenuBarExtra
      icon={Icon.BarChart}
      title={title}
      isLoading={isLoading}
      tooltip={config ? `${config.metricName}${displayValue ? ` — ${displayValue}` : ""}` : "Set up a PostHog metric"}
    >
      {config ? (
        <>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title={config.metricName}
              subtitle={displayValue ?? (isLoading ? "Loading…" : "No value returned")}
            />
            {config.projectName ? <MenuBarExtra.Item title="Project" subtitle={config.projectName} /> : null}
            {refreshedAt ? <MenuBarExtra.Item title="Updated" subtitle={refreshedAt} /> : null}
            {error ? (
              <MenuBarExtra.Item title={stale ? "Last refresh failed; showing cached value" : error.message} />
            ) : null}
          </MenuBarExtra.Section>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item title="Refresh Now" icon={Icon.ArrowClockwise} onAction={revalidate} />
            <MenuBarExtra.Item
              title={config.metricUrl ? "Open Insight in PostHog" : "Open Dashboard in PostHog"}
              icon={Icon.Globe}
              onAction={() => open(config.metricUrl ?? config.dashboardUrl)}
            />
            <MenuBarExtra.Item
              title="Choose Another Metric"
              icon={Icon.Pin}
              onAction={() => launchCommand({ name: "dashboards", type: LaunchType.UserInitiated })}
            />
          </MenuBarExtra.Section>
        </>
      ) : (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Choose a metric from Dashboards"
            icon={Icon.Pin}
            onAction={() => launchCommand({ name: "dashboards", type: LaunchType.UserInitiated })}
          />
          <MenuBarExtra.Item title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </MenuBarExtra.Section>
      )}
    </MenuBarExtra>
  );
}
