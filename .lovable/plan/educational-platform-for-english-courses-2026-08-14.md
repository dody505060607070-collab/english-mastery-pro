# Educational Platform for English Courses

Building a complete English course platform with authentication, course management, and a modern UI.

## User Requirements
- English language academy platform
- Full login/authentication details
- Comprehensive features (courses, details, etc.)
- Arabic language support (RTL)

## Proposed Features
- **Authentication**: Sign up, Login, Profile management.
- **Course Catalog**: List of available English courses with categories (General, IELTS, Business, etc.).
- **Course Details**: Curriculum, instructor info, pricing.
- **Dashboard**: For students to track progress.
- **Admin Panel**: To manage courses and students.

## Technical Details
- **Framework**: TanStack Start (React 19)
- **Styling**: Tailwind CSS v4 (RTL support via `dir="rtl"`)
- **Database**: Lovable Cloud (Supabase)
- **State Management**: TanStack Query
- **Components**: shadcn/ui

## Implementation Steps
1. **Database Schema**: Define tables for `profiles`, `courses`, `lessons`, `enrollments`.
2. **Authentication Flow**: Setup login/register pages.
3. **Landing Page**: Hero section, course highlights, testimonials.
4. **Course Management**: Pages to view and enroll in courses.
5. **RTL Support**: Ensure layout works for Arabic users.
