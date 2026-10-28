# Learn German

Learn German is a browser app for Russian speakers practising German with flashcards. The interface supports English, German, and Russian. It is a personal practice project developed with AI agents.

## Available now

- **Vocabulary** searches the shipped German/Russian set and User-added vocabulary items. Filters, sorting, pagination, favourites, text edits, and manual Word-state changes are available. User-added items receive stable negative IDs. A duplicate headword produces a warning and links to existing items, while adding another meaning remains allowed.
- **Sessions** include Knowledge-check for New words, Learning for words being practised, and Repetition for Known words. Choose filters, ordering, a Limited or Unlimited size, and the first card side. The German side shows all noun/verb grammar fields; there are no grammar-field selectors.
- **Progression** shows recent Sessions and previews of Learning and Known words. The Sessions browser adds filters, sorting, and pagination. Ended-session details use Vocabulary cards with the recorded decision and historical changes.
- **Settings** saves the Interface language, Learning-score threshold from 1 to 20 with 4 as the default, and Limited-session finishing delay. Learning data persists locally in IndexedDB and resumes after refresh. No app account or backend is required.
- **Daily streak** uses five distinct correct Session entries per UTC date. A valid day stays valid after later corrections. One missed day can be pause-protected, but two consecutive missed days cannot.

## Answers, review, and finishing

Reveal the other side before assessing a card or using its in-session manual Word-state controls. Back/Next revisits cards or skips an unanswered card. The URL identifies the Session and exact card, so browser Back/Forward and refresh preserve the position and reveal state. Revisiting does not add Shows. Replacing a decision saves the latest choice and replaces the earlier assessment statistic. Active entries keep their original baseline without calculating a future state or score; Session end applies the latest choice and records the actual result for history.

Answers, Shows, Correct/Incorrect counts, and Daily streak progress save immediately. Word state and Learning score stay committed during the Active session; the latest recorded choices apply when it ends. A correct Learning answer promotes the word to Known if its final score reaches the threshold configured at Session end, including changes made after answering. Changing the threshold alone preserves scores and Word states. The Knowledge-check choice "I recognise it, but want to learn it" keeps Learning even at threshold 1; manual decisions also remain explicit. An incorrect Repetition answer moves a word back to Learning with score zero.

A Limited session keeps its original selected total. After the last card, unanswered cards are revisited first. When every card is completed, its finishing screen waits for the saved duration: immediately, 2, 5, or 10 seconds, with 5 as the default. Space or the finish button skips the wait. The countdown and bar pause for inactive documents/windows, menus, popups, and other app views. Returning from card review or refreshing starts a full new wait; returning from another app view resumes the remaining wait.

An Unlimited session selects Candidate pages of up to ten words. It selects another page only after the current one is answered, using the current filters and excluding every previously presented word. Its total is the unique union of presented words, selected candidates, and eligible unselected words at start and each new page selection. It ends when there is no next page or the user ends it.

Already selected words stay in the Session despite later eligibility changes. Their Word state is locked against outside changes until the Session ends, including Vocabulary, editors, Progression, and actions in older history. Text and Favourite status remain editable. A blocked editor action preserves the previous state and text draft.

Manual ending keeps every presented card, including unanswered cards, and discards unpresented selections. History preserves the original Limited total and each presented entry's before/after state, score, and statistics. Only changed fields use an arrow; missing older snapshots show Not recorded. History displays current word text and actions without rewriting the ended Session's result. Ended results cannot be corrected.

## Popups and local data

Confirmations for ending/replacing a Session, clearing Learning data, and discarding unsaved edits use app popups. Cancellation preserves data and drafts. Popups trap keyboard focus, restore their trigger, and block card shortcuts. Browser Back/Forward also asks before discarding a dirty editor. The browser-owned unload warning remains for refresh/tab-close with unsaved edits or a save in progress.

Clearing data removes the local Learning data and Preferences after confirmation; the shipped vocabulary remains available. Native `alert()`, `confirm()`, and `prompt()` calls are forbidden in app source and rejected by lint and the normal build.

## Planned and retired scope

Google Drive sync is **planned and not implemented**. The [local-first ADR](docs/adr/0001-local-first-google-drive-sync.md) records the intended optional application-data copy and explicit replacement choice when copies differ. Cloud accounts, merging, and cloud data controls are not delivered features.

For the current implementation effort, selectable grammar fields and additional vocabulary-generation validation are explicitly retired requirements. The existing generated vocabulary and converter are retained unchanged; this effort does not regenerate or revalidate their content. Duplicate-headword warning and allowed-save behavior are retained.

## Local development

Use Node.js 24 and the package's pinned pnpm version. Install dependencies with `pnpm install`, start the app with `pnpm dev`, and create a production build with `pnpm build`. The build runs oxlint, TypeScript, and Vite. `pnpm lint` runs the source checks separately. Focused runtime checks live in `scripts/verify-*` and use the existing Vite module runner rather than a separate test framework.

## Project decisions

- [Domain glossary](CONTEXT.md) defines Learning data, Word states, Sessions, and User-added vocabulary items, and identifies planned cloud concepts.
- [ADR 0001](docs/adr/0001-local-first-google-drive-sync.md) records the planned local-first sync architecture and its consequences.
- [Wayfinder map: Learn German 2 V1](https://github.com/den4md/learn-german-2/issues/1) records product decisions. Its closure did not establish implementation completeness. [Wayfinder map: Session corrections, history, and app popups](https://github.com/den4md/learn-german-2/issues/61) tracks implementation evidence and the final acceptance audit.

## License

No license has been selected yet.
