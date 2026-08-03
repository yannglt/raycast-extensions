import { LaunchProps, List } from "@raycast/api";
import { useUrl } from "../helpers/useUrl";
import { WithProjects } from "../helpers/ProjectsContext";
import { ResourceActions } from "../helpers/ResourceActions";
import { ProjectResourceList } from "../helpers/ProjectResourceList";

type Person = {
  id: number;
  name: string;
  distinct_ids: string[];
};

export type PersonsArguments = {
  term: string;
};

function Persons({ searchTerm }: { searchTerm: string }) {
  const query = new URLSearchParams({ search: searchTerm }).toString();

  return (
    <ProjectResourceList<Person> endpoint={`persons?${query}`} searchBarPlaceholder="Search persons...">
      {(persons) => persons.map((person) => <ResultsListSection key={person.id} person={person} />)}
    </ProjectResourceList>
  );
}

const ResultsListSection = ({ person }: { person: Person }) => {
  const originalId = person.distinct_ids?.at(-1);
  const appUrl = useUrl(originalId ? `person/${encodeURIComponent(originalId)}` : "persons");

  return (
    <List.Item
      key={person.id}
      title={person.name || originalId || "Unknown person"}
      actions={originalId ? <ResourceActions title={person.name || originalId} url={appUrl} /> : undefined}
    />
  );
};

export default function Command(props: LaunchProps<{ arguments: PersonsArguments }>) {
  return (
    <WithProjects>
      <Persons searchTerm={props.arguments.term} />
    </WithProjects>
  );
}
