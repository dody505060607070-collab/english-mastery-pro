# Admin and Phone Login Setup

Implementing phone-based authentication and preparing the admin account.

## User Requirements
- Admin credentials:
  - Phone: `01016177688`
  - Password: `01016177688`
- Replace email login with phone login entirely.

## Implementation Plan
1. **Update Auth Page**: Modify `src/routes/auth.tsx` to use phone number instead of email.
2. **Database Support**: Ensure the `profiles` table has a `phone` column.
3. **Admin Creation**: Since I cannot create the auth user directly in the database without a UUID and hashed password reliably, I will instruct the user to "Sign Up" with these credentials first. Then I will run a script/query to promote that user to `admin`.

## Next Steps
- User should sign up on the `/auth` page with the phone `01016177688`.
- Once signed up, I will run a query to set their role to `admin`.
