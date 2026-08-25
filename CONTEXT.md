# Learn German

This context describes a public browser-based language-learning app. A user can use it locally or optionally keep their learning data synchronized through their own Google Drive.

## User and data

**User**:
The person using the app in one browser. A user may have no app account or profile.
_Avoid_: visitor, account holder

**Learning data**:
The user's Preferences, Vocabulary learning records, User-added vocabulary items, an optional Active session, completed Sessions, and Daily streak history. It does not include the Default vocabulary set, notes, uploaded files, or profile data.
_Avoid_: account data

**Preferences**:
The user's saved choices outside an individual Session. At present, Preferences contain the Interface language; the app adds more Preferences only when it needs them.
_Avoid_: session settings, profile

**Local copy**:
The browser-specific copy of learning data. It belongs to one website origin and can exist without cloud sync.
_Avoid_: cache, backup

**Cloud copy**:
The optional copy of learning data held in the app's hidden Google Drive application-data folder.
_Avoid_: Google account, Drive backup

**Sync connection**:
The current browser's permission to read and write the cloud copy. It is not an app account or a user profile.
_Avoid_: login, account connection

**Data document**:
The single JSON record that contains one copy of learning data and identifies that copy's logical document and last update.
_Avoid_: database, file set

**Real progress**:
Learning data that differs from the default empty state. It determines whether connecting a cloud copy needs an explicit replacement choice.
_Avoid_: non-empty data

**Data replacement**:
An explicit user choice to copy the local copy to the cloud copy or the cloud copy to the local copy. It never merges the two copies.
_Avoid_: sync merge, reconciliation

## Vocabulary

**Default vocabulary set**:
The curated set of German vocabulary items shipped with the app.
_Avoid_: hard-coded words, master list

**Vocabulary item ID**:
The stable integer identifier assigned by the app to a Vocabulary item. A Default vocabulary item has a positive ID that it keeps in later Default-vocabulary-set releases. A User-added vocabulary item has a negative ID and keeps it through local and cloud copying.
_Avoid_: source ID, MongoDB ID

**Vocabulary learning record**:
The user's sparse record for one Vocabulary item. It references either a Default vocabulary item or a User-added vocabulary item, and stores the item's Word state, Learning score, Learning statistics, Favourite status, and optional complete replacements for German text or Russian translations. Its absence for a Default vocabulary item means New, score and statistics of zero, and not favourite.
_Avoid_: personal vocabulary override, user-specific word, word object

**Favourite status**:
A user-owned marker in a Vocabulary learning record. It does not affect the item's Word state, Learning score, or Learning statistics. The user may toggle it and use it in filters and item ordering.
_Avoid_: rating, priority

**Favourite-status filter**:
The session setting that selects all vocabulary items, favourites only, or non-favourites only.
_Avoid_: favourite ordering

**Vocabulary item**:
One German word or expression in a vocabulary set. It contains grammatical and translation data appropriate to its Word type, but no user's learning state or progress.
_Avoid_: card, question

**CEFR level**:
The Common European Framework of Reference language-proficiency level assigned to a Vocabulary item. The current Default vocabulary set represents A1, A2, B1, B2, and C1.
_Avoid_: difficulty score

**German text**:
The German headword and the Word-type-specific grammatical forms or attributes that describe a Vocabulary item. A Vocabulary learning record may completely replace it for that user.
_Avoid_: word spelling

**Russian translations**:
The ordered Russian translations of a Vocabulary item. A Vocabulary learning record may completely replace them for that user.
_Avoid_: translation language

**User-added vocabulary item**:
A Vocabulary item created by the user and stored in Learning data because it has no matching item in the Default vocabulary set. It receives a stable Vocabulary item ID.
_Avoid_: personal word, custom override

**Word type**:
The data classification of a vocabulary item: noun, adjective, or verb. It is a data classification, not a general linguistic classification.
_Avoid_: grammar category

**Noun gender**:
The grammatical category recorded for a noun Vocabulary item. The only stored values are Male, Female, Neutral, and Plural.
_Avoid_: gender identity

