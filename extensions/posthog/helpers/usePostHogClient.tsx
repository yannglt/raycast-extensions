import { useCachedPromise } from "@raycast/utils";
import { posthogRequest } from "../src/posthog-client";

type PostHogClientOptions<T> = {
  execute?: boolean;
  onData?: (data: T) => void;
};

export function usePostHogClient<T>(
  path: string,
  { execute = true, onData = (() => null) as (data: T) => void }: PostHogClientOptions<T> = {},
) {
  return useCachedPromise(async (endpoint: string) => posthogRequest<T>(endpoint), [path], {
    keepPreviousData: true,
    execute,
    onData,
    // Commands render API errors through ErrorHandler. Suppress the utility's generic
    // toast so an expected project-discovery 403 can fall back without alarming users.
    onError: () => undefined,
  });
}
