# PostHog

Open the web app, search PostHog resources, and run read-only analytics from Raycast.

## Configuring a Personal Access Token

You need a personal access token instead of logging in through OAuth to authenticate your PostHog requests:

1. Go to https://us.posthog.com/me/settings (or https://eu.posthog.com/me/settings)
2. Click "Create personal API key"
3. Call it "Raycast" or anything you like.
4. Choose the projects Raycast may access.
5. Add only the read scopes you need. The current commands use Project, Dashboard, Insight, Cohort, Feature flag, Person, and Query read access.
6. Click "Create key" and copy the token into the "Personal API Key" field in the extension's preferences.
7. Choose your data region and enter a Default Project ID. A default is required when the key is restricted to specific projects.

PostHog only shows the personal API key once. Raycast stores password preferences securely and never needs a project key beginning with `phc_`.

## Dashboard Metrics and the Menu Bar

The Dashboards command shows the current values behind each dashboard tile. Open a dashboard, choose a metric, and run **Pin to Menu Bar** to make it the metric shown by the optional **Metric in Menu Bar** command.

The menu-bar command is disabled by default so upgrading does not change an existing Raycast setup. Enable both **Show in Menu Bar** and **Background Refresh** in the PostHog extension settings when you want the pinned value refreshed every five minutes. The last good value stays visible if a refresh temporarily fails.

The Events command runs one read-only aggregate query and shows event volume, unique users, and last activity for the previous seven days. It does not fetch or modify raw event payloads.
