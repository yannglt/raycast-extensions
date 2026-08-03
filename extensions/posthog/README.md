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
