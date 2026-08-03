import { Cache } from "@raycast/api";

export type MenuBarMetricConfig = {
  version: 1;
  projectId: number;
  projectName?: string;
  dashboardId: number;
  dashboardName: string;
  metricId: string;
  metricName: string;
  dashboardUrl: string;
  metricUrl?: string;
};

export type MenuBarMetricSnapshot = {
  metricId: string;
  displayValue: string;
  observedAt: string;
};

const cache = new Cache({ namespace: "menu-bar-metric" });
const CONFIG_KEY = "config-v1";
const SNAPSHOT_KEY = "snapshot-v1";

function parse<T>(value: string | undefined): T | undefined {
  if (!value) return undefined;

  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

export function getMenuBarMetricConfig(): MenuBarMetricConfig | undefined {
  const config = parse<MenuBarMetricConfig>(cache.get(CONFIG_KEY));
  return config?.version === 1 ? config : undefined;
}

export function setMenuBarMetricConfig(config: MenuBarMetricConfig, displayValue?: string) {
  cache.set(CONFIG_KEY, JSON.stringify(config));
  if (displayValue) setMenuBarMetricSnapshot(config.metricId, displayValue);
}

export function getMenuBarMetricSnapshot(metricId?: string): MenuBarMetricSnapshot | undefined {
  const snapshot = parse<MenuBarMetricSnapshot>(cache.get(SNAPSHOT_KEY));
  return snapshot && (!metricId || snapshot.metricId === metricId) ? snapshot : undefined;
}

export function setMenuBarMetricSnapshot(metricId: string, displayValue: string) {
  cache.set(
    SNAPSHOT_KEY,
    JSON.stringify({ metricId, displayValue, observedAt: new Date().toISOString() } satisfies MenuBarMetricSnapshot),
  );
}
