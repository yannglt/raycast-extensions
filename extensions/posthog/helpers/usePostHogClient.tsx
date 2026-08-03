import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { isPersonalApiKey, normalizeHost } from "../src/posthog-client";

type PostHogClientOptions<T> = {
  execute?: boolean;
  onData?: (data: T) => void;
};

export function usePostHogClient<T>(
  path: string,
  { execute = true, onData = (() => null) as (data: T) => void }: PostHogClientOptions<T> = {},
) {
  const { dataRegionURL, personalAPIKey } = getPreferenceValues<Preferences>();
  const apiKey = personalAPIKey?.trim();
  const credentialError = execute && !isPersonalApiKey(apiKey)
    ? new Error("Enter a PostHog personal API key starting with phx_ in extension preferences.")
    : undefined;

  const result = useFetch<T>(`${normalizeHost(dataRegionURL)}/api/${path}`, {
    keepPreviousData: true,
    headers: apiKey
      ? {
          Authorization: `Bearer ${apiKey}`,
        }
      : undefined,
    execute: execute && !credentialError,
    onData,
  });

  return {
    ...result,
    error: credentialError ?? result.error,
    isLoading: credentialError ? false : result.isLoading,
  };
}
