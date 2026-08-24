# English Academy Development Plan

Refining the English learning platform with advanced features, enhanced UI consistency, and a premium 3D/glassmorphism aesthetic.

## 1. Feature Enhancements
- **Gamification Expansion**:
  - Implement daily login XP bonuses (backend trigger or dashboard logic).
  - Add "Level-up" celebration animation when XP crosses thresholds.
  - Implement the "Streak" system with a visual calendar on the dashboard.
- **Learning Tools**:
  - Integrate a modular Flashcards system with Spaced Repetition logic.
  - Enhance the Speaking module with real-time feedback placeholders for future AI integration.
  - Add "Related Lessons" and "Grammar Tips" to the course viewer.
- **Course Catalog**:
  - Add "Earn XP" badges to course cards in the catalog to incentivize enrollment.
  - Implement a search bar for the course catalog and practice hub.

## 2. Visual & UX Polish
- **Glassmorphism Consistency**:
  - Audit all cards and modals to ensure consistent use of `glass` utility and `animate-float`.
  - Enhance the Leaderboard with distinct styles for the top 3 (Gold, Silver, Bronze accents).
- **Smooth Navigation**:
  - Ensure all internal links use TanStack `<Link>` for fast SPA transitions.
  - Add page-level transitions using Framer Motion's `AnimatePresence`.
- **Responsive Audit**:
  - Final check on mobile navigation (Bottom Nav vs Top Nav layout).

## 3. Database & Security
- **RLS Hardening**:
  - Verify all new gamification tables (`xp_logs`, `user_stats`) have strict RLS policies scoped to `auth.uid()`.
  - Ensure `user_roles` is correctly used in admin-only routes/functions.
- **Data Integrity**:
  - Add triggers for automatic enrollment cleanup or subscription expiration logic.

## Technical Details
- **Framework**: TanStack Start v1 (React 19, Vite 7).
- **Styling**: Tailwind CSS v4 with semantic tokens.
- **State Management**: TanStack Query for data fetching and caching.
- **Backend**: Supabase (RLS, PostgreSQL functions).
- **Animations**: Framer Motion.
