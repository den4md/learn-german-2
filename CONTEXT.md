# Learn German

This context describes a public, installable browser-based language-learning app. A visitor can use it locally or optionally keep their learning data synchronized through their own Google Drive.

## Language

**Learning data**:
The visitor's progress and preferences. It excludes notes, uploaded files, and personal profile data.
_Avoid_: user data, account data

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
The single JSON record that contains one copy of learning data. It has a `documentId` and `updatedAt` value.
_Avoid_: database, file set

**Real progress**:
Learning data that differs from the default empty state. It determines whether connecting a cloud copy needs an explicit replacement choice.
_Avoid_: non-empty data

**Data replacement**:
An explicit visitor choice to copy the local copy to the cloud copy or the cloud copy to the local copy. It never merges the two copies.
_Avoid_: sync merge, reconciliation

**Default vocabulary set**:
The curated set of German vocabulary items shipped with the app.
_Avoid_: hard-coded words, master list

**Personal vocabulary set**:
The vocabulary set presented to the visitor after applying their personal vocabulary overrides to the default vocabulary set.
_Avoid_: copied default list, separate word database

**Personal vocabulary override**:
One visitor-owned addition or field change relative to the default vocabulary set. Overrides are sparse: unchanged default vocabulary items are not copied into learning data. Excluded is used instead of removing a default vocabulary item.
_Avoid_: personal copy, temporary edit

**Vocabulary item**:
One German word or expression in a vocabulary set, shown to the visitor as a flashcard. It has grammatical and translation data appropriate to its word type.
_Avoid_: card, question

**Vocabulary source type**:
The data classification of a vocabulary item: noun, adjective, or verb. It follows the imported vocabulary source and is not a general linguistic classification.
_Avoid_: grammar category

**Word state**:
The visitor's current relationship to a vocabulary item. New is the default state for unseen items. Learning items appear in Learning sessions. Known items appear in Repetition sessions. Excluded items appear in no session. The visitor may change a word's state during a session. Excluding an item is the way to remove it from all sessions.
_Avoid_: initial learning state, first answer

**Self-assessment**:
The visitor's own judgement after revealing a flashcard. In a Knowledge-check session, the visitor may say that they know the item, recognise it but want to learn it, do not know it, or exclude it. In Learning and Repetition sessions, they assess recall as correct or incorrect and may change the word state.
_Avoid_: automatic answer check, grade

**Learning score**:
The current count of consecutive correct recall judgements for a Learning item. Choosing "I recognise it, but want to learn it" in a Knowledge-check session starts or increases the score. Moving an item manually from Known to Learning preserves its score.
_Avoid_: total correct answers, mastery percentage

**Automatic state recommendation**:
The app's suggested state change based on a self-assessment. A Learning score of ten recommends Known, but does not prevent the visitor from choosing a different state.
_Avoid_: mandatory promotion

**Streak pause**:
The automatic one-day protection for a missed daily streak goal. It is always available, protects one missed UTC date, and never protects two consecutive missed UTC dates.
_Avoid_: manual pause, earned pause

**Knowledge-check session**:
A session that presents New vocabulary items so the visitor can classify them.
_Avoid_: quiz, test

**Learning session**:
A session that presents Learning vocabulary items for active recall.
_Avoid_: practice mode

**Repetition session**:
A session that presents Known vocabulary items for continued recall.
_Avoid_: review mode

**Session settings**:
The visitor's choices for one session: its CEFR-level and vocabulary-source-type filters, item order, item limit, card side shown first, and selected German-side header fields for nouns and verbs.
_Avoid_: global preferences, session type

**German card side**:
The flashcard side that shows the German headword. It always shows the CEFR level and vocabulary source type, and can show selected grammatical characteristics.
_Avoid_: front side, question side

**Russian card side**:
The flashcard side that shows Russian translations. It always shows the CEFR level and vocabulary source type, presents the first three available translations as its header, and shows any remaining translations below.
_Avoid_: back side, answer side

**Interface language**:
The language used for the app's buttons, labels, and settings. The app supports English, German, and Russian interface languages, and uses English for a first visit.
_Avoid_: translation language, vocabulary language

**Learning statistics**:
The recorded number of card shows, correct assessments, and incorrect assessments for a vocabulary item.
_Avoid_: score, mastery percentage
