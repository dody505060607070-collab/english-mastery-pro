# Visual and Functional Academy Upgrade Plan

This plan transforms the academy into a production-ready platform with custom course imagery, a robust payment verification system, and a comprehensive admin control center.

## User Requirements
- High-quality, relevant images for all courses and sections.
- Course detail view with integrated payment instructions.
- Payment method: Vodafone Cash & InstaPay (Wallet: 01016177688).
- Payment verification: Students must upload a transfer screenshot and the sender's number.
- Admin Account: Phone `01016177688` / Password `01016177688` (full dashboard access).
- Authentication: Purely phone-based (no emails).

## Proposed Changes

### 1. Database & Backend
- **Payment Requests Table**: New table `payment_requests` to track manual payment submissions (user_id, course_id, amount, sender_number, screenshot_url, status: pending/approved/rejected).
- **Course Media**: Update `courses` table with real high-resolution placeholder URLs.
- **Admin Promotion**: SQL migration to ensure the user with phone `01016177688` is an admin.

### 2. UI/UX Enhancements
- **Course Detail Modal/Route**: New interactive page/modal for course details featuring:
  - Rich curriculum list.
  - "Enroll Now" trigger showing the new payment flow.
- **Payment Flow UI**:
  - Selection between Vodafone Cash and InstaPay.
  - Display of the wallet number (01016177688).
  - File upload for the transfer receipt.
  - Input field for the sender's phone number.
- **Enhanced Visuals**: Replace generic icons with thematic, high-quality images across the landing page.

### 3. Admin Dashboard
- **Admin Management Panel**:
  - **Payment Verification**: Interface to review pending receipts, view screenshots, and approve/reject enrollments.
  - **User Management**: View all registered users by phone.
  - **Course Management**: Edit course details and images directly.

### 4. Authentication Logic
- **Phone-Only Auth**: Ensure the login/signup flow strictly uses phone numbers (pre-filling a virtual @academy.local email for Supabase compatibility behind the scenes).

## Technical Details
- **Tables**: `payment_requests` (id, user_id, course_id, amount, status, screenshot_path, sender_phone, created_at).
- **RLS**: Admins can see all `payment_requests`; users can see only their own.
- **Image Handling**: Use high-quality Unsplash source URLs for course thumbnails.
