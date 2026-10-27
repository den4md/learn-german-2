## Versioning

- With each edit by an AI agent, increase the patch version in `package.json` if it wasn't touched already. Increase the minor or major version instead only when the user explicitly requests it.

## App popups

- Do not call native `alert()`, `confirm()`, or `prompt()` in app source, including through browser references. Lint and build enforce this rule.
- Use `useAppPopup()` from `src/components/app-popup.tsx`: `confirmAction()` for confirmations and `showError()` for errors. Keep the browser-owned `beforeunload` warning for refresh/tab-close protection.

## Agent skills

### Issue tracker

Issues and specs for this repo live in GitHub Issues. See `docs/agents/issue-tracker.md`.

### Domain docs

This is a single-context repository. See `docs/agents/domain.md`.
