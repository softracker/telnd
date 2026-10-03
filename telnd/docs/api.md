# TELND API

## Base URL

```
Development: http://localhost:3001/api
Production: https://api.telnd.com/api
```

## Authentication

All authenticated endpoints require:
```
Authorization: Bearer <token>
```

## Response Format

### Success
```json
{
  "success": true,
  "data": { ... }
}
```

### Paginated
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": { ... }
  }
}
```

## Endpoints

### Auth
- `POST /api/auth/signup` — Register
- `POST /api/auth/login` — Login
- `POST /api/auth/otp/request` — Request OTP
- `POST /api/auth/otp/verify` — Verify OTP

### Jobs
- `GET /api/jobs` — Search jobs
- `GET /api/jobs/:id` — Get job details
- `POST /api/jobs` — Create job (auth required)

### Users
- `GET /api/users/me` — Get current user
- `GET /api/users/me/applications` — Get applications

### Companies
- `GET /api/companies/:slug` — Get company
- `GET /api/companies/:slug/jobs` — Get company jobs

## Admin API

### Dashboard
- `GET /api/admin/dashboard` - Get admin dashboard stats

### User Management
- `GET /api/admin/users` - List portal users, always paged (DataTables envelope `{items, page, pageSize, totalPages, filteredTotal, total}`; `search` over name/email/phone plus the words `active`/`suspended`/role names, `role` filter on the UserRole enum — unknown value is 400; role ADMIN is never listed)
- `GET /api/admin/users/:id` - Get user details (with capabilities, the full live-session list and the trusted-device list — newest first; credential fields and session/trust secrets never included)
- `PATCH /api/admin/users/:id/suspend` - Suspend user (revokes sessions, refresh lineages and trusted-device grants; `users.edit` or `admins.edit`)
- `PATCH /api/admin/users/:id/activate` - Activate user (`users.edit` or `admins.edit`)
- `POST /api/admin/users/:id/revoke-access` - Sign the user out everywhere: wipes sessions, refresh lineages and trusted-device grants while the account stays active (`users.edit` or `admins.edit`; returns the revoked counts)
- `PATCH /api/admin/users/:id/two-factor` - Require or release two-factor for one portal user (super admin; releasing lifts the demand but keeps the user's own enrollment; requiring revokes live sessions)
- `POST /api/admin/users/:id/two-factor/disable` - Turn two-factor off for one portal user (super admin + PIN; wipes secret, method, recovery codes and trusted-device grants, leaves the per-user requirement untouched, emails the holder when an enrollment went away)
- `POST /api/admin/users/:id/reset-password` - Email this user a single-use password-reset link (super admin; 60-minute token, a re-send invalidates the previous link, a failed send discards the token)
- `DELETE /api/admin/users/:id` - Delete a portal user (`users.delete`; ADMIN accounts answer 404 — two-door; linked records answer 409 `IN_USE`)

### Feature Flags
- `GET /api/admin/features` - List feature flags
- `POST /api/admin/features` - Create feature flag
- `PATCH /api/admin/features/:id` - Update feature flag
- `DELETE /api/admin/features/:id` - Delete feature flag

### Maintenance Mode
- `GET /api/admin/maintenance` - Get maintenance status
- `POST /api/admin/maintenance` - Set maintenance mode

### Reports
- `GET /api/admin/reports` - List reports
- `PATCH /api/admin/reports/:id` - Update report status

### Audit Log
- `GET /api/admin/audit-log` - List audit logs

### Roles
- `GET /api/admin/roles` - List admin roles
- `POST /api/admin/roles` - Create admin role

## Map API

### Pins
- `GET /api/map/pins` - List map pins (with type, location, radius filters)
- `GET /api/map/pins/:id` - Get pin details
- `POST /api/map/pins` - Create/upsert map pin
- `DELETE /api/map/pins/:id` - Delete map pin

### Bookmarks
- `GET /api/map/bookmarks` - List user bookmarks
- `POST /api/map/bookmarks` - Bookmark a pin
- `DELETE /api/map/bookmarks/:pinId` - Remove bookmark

### Geocoding
- `GET /api/map/geocode?address=...` - Geocode address
- `GET /api/map/reverse-geocode?lat=...&lng=...` - Reverse geocode

## Package & Subscription API

### Packages
- `GET /api/packages` - List packages (with type filter)
- `GET /api/packages/:id` - Get package details

### Subscriptions
- `POST /api/packages/subscribe` - Subscribe to package
- `GET /api/packages/subscriptions/mine` - Get user subscriptions
- `PATCH /api/packages/subscriptions/:id/cancel` - Cancel subscription

### Invoices
- `GET /api/packages/invoices/mine` - Get user invoices

### Wallet
- `GET /api/packages/wallet` - Get wallet balance
- `GET /api/packages/wallet/transactions` - Get wallet transactions

### Coupons
- `POST /api/packages/coupons/validate` - Validate coupon code
- `POST /api/packages/coupons/apply` - Apply coupon

## Support API

### Tickets
- `POST /api/support/tickets` - Create support ticket
- `GET /api/support/tickets` - List user tickets
- `GET /api/support/tickets/:id` - Get ticket details
- `POST /api/support/tickets/:id/messages` - Add message to ticket

### Admin Support
- `GET /api/support/admin/tickets` - List all tickets (admin)
- `PATCH /api/support/admin/tickets/:id` - Update ticket (admin)
- `POST /api/support/admin/tickets/:id/messages` - Reply to ticket (admin)

## Merchant API

### Listings
- `GET /api/merchant` - List merchants
- `GET /api/merchant/:slug` - Get merchant by slug
- `POST /api/merchant` - Create merchant
- `PATCH /api/merchant/:id` - Update merchant

### Staff
- `GET /api/merchant/:id/staff` - List staff
- `POST /api/merchant/:id/staff` - Add staff member
- `DELETE /api/merchant/:id/staff/:staffId` - Remove staff

### Students
- `GET /api/merchant/:id/students` - List students
- `POST /api/merchant/:id/students` - Enroll student

### Courses
- `GET /api/merchant/:id/courses` - List courses
- `POST /api/merchant/:id/courses` - Create course

### Attendance
- `POST /api/merchant/:id/attendance` - Mark attendance
- `GET /api/merchant/:id/attendance` - Get attendance records

### Exams
- `POST /api/merchant/:id/exams` - Create exam
- `GET /api/merchant/:id/exams` - List exams

### Announcements
- `GET /api/merchant/:id/announcements` - List announcements
- `POST /api/merchant/:id/announcements` - Create announcement

### Fees
- `POST /api/merchant/:id/fees` - Create fee
- `GET /api/merchant/:id/fees` - List fees

### Routine
- `GET /api/merchant/:id/routine` - Get routine
- `POST /api/merchant/:id/routine` - Add routine entry

## LMS API

### Courses
- `GET /api/lms/courses` - List courses
- `GET /api/lms/courses/:slug` - Get course by slug
- `POST /api/lms/courses` - Create course
- `PATCH /api/lms/courses/:id` - Update course

### Modules
- `GET /api/lms/courses/:courseId/modules` - List modules
- `POST /api/lms/courses/:courseId/modules` - Create module

### Lessons
- `POST /api/lms/modules/:moduleId/lessons` - Create lesson

### Enrollment
- `POST /api/lms/enroll` - Enroll in course
- `GET /api/lms/enrollments` - Get user enrollments

### Progress
- `POST /api/lms/progress` - Update lesson progress

### Quizzes
- `POST /api/lms/courses/:courseId/quizzes` - Create quiz
- `GET /api/lms/courses/:courseId/quizzes` - List quizzes

### Assignments
- `POST /api/lms/courses/:courseId/assignments` - Create assignment

### Discussions
- `POST /api/lms/courses/:courseId/discussions` - Create discussion
- `GET /api/lms/courses/:courseId/discussions` - List discussions

### Certificates
- `GET /api/lms/certificates` - Get user certificates

## Analytics API

### Admin
- `GET /api/analytics/admin/overview` - Platform overview
- `GET /api/analytics/admin/users` - User analytics
- `GET /api/analytics/admin/jobs` - Job analytics

### User
- `GET /api/analytics/user/profile` - User profile analytics

### Employer
- `GET /api/analytics/employer/jobs` - Employer job analytics

### Tutor
- `GET /api/analytics/tutor/bookings` - Tutor booking analytics
