# Advanced Features for English Academy Platform

Implementing course content viewing, student dashboards, admin management, and automated quizzes.

## User Requirements
- Course content pages (content, progress, final test).
- Student dashboard (enrolled courses, progress percentage, activity log).
- Admin panel (manage courses, lessons, students, subscriptions, permissions).
- Quizzes and assessments (automated scoring, answer saving).

## Proposed Features
- **Course Viewer**: A dedicated route for lessons with a progress sidebar.
- **Student Dashboard**: Overview of learning journey and enrolled courses.
- **Admin Dashboard**: Comprehensive management interface for admins/instructors.
- **Quiz System**: Interactive questions at the end of lessons or courses.
- **Role-based Access**: Ensuring admins can edit while students only view.

## Technical Details
- **Schema Updates**: Adding `user_progress`, `quizzes`, `questions`, and `answers` tables.
- **Protected Routes**: Using pathless layouts for auth and role checks.
- **State Management**: TanStack Query for data fetching and mutations.

## Implementation Steps
1. **Schema Update**: Implement tables for progress tracking and quizzes.
2. **Admin Panel**: Create routes for management tasks.
3. **Student Dashboard**: Create a personalized area for learners.
4. **Course Viewer & Quizzes**: Implement the actual learning interface.
