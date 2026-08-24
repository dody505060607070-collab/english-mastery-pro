# Plan: Implement Gamification and Progress Tracking

The vision re-asserted by the user includes a robust gamification system (XP, Streaks, Leaderboard, Achievements) and improved progress tracking. I will implement these features following the database schema and logic defined in the vision.

## Technical Details

### 1. Database Schema Extensions
- Create `xp_logs` table: `id`, `user_id`, `amount`, `action_type` (lesson_complete, quiz_pass, etc.), `created_at`.
- Create `achievements` table: `id`, `title`, `description`, `icon`, `criteria_type`, `criteria_value`.
- Create `user_achievements` table: `id`, `user_id`, `achievement_id`, `earned_at`.
- Create `user_stats` table (or extend `profiles`): `xp`, `level`, `streak_count`, `last_active_at`, `streak_freeze_count`.
- Add RLS and GRANTS for all new tables.
- Add triggers to handle streak increments on daily activity.

### 2. Gamification Logic
- Create a `grantXP` server function (or helper) to update `user_stats` and log transactions.
- Implement logic to check and award achievements when criteria are met (e.g., "10 lessons completed").
- Implement streak tracking logic: increment if activity is on consecutive days, reset if a day is missed (unless freeze is available).

### 3. Dashboard Integration
- Update `src/routes/_authenticated/dashboard.tsx` to display:
    - Current Level and XP progress bar.
    - Daily Streak with fire icon.
    - Recent Achievements.
- Implement a "Leaderboard" component to show top learners.

### 4. Progress Hardening
- Ensure `user_progress` updates are atomic and reflected instantly in UI via React Query invalidation.
- Add "Today's Goal" tracking based on XP earned today.

## User Interface (UX)
- Use the distinctive 3D glassmorphism style for all new widgets.
- Add subtle animations (Framer Motion) when XP is earned or a level is reached.
- Notifications for milestone achievements.
