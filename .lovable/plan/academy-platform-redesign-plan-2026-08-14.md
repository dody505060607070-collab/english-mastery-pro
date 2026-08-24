# Academy Platform Redesign Plan

Revamp the academic platform for English courses to match the layout and feel of `english-for-arabs.com`, focusing on an improved course structure, dashboard, and management panel.

## User Experience (Frontend)
- **Home Page**: Redesign the landing page with a sectioned layout similar to the reference site:
  - Hero with call-to-action.
  - Course categories (e.g., Grammar, Conversation, IELTS).
  - Featured courses grid with clearer progress indicators.
  - "How it works" / Academy features section.
- **Course View**: Create a sidebar-based course player:
  - Left/Right sidebar (RTL) for lesson navigation.
  - Main content area for video/text.
  - Tabs for Course Overview, Resources, and Quizzes.
- **Student Dashboard**: 
  - Summary cards for enrolled courses, completed lessons, and quiz scores.
  - "Continue Learning" shortcut to the last accessed lesson.

## Administrative Features (Backend & Admin UI)
- **Admin Dashboard**:
  - Statistics on total students, sales, and course popularity.
  - User management (promote students to instructors/admins).
  - Course builder: drag-and-drop ordering for lessons.
- **Quiz System**:
  - Implementation of the quiz logic to automatically grade and store results.
  - Detailed result view for students.

## Technical Details
- **Schema Updates**:
  - Ensure `profiles` table handles phone-based auth correctly (already mapped).
  - `course_categories` table for better organization.
  - `user_progress` table for tracking lesson completion.
- **Authentication**:
  - Finalize phone-based login flow to ensure a seamless "number-only" experience.
- **RTL/Arabic Support**:
  - Consistent use of "Cairo" font and Tailwind `rtl` utilities.
