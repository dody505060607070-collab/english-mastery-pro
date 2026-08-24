# Plan: Comprehensive Admin Overhaul and Role System

Overhaul the admin dashboard with a professional interface, advanced RBAC, and granular control over all platform entities.

## User-facing changes

- **Advanced Admin Dashboard**: A new, feature-rich panel with analytics, user management, course editing, and source control.
- **Granular Roles**: Users can have roles like Super Admin, Teacher, Editor, or Student, with specific permissions.
- **Course & Content Management**: Comprehensive tools for admins to manage courses, lessons, and resources.
- **Activity Logs**: View actions taken by admins and students for transparency.
- **Enhanced Student Experience**: Personalized dashboards showing progress, certificates, and achievements.

## Technical details

### 1. Database & Security
- **RBAC Refinement**: Expand the `app_role` enum and `user_roles` system.
- **Permissions System**: Create a `permissions` and `role_permissions` table to map specific actions to roles.
- **Activity Logging**: Create an `activity_logs` table and a DB function to capture critical events.
- **RLS Policies**: Update RLS on all tables to respect the new role-based permissions.
- **Audit Triggers**: Add triggers to automatically log changes to critical data.

### 2. Server Functions
- **Admin Management Functions**: New server functions in `src/utils/admin.functions.ts` for managing users (blocking, changing roles), courses, and resources.
- **Security Middlewares**: Implement role-based guards for server functions.

### 3. UI/UX (Frontend)
- **Modular Admin Dashboard**: Move from a single-file `admin.tsx` to a modular structure in `src/routes/_authenticated/admin/`.
- **New Modules**:
    - **Users**: Search, filter, edit profile, manage roles, block/unblock.
    - **Courses**: Full CRUD for courses, units, lessons, and assignments.
    - **Resources**: Centralized management for media, PDFs, and links.
    - **Vocabulary & TTS**: Advanced dictionary management with integrated American/British TTS.
    - **Quiz Builder**: Dynamic builder for multiple-choice, true/false, and audio questions.
- **Gamification & Progress**: Update student dashboard with advanced charts and milestone tracking.

## Implementation Steps

1. **Schema Migration**: Add new roles, permissions, activity logs, and content fields (e.g., American/British audio fields).
2. **Server Logic**: Create `src/utils/admin.functions.ts` with secure handlers.
3. **Core Components**: Build reusable admin components (data tables, status badges, forms).
4. **Admin Route Rebuild**: Replace `src/routes/_authenticated/admin.tsx` with a layout and children routes for each module.
5. **Student UI Enhancements**: Polish the student dashboard and progress tracking.
6. **Verification**: Conduct thorough testing of RLS policies and role-based access.
