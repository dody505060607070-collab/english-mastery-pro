# English Placement Test Implementation Plan

Implement a professional English placement test covering Vocabulary, Grammar, Reading, and Listening. The system will automatically calculate the student's level (A1-C2) and provide a detailed report of strengths and weaknesses.

## User-facing changes

- **New Placement Test Page**: A multi-step interactive interface where users answer questions across four categories.
- **Dynamic Result Dashboard**: Shows the calculated CEFR level (e.g., B1), a progress visualization, and a breakdown of performance by category.
- **Report Summary**: Lists specific strengths (e.g., "Good understanding of basic grammar") and weaknesses (e.g., "Need to improve advanced listening").
- **Gamification Integration**: Users earn a one-time XP bonus for completing their first placement test.

## Technical details

- **Database Updates**:
  - Add `placement_tests` table to store questions, options, correct answers, and categories.
  - Add `placement_test_results` to store user attempts and calculated levels.
  - Add `level` column to `profiles` if not already present to track the determined level.
- **Routing**:
  - Create `src/routes/_authenticated/placement-test.tsx` for the interactive test.
  - Link to the test from the Landing Page and Dashboard.
- **Algorithm**:
  - Score-based level calculation:
    - 0-20%: A1 (Beginner)
    - 21-40%: A2 (Elementary)
    - 41-60%: B1 (Intermediate)
    - 61-80%: B2 (Upper Intermediate)
    - 81-90%: C1 (Advanced)
    - 91-100%: C2 (Proficiency)
- **UI Components**:
  - Glassmorphism multi-step form with progress indicator.
  - Audio player for Listening section.
  - Result summary with 3D charts.

## Implementation Steps

1. **Schema**: Create migration for `placement_tests` and `placement_test_results`.
2. **Seed Data**: Add initial set of 20-40 questions across all categories.
3. **Logic**: Implement `placementTest.functions.ts` to handle submission and level calculation.
4. **UI**: Build the `PlacementTest` component with `framer-motion` for smooth step transitions.
5. **Integration**: Update the user's profile and grant XP upon completion.
