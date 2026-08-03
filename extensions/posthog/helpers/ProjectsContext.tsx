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
  const configuredProjectId = defaultProjectId?.trim();
  const hasConfiguredProject = Boolean(configuredProjectId);
  const defaultProject = usePostHogClient<Project>(hasConfiguredProject ? `projects/${configuredProjectId}` : "", {
    execute: hasConfiguredProject,
  });
  const projectList = usePostHogClient<SearchResult>(hasConfiguredProject ? "" : "projects", {
    execute: !hasConfiguredProject,
  });
  const [selectedId, setSelectedId] = useState<string | null>(configuredProjectId ?? null);

  const projects = defaultProject.data ? [defaultProject.data] : (projectList.data?.results ?? []);
  const isLoading = defaultProject.isLoading || projectList.isLoading;
  const error = defaultProject.error ?? projectList.error;

  if (!defaultProject.data && !projectList.data && isLoading) {
    return <List isLoading={true}></List>;
  }

  return (
    <ErrorHandler error={error}>
      <ProjectsContext.Provider value={{ projects, selectedId, setSelectedId }}>{children}</ProjectsContext.Provider>
    </ErrorHandler>
  );
}

export function ProjectSelector() {
  const { projects, setSelectedId } = useContext(ProjectsContext);

  return (
    <List.Dropdown tooltip="Filter Project" onChange={setSelectedId} storeValue>
      <List.Dropdown.Section>
        {projects.map((project) => (
          <List.Dropdown.Item key={project.id} title={project.name} value={project.id.toString()} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
