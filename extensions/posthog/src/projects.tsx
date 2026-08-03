import { getPreferenceValues, List } from "@raycast/api";
import { usePostHogClient } from "../helpers/usePostHogClient";
import { useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";
import ErrorHandler from "./error-handler";

type SearchResult = {
  count: number;
  next: null;
  previous: null;
  results: Project[];
};

type Project = {
  id: number;
  name: string;
};

type ProjectDetail = {
  id: number;
  uuid: string;
  created_at: string;
  updated_at: string;
  is_demo: boolean;
  timezone: string;
  person_display_name_properties: string[];
};

type ProjectDetailResponse = Partial<ProjectDetail> & { id: number };

function toProjectDetail(detail: ProjectDetailResponse): ProjectDetail {
  return {
    id: detail.id,
    uuid: detail.uuid ?? "",
    created_at: detail.created_at ?? "",
    updated_at: detail.updated_at ?? "",
    is_demo: detail.is_demo ?? false,
    timezone: detail.timezone ?? "",
    person_display_name_properties: detail.person_display_name_properties ?? [],
  };
}

export default function Command() {
  const { defaultProjectId } = getPreferenceValues<Preferences>();
  const configuredProjectId = defaultProjectId?.trim();
  const hasConfiguredProject = Boolean(configuredProjectId);
  const defaultProject = usePostHogClient<Project>(hasConfiguredProject ? `projects/${configuredProjectId}` : "", {
    execute: hasConfiguredProject,
  });
  const projectList = usePostHogClient<SearchResult>(hasConfiguredProject ? "" : "projects", {
    execute: !hasConfiguredProject,
  });
  const [selectedId, setSelectedId] = useState<string | null>(configuredProjectId ?? null);
  const [projectDetail, setProjectDetail] = useCachedState<{ [id: number]: ProjectDetail }>("project-details", {});

  useEffect(() => {
    if (Object.values(projectDetail).some((detail) => "slack_incoming_webhook" in detail)) {
      setProjectDetail((previous) =>
        Object.fromEntries(Object.entries(previous).map(([id, detail]) => [id, toProjectDetail(detail)])),
      );
    }
  }, [projectDetail, setProjectDetail]);

  const selectedProjectId = selectedId ? Number(selectedId) : undefined;
  const selectedProjectDetail = selectedProjectId ? projectDetail[selectedProjectId] : undefined;
  const projectDetailRequest = usePostHogClient<ProjectDetailResponse>(
    selectedProjectId ? `projects/${selectedProjectId}` : "",
    {
      execute: Boolean(selectedProjectId && !selectedProjectDetail),
      onData: (detail) => setProjectDetail((previous) => ({ ...previous, [detail.id]: toProjectDetail(detail) })),
    },
  );

  const projects = defaultProject.data ? [defaultProject.data] : (projectList.data?.results ?? []);
  const isLoading = defaultProject.isLoading || projectList.isLoading;
  const error = defaultProject.error ?? projectList.error ?? projectDetailRequest.error;

  return (
    <ErrorHandler error={error}>
      <List
        isLoading={isLoading}
        searchBarPlaceholder="Search projects..."
        onSelectionChange={setSelectedId}
        isShowingDetail={true}
        throttle
      >
        {projects.length > 0 ? (
          <List.Section>
            {projects.map((project) => (
              <Project key={project.id} project={project} detail={projectDetail[project.id]} />
            ))}
          </List.Section>
        ) : null}
      </List>
    </ErrorHandler>
  );
}

const Project = ({ project, detail }: { project: Project; detail: ProjectDetail }) => {
  return (
    <List.Item
      title={project.name}
      id={project.id.toString()}
      detail={
        <List.Item.Detail
          isLoading={!detail}
          metadata={
            detail && (
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Name" text={project.name} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="ID" text={project.id.toString()} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Created At" text={detail.created_at} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Timezone" text={detail.timezone} />
                <List.Item.Detail.Metadata.Separator />
                {detail.person_display_name_properties && (
                  <>
                    <List.Item.Detail.Metadata.TagList title="Industries">
                      {detail.person_display_name_properties.map((properties) => (
                        <List.Item.Detail.Metadata.TagList.Item key={properties} text={properties} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                  </>
                )}
              </List.Item.Detail.Metadata>
            )
          }
        />
      }
    />
  );
};
