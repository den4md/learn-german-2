# Learn German

Learn German is a planned browser app for building German vocabulary with flashcards. It is intended for Russia-speaking people learning German whose interface language is English, German, or Russian.
This is practice/fun project lead by AI agents.

## What the app will do

- Show curated German vocabulary as flashcards.
- Let visitors classify unfamiliar words, practise words they are learning, and repeat known words.
- Record self-assessed recall and use it to suggest when a word is ready to move to Known.
- Let visitors change a word's state or exclude it during a session.
- Keep progress and preferences in the browser by default.
- Optionally sync that learning data to the visitor's own Google Drive application-data folder.

The app will not require an app account or backend. When local and cloud copies differ, the visitor chooses which copy replaces the other. The app does not merge learning data.

## Current status

The project has a React, TypeScript, Vite, and Tailwind bootstrap. It stores a minimal Data document in IndexedDB and lets the visitor choose an English, German, or Russian interface language. Vocabulary import, learning sessions, and Google Drive sync are not implemented yet.

## Local development

Install dependencies with `pnpm install`, start the app with `pnpm dev`, and create a production build with `pnpm build`.

## Project decisions

- [Domain glossary](CONTEXT.md) defines the terms used by the project, including learning data, word states, sessions, and personal vocabulary overrides.
- [ADR 0001](docs/adr/0001-local-first-google-drive-sync.md) records the local-first Google Drive sync decision and its consequences.

## License

No license has been selected yet.
