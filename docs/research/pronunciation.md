# Browser pronunciation

Checked 2026-10-28 against the [Web Speech API specification](https://webaudio.github.io/web-speech-api/#tts-section).

- `getVoices()` exposes available voices; `voiceschanged` reports changes. The app selects a German voice, preferring `de-DE`, and disables playback if none exists.
- `SpeechSynthesisUtterance.rate` is relative to the selected voice. Supported effective rates depend on the engine, so the configured speed does not guarantee identical timing across devices.
- Voice `localService` distinguishes local and remote synthesis. The API does not guarantee a particular voice, consistent sound quality, or offline availability across devices.
- `speak()` queues utterances; `cancel()` clears pending/current speech. The app interrupts its previous utterance instead of building a queue.
- The sequence advances on `start`. An attempt that fails before starting does not count; interrupted started audio counts. Errors are logged, with no popup or fallback to a non-German voice.

`BrowserSpeechPlayback` implements the small `SpeechPlayback` interface. The page's `Pronunciation` controller owns repeat sequencing, and the button owns presentation. TODO: provide a better source if browser voices are unsatisfactory.
