import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useContext } from "react";
import { ProjectsContext, WithProjects } from "../helpers/ProjectsContext";
import { useUrl } from "../helpers/useUrl";
import ErrorHandler from "./error-handler";
import { type HogQLResponse, posthogRequest } from "./posthog-client";

type EventSummary = {
  event: string;
  count: number;
  uniqueUsers: number;
  lastSeen?: string;
};

const EVENT_SUMMARY_QUERY = `
SELECT
  event,
  count() AS event_count,
  uniq(distinct_id) AS unique_users,
  max(timestamp) AS last_seen
FROM events
WHERE timestamp >= now() - INTERVAL 7 DAY
GROUP BY event
ORDER BY event_count DESC
LIMIT 100
`.trim();

function numberValue(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function eventSummaries(response: HogQLResponse | undefined): EventSummary[] {
  const rows = response?.results ?? response?.query_status?.results ?? [];
  return rows.flatMap((row) => {
    const event = typeof row[0] === "string" ? row[0] : undefined;
    if (!event) return [];

    return [
      {
        event,
        count: numberValue(row[1]),
        uniqueUsers: numberValue(row[2]),
        lastSeen: typeof row[3] === "string" ? row[3] : undefined,
      },
    ];
  });
}

function Events() {
  const { selectedId } = useContext(ProjectsContext);
  const projectId = selectedId ? Number(selectedId) : undefined;
  const eventsUrl = useUrl(projectId ? `project/${projectId}/events` : "events");
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (id: number | undefined) => {
      if (!id) return undefined;
      return posthogRequest<HogQLResponse>(`projects/${id}/query/`, {
        method: "POST",
        body: {
          query: { kind: "HogQLQuery", query: EVENT_SUMMARY_QUERY },
          name: "raycast-events-overview",
        },
      });
    },
    [projectId],
    { execute: Boolean(projectId), keepPreviousData: true },
  );
  const events = eventSummaries(data);

  return (
    <ErrorHandler error={error}>
      <List
        isLoading={isLoading}
        searchBarPlaceholder="Search events from the last 7 days..."
        navigationTitle="Events · Last 7 Days"
      >
        <List.Section title={`Events · Last 7 Days (${events.length})`}>
          {events.map((event) => (
            <List.Item
              key={event.event}
              icon={Icon.Dot}
              title={event.event}
              subtitle={`${new Intl.NumberFormat().format(event.count)} events`}
              accessories={[
                { text: `${new Intl.NumberFormat().format(event.uniqueUsers)} users`, icon: Icon.Person },
                ...(event.lastSeen ? [{ date: new Date(event.lastSeen), tooltip: "Last seen" }] : []),
              ]}
              actions={
                <ActionPanel title={event.event}>
                  <Action.OpenInBrowser title="Open Events in PostHog" url={eventsUrl} />
                  <Action.CopyToClipboard title="Copy Event Name" content={event.event} />
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
        {!isLoading && events.length === 0 ? (
          <List.EmptyView title="No events found" description="No events were recorded in the last 7 days." />
        ) : null}
      </List>
    </ErrorHandler>
  );
}

export default function Command() {
  return (
    <WithProjects>
      <Events />
    </WithProjects>
  );
}