**Word state**:
The part of a Vocabulary learning record that says where the item is in the user's learning. The only Word states are New, Learning, Known, and Excluded.
_Avoid_: initial learning state, first answer

**New**:
A Word state for a Vocabulary item that the user has not classified yet. New items are eligible for a Knowledge-check session.
_Avoid_: unlearned, untouched

**Learning**:
A Word state for a Vocabulary item that the user is practising. Learning items are eligible for a Learning session when they match its Session settings.
_Avoid_: in progress, practising state

**Known**:
A Word state for a Vocabulary item that the user considers familiar. Known items are eligible for a Repetition session when they match its Session settings.
_Avoid_: mastered, learned

**Excluded**:
A Word state for a Vocabulary item that keeps it in Learning data but removes it from every Session.
_Avoid_: deleted, removed

## Sessions and assessment

**Self-assessment**:
The user's judgement after revealing a vocabulary item's other card side. In a Knowledge-check session, the user may say that they know the item, recognise it but want to learn it, do not know it, or exclude it. In Learning and Repetition sessions, they assess recall as correct or incorrect. A manual Word-state change is also a completed self-assessment, but does not record a correct or incorrect assessment.
_Avoid_: automatic answer check, grade

**Learning score**:
The count in a Vocabulary learning record of consecutive correct recall judgements for a Learning item. Choosing "I recognise it, but want to learn it" in a Knowledge-check session starts or increases the score. A manual move to Learning or Known preserves the score, a move to New resets it to zero, and excluding an item preserves it.
_Avoid_: total correct answers, mastery percentage

**Automatic state transition**:
The app's automatic change to a Vocabulary learning record's Word state after a Self-assessment. A Learning score of ten moves the item from Learning to Known. In a Repetition session, an incorrect self-assessment moves the item to Learning and resets its Learning score to zero. The user may change a Word state manually at any time.
_Avoid_: suggestion, optional promotion

## Progress

**Streak pause**:
The automatic one-day protection for a missed daily streak goal. It is always available, protects one missed UTC date, and never protects two consecutive missed UTC dates.
_Avoid_: manual pause, earned pause

**Progression view**:
The default main view. It makes the daily streak visible and provides expandable lists of recent sessions, Learning vocabulary items, and Known vocabulary items. Each list starts with five rows and expands in place. A recent-session row shows its date and time, session type, status, completed-entry count, and correct and incorrect self-assessment counts. A vocabulary-item row shows its German headword, first Russian translation, CEFR level, word type, Learning score, card shows, and correct and incorrect self-assessment counts.
_Avoid_: dashboard, analytics

**Daily streak**:
The user's consecutive streak days, calculated from Daily streak history. A UTC date meets the V1 streak goal after five distinct correct Session-entry self-assessments before the date ends. A manual Word-state change does not count toward that goal. The fifth correct entry makes the date valid and later result changes do not revoke it. A streak above two is visible on every main view. The app maintainer, not the user, may configure a different goal in a later version.
_Avoid_: login streak, activity streak

**Daily streak history**:
The stored result for each UTC date that affects the Daily streak: valid, pause-protected, or broken. It identifies each date as a `YYYY-MM-DD` string and keeps a valid date valid when a Session result later changes.
_Avoid_: derived streak, streak cache

**Streak popup**:
The view opened by selecting the daily streak. It shows the previous seven UTC dates, including valid streak days, pause-protected missed days, non-streak days, and dates where the streak broke.
_Avoid_: streak history page

## Sessions

**Session entry**:
One Vocabulary item that a Session has presented. It records that Session's reveal and Self-assessment result for the item, then updates its Vocabulary learning record. It does not own the item's long-lived Word state, Learning score, Learning statistics, Favourite status, or text changes.
_Avoid_: card progress, question state

**Session**:
One user-created sequence of Session entries. It has a start timestamp, a last-action timestamp, and an end timestamp and Session end reason when it completes or the user ends it. A user-ended Session may have no Session entries. It remains in session history after ending.
_Avoid_: run, attempt

