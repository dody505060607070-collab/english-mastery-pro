# Plan - Implementation of Subscription Management Page

The user wants to add a subscription management page to "Blue Language Academy". This page will allow users to manage their subscriptions, upgrade plans, cancel subscriptions, and view billing details. 

## Proposed Changes

### Database & Security
- Ensure the `subscriptions` table is accessible and has appropriate RLS policies.
- Ensure the `payment_requests` system supports plan upgrades.

### Frontend
- **Update Subscription Page**: Overhaul `src/routes/_authenticated/subscription.tsx` with a 3D glassmorphism UI matching the platform's aesthetic.
- **Features**:
  - Display current plan details (name, price, status, expiry date).
  - Integration with the manual payment system (Vodafone Cash / InstaPay) for upgrades.
  - History of billing (invoices/receipts).
  - "Cancel Subscription" flow (simple confirmation).
- **Navigation**:
  - Add "إدارة الاشتراك" (Manage Subscription) link to the Profile page's subscription tab.
  - Update `src/routes/index.tsx` to include a link to this page for authenticated users if relevant.

## Technical Details
- **UI Components**: Use `Tabs`, `Card`, `Badge`, `Progress`, and `Dialog` from shadcn/ui.
- **Animations**: Use `framer-motion` for smooth transitions and 3D effects.
- **State Management**: Use `TanStack Query` for fetching and updating subscription data.
- **Styling**: Tailwind CSS v4 with custom glassmorphism utilities.

## User Review Required
> [!IMPORTANT]
> The current payment system uses manual verification (screenshots). Upgrading a plan will follow this same manual workflow: the user selects a plan, pays via wallet, uploads the screenshot, and the admin approves.

- Do you want to add specific premium plans (e.g., Monthly, Yearly, VIP) now, or should I just build the management interface for the current system?
- Should I add a "Billing History" section where users can download their past transaction receipts?
