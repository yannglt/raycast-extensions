import { ReactNode, createContext, useContext, useState } from "react";
import { usePostHogClient } from "./usePostHogClient";
import { getPreferenceValues, List } from "@raycast/api";
import ErrorHandler from "../src/error-handler";

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

type ProjectContextType = { projects: Project[]; selectedId: string | null; setSelectedId: (id: string) => void };

export const ProjectsContext = createContext<ProjectContextType>({
  projects: [],
  selectedId: null,
  setSelectedId: () => null,
});

export function WithProjects({ children }: { children: ReactNode }) {
  const { defaultProjectId } = getPreferenceValues<Preferences>();
  const preferredProjectId = defaultProjectId?.trim();
  const configuredProjectId = /^\d+$/.test(preferredProjectId ?? "") ? preferredProjectId : undefined;
  const hasConfiguredProject = Boolean(configuredProjectId);
  const projectList = usePostHogClient<SearchResult>("projects");
  const shouldFallBackToConfiguredProject = hasConfiguredProject && Boolean(projectList.error);
  const defaultProject = usePostHogClient<Project>(
    shouldFallBackToConfiguredProject ? `projects/${configuredProjectId}` : "",
    {
      execute: shouldFallBackToConfiguredProject,
    },
  );
  const [selectedId, setSelectedId] = useState<string | null>(configuredProjectId ?? null);

  const projects = projectList.data?.results ?? (defaultProject.data ? [defaultProject.data] : []);
  const resolvedSelectedId = selectedId ?? projects[0]?.id.toString() ?? null;
  const isLoading = projectList.isLoading || defaultProject.isLoading;
  const error = projectList.error
    ? hasConfiguredProject
      ? defaultProject.error ?? (!defaultProject.isLoading && !defaultProject.data ? projectList.error : undefined)
      : projectList.error
    : undefined;

  if (!projectList.data && !defaultProject.data && isLoading) {
    return <List isLoading={true}></List>;
  }

  return (
    <ErrorHandler error={error}>
      <ProjectsContext.Provider value={{ projects, selectedId: resolvedSelectedId, setSelectedId }}>
        {children}
      </ProjectsContext.Provider>
    </ErrorHandler>
  );
}

export function ProjectSelector() {
  const { projects, selectedId, setSelectedId } = useContext(ProjectsContext);

  return (
    <List.Dropdown tooltip="Filter Project" value={selectedId ?? undefined} onChange={setSelectedId}>
      <List.Dropdown.Section>
        {projects.map((project) => (
          <List.Dropdown.Item key={project.id} title={project.name} value={project.id.toString()} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
