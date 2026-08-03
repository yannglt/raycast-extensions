import { List } from "@raycast/api";
import { ReactNode, useContext } from "react";
import { ProjectSelector, ProjectsContext } from "./ProjectsContext";
import { usePostHogClient } from "./usePostHogClient";
import ErrorHandler from "../src/error-handler";

type SearchResult<T> = {
  count: number;
  next: null;
  previous: null;
  results: T[];
};

type ProjectResourceListProps<T> = {
  endpoint: string;
  searchBarPlaceholder: string;
  isShowingDetail?: boolean;
  children: (resources: T[]) => ReactNode;
};

export function ProjectResourceList<T>({
  endpoint,
  searchBarPlaceholder,
  isShowingDetail,
  children,
}: ProjectResourceListProps<T>) {
  const { selectedId } = useContext(ProjectsContext);
  const hasSelectedProject = selectedId !== null;
  const { data, isLoading, error } = usePostHogClient<SearchResult<T>>(
    hasSelectedProject ? `projects/${selectedId}/${endpoint}` : "",
    { execute: hasSelectedProject },
  );

  return (
    <ErrorHandler error={error}>
      <List
        isLoading={isLoading}
        searchBarPlaceholder={searchBarPlaceholder}
        searchBarAccessory={<ProjectSelector />}
        isShowingDetail={isShowingDetail}
        throttle
      >
        {data ? <List.Section title="Results">{children(data.results)}</List.Section> : null}
      </List>
    </ErrorHandler>
  );
}
