# Use local-first Google Drive sync

The app keeps learning data in a single local JSON document and lets a visitor opt into an optional Google Drive `appDataFolder` copy. It does not use a browser extension, an app backend, app accounts, user profiles, data merging, app-managed cloud snapshots, or client-side encryption. This fits a small public app where progress and preferences are the only stored data.

## Considered options

- Chrome extension storage, rejected because the app must work in Chrome, Firefox, and mobile browsers without an extension.
- A backend with app authentication, rejected because it adds account, server, and token-management work that the app does not need.
- Automatic merging and version snapshots, rejected in favour of clear manual replacement controls and last-write-wins behaviour.

## Consequences

Cloud sync needs an explicit Google action and only resumes while the browser has valid short-lived Google access. The app saves locally first, then saves to Drive after meaningful changes. When Drive data changed in a parallel session, the app offers Reload page; dismissing that notification overwrites the cloud copy. Visitors control data with directional copy actions and a confirmed action that clears both copies. The public app needs a stable HTTPS origin, a production Google OAuth configuration, and a privacy notice explaining the Drive storage.
