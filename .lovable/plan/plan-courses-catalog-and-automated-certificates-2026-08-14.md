# Plan: Courses Catalog and Automated Certificates

Implement a dedicated courses page with filters and an automated certificate system with PDF generation and storage.

## User Review Required

> [!IMPORTANT]
> - The certificate will be generated automatically upon 100% course completion and saved to your profile.
> - The new "Courses" page will be public so potential students can browse before signing up.

- Do you have specific levels (e.g., A1, A2, B1, B2, C1, C2) or durations you want to prioritize in the filters?
- Should the certificate download be available for public viewing or only for the student?

## Proposed Changes

### Database Schema
- **Certificates Table**:
    - Create `public.certificates` table to store earned certificates.
    - Fields: `id`, `user_id`, `course_id`, `issued_at`.
    - Enable RLS: Students can read their own certificates.
- **Courses Table**:
    - Add `duration_hours` (int) or `duration_text` (text) to `courses` for filtering.

### Courses Page (`/courses`)
- Create `src/routes/courses.tsx`.
- Implement a search bar and filter chips for:
    - **Level**: Beginner, Intermediate, Advanced.
    - **Category**: General English, Business English, etc.
    - **Price**: Free vs. Paid.
- Reuse the glassmorphism card design for course items.

### Automated Certificates
- **Logic**:
    - Update `src/routes/_authenticated/course/$courseId.tsx` to automatically insert a record into `certificates` table when `totalProgress === 100`.
- **Dashboard Enhancement**:
    - Update `src/routes/_authenticated/dashboard.tsx` to display a gallery of earned certificates with a "Download PDF" button.
- **Component**: Create a reusable `CertificateTemplate` component for consistent generation.

### Navigation
- Add "Courses" link to the main header in `src/routes/index.tsx` and any other layout headers.

## Technical Details
- **Filtering**: Instant client-side filtering using `useState` and `.filter()`.
- **Certificate Generation**: Use existing `html2canvas` + `jsPDF` logic but refactored for reusability.
- **Database Security**: Ensure `GRANT` statements are included for the new `certificates` table.
