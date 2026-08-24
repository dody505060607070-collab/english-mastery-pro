# English Academy Platform Redesign Phase 2

Implementing advanced student features, profile management, and enhanced administrative reporting.

## User Requirements
- Profile page (name, photo, phone, session management).
- Accurate progress tracking (percentage per lesson, save last view).
- Student subscription page (plan, payment status, invoices).
- PDF reports for admin (student stats, progress, quiz analysis).

## Proposed Features

### 1. Profile Management
- **Route**: `/profile`
- **Functionality**: Edit name, upload avatar, update phone number.
- **Security**: Manage active sessions.

### 2. Enhanced Progress Tracking
- **Logic**: Track "last viewed" lesson and calculate accurate completion percentage based on lessons completed vs total lessons in a course.

### 3. Subscription & Billing
- **Route**: `/subscription`
- **Functionality**: Display current plan, payment history, and renewal options.

### 4. Admin Reporting (PDF)
- **Logic**: Generate summaries using a client-side or server-side PDF generator (e.g., `jspdf`).

## Technical Details
- **Schema Updates**: New fields in `profiles` (avatar_url), `user_progress` (last_viewed_at), and potentially a `subscriptions` table.
- **Components**: Profile form, Billing table, Report generator.

## Implementation Steps
1. **Database Update**: Migration for profile enhancements and subscription tracking.
2. **Profile Page**: Create the UI and logic for user profile management.
3. **Progress Logic**: Update the lesson player to save "last viewed" state.
4. **Subscription UI**: Build the billing and plan management page.
5. **Admin Reports**: Implement the PDF generation logic in the admin panel.
