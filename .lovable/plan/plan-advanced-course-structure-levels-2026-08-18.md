# Plan: Advanced Course Structure & Levels

Implement a detailed educational hierarchy (CEFR Levels A1.1 to C2.2) with Units and specialized lesson types (Grammar, Listening, Reading, etc.) to match the new professional requirements.

## Proposed Changes

### 1. Database Schema Refinement
- Add `level` and `sub_level` to `courses` table if needed, or refine existing `level` usage.
- Create `units` table: `id`, `course_id`, `title`, `order_index`.
- Update `lessons` table: Add `unit_id` (foreign key) and `type` (enum: 'Grammar', 'Listening', 'Reading', 'Vocabulary', 'Practice', 'Tasks', 'Test').
- Add `GRANT` statements and RLS policies for the new `units` table.

### 2. Admin Interface (Course Builder)
- Update `/admin/courses` and content manager to support Unit creation.
- Implement drag-and-drop for Units and Lessons within Units.
- Add "Type" selector when creating/editing lessons.

### 3. Student Experience (Course Viewer)
- Redesign the course sidebar to group lessons by Units.
- Add visual indicators for lesson types (icons for Grammar, Listening, etc.).
- Update progress tracking to account for the new hierarchy.

### 4. Seed Data
- Create a migration to seed default levels and an example structure to demonstrate the new capabilities.

## Technical Details
- **Schema**: `ALTER TABLE public.lessons ADD COLUMN unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE;`
- **Schema**: `ALTER TABLE public.lessons ADD COLUMN lesson_type TEXT CHECK (lesson_type IN ('Grammar', 'Listening', 'Reading', 'Vocabulary', 'Practice', 'Tasks', 'Test'));`
- **Frontend**: Update `@dnd-kit` implementation in `src/routes/_authenticated/admin/courses.$courseId.content.tsx` to handle nested sorting (Units -> Lessons).
- **Navigation**: Update `CourseViewer` in `src/routes/_authenticated/course/$courseId.tsx` to display an accordion-style sidebar for Units.