**Session end reason**:
The recorded reason a Session ended. A completed Session reached its natural end; a user-ended Session ended because the user chose to stop it. A user-ended Session is a normal learning outcome and preserves its recorded Self-assessments.
_Avoid_: session status, outcome

**No-matching-items start failure**:
A rejected attempt to start a Session because no Vocabulary item matches its Session settings. It creates neither an Active session nor a completed Session.
_Avoid_: empty session

**Active session**:
A Session without an end timestamp. The app has at most one. It resumes with its recorded entries, current candidate page when applicable, and current position; starting another Session requires the user to end it.
_Avoid_: paused session

**Knowledge-check session**:
A Session that presents New Vocabulary items so the user can classify them.
_Avoid_: quiz, test

**Learning session**:
A Session that presents Learning Vocabulary items for active recall.
_Avoid_: practice mode

**Repetition session**:
A Session that presents Known Vocabulary items for continued recall.
_Avoid_: review mode

**Session settings**:
The user's choices for one Session: its CEFR-level, Word-type, and Favourite-status filters; ordering sources; item limit; card side shown first; and selected German-side header fields for nouns and verbs.
_Avoid_: global preferences, session type

**Item limit**:
A positive whole number in Session settings that caps the number of Vocabulary items in a Limited session. Invalid values cannot start a Session.
_Avoid_: page size, batch size

**Limited session**:
A Session with an Item limit. It selects one ordered, fixed list of matching Vocabulary items when it starts and completes when every Session entry has a Self-assessment. An item stays in its fixed list even when it later stops matching the Session settings, except when it becomes Excluded. A user-ended Limited session discards unpresented items in its fixed list. No matching item produces a No-matching-items start failure.
_Avoid_: normal session, capped session

**Ordering source**:
One criterion that orders Session entries, selected from CEFR level, Word type, Vocabulary item, and Favourite status. The user sets the order in which the sources apply and sets each source to no sorting, ascending, descending, or shuffle. No sorting leaves items in their imported Default-vocabulary-set order unless another Ordering source reorders them. If every source has no sorting, the app shuffles all matching items. An Unlimited session reapplies its Ordering sources when it selects a Candidate page; shuffle randomizes each new page, while a selected page keeps its order. The default order is CEFR level ascending, Word type with no sorting, and Vocabulary item ascending.
_Avoid_: sort preset, priority

**Candidate page**:
A snapshot of up to ten Vocabulary items selected for an Unlimited session before it presents them. It selects items that match the Session settings when the page is created and excludes every item the Session has already presented. Before presenting a candidate, the Session drops it when it no longer matches its Session settings. A candidate becomes a Session entry only when the Session presents it.
_Avoid_: buffer, queue, batch

**Unlimited session**:
A Session with no fixed item limit. It selects matching Vocabulary items in Candidate pages rather than creating its complete item list at the start, and selects a new page after the current page completes. It cannot start without a Candidate page, which produces a No-matching-items start failure. It completes when no later Candidate page can be selected, or ends when the user stops it manually and discards unpresented candidates in its current Candidate page.
_Avoid_: all-at-once session

## Interface

**German card side**:
The flashcard side that shows the German headword. It always shows the CEFR level and word type, and can show selected grammatical characteristics.
_Avoid_: front side, question side

**Russian card side**:
The flashcard side that shows Russian translations. It always shows the CEFR level and word type, presents the first three available translations as its header, and shows any remaining translations below.
_Avoid_: back side, answer side

**Interface language**:
The Preferences value used for the app's buttons, labels, and settings. The app supports English, German, and Russian interface languages, and uses English for a first visit.
_Avoid_: translation language, vocabulary language

## Vocabulary statistics

**Learning statistics**:
The recorded number in a Vocabulary learning record of card shows, correct assessments, and incorrect assessments. A Session counts an item show only the first time it opens the item's card; revisiting it does not add another show. Replacing a completed entry's result replaces its earlier assessment statistic.
_Avoid_: score, mastery percentage
