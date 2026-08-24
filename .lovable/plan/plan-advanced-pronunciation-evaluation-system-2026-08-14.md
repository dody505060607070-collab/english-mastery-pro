# Plan - Advanced Pronunciation & Evaluation System

Implement an interactive pronunciation practice system in the Free and Premium practice sections, allowing users to record their attempts, receive AI-powered feedback (simulated via text analysis), and view a history of their attempts.

## User Review Required

> [!IMPORTANT]
> The pronunciation evaluation will use the browser's native Speech Recognition API for accuracy. Results may vary depending on background noise and microphone quality.

- **Audio Feedback**: Should we add specific "Excellent", "Good", "Try Again" sound effects when the evaluation completes?
- **Attempt History**: Should the history persist between sessions (save to database) or only for the current session (local state)? (Default: Local state for free, Database for premium).

## Proposed Changes

### Database Schema
- Create `pronunciation_attempts` table to store user recordings (optional) and scores.
- `GRANT` permissions on the new table.

### Components & UI
- **Practice Cards**: Add a "Record" (Mic) button alongside the existing "Speak" button.
- **Evaluation Modal**: Show a visual score (0-100) and highlight differences between the original word and the spoken word.
- **Attempt History**: Add a small list/drawer showing recent attempts for the current word.

### Logic
- **`usePronunciation.ts` Hook**: 
    - Use `webkitSpeechRecognition` (or `SpeechRecognition`) to capture user speech.
    - Compare transcript with target word using a similarity algorithm (Levenshtein distance).
    - Map similarity to a score and feedback message.

### Styling
- Visual feedback using colors (Green for correct, Red for mistakes).
- Animated waveform or pulsing icon during recording.

## Technical Details

- **Browser Compatibility**: Speech Recognition API works best in Chrome/Edge; fallback will show "Browser not supported".
- **Similarity Logic**: `calculateSimilarity(spoken, target)` will normalize both strings (lowercase, trim) and compute distance.
- **Privacy**: No audio will be sent to external servers unless Cloud AI evaluation is requested later.

## Security

- Use RLS on `pronunciation_attempts` to ensure users only see their own history.
- Sanitize inputs before comparison.
