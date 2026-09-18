# TELND Features Documentation

## Dark Mode & Theme System

### Web App
- ThemeToggle component in header
- Light, Dark, System modes
- System mode uses `prefers-color-scheme` media query
- Persisted in localStorage
- CSS variables for dynamic theming
- Tailwind `dark:` variants throughout

### Mobile App (Flutter)
- ThemeToggle widget in AppBar
- Light, Dark, System modes
- System mode uses platform brightness
- Persisted via SharedPreferences
- Material 3 themes with full color customization

## Map Feature

### Location Display Rules
- **Exact location**: Jobs, Companies, Merchants (full address + precise coordinates)
- **Approximate location**: Tutors, Freelancers, Creators (area name + coords ±500m)

### Features
- Interactive map with clustered markers
- Filter by type (jobs, tutors, creators, merchants)
- Search by location/area
- Bookmark locations
- Auto-sync with listings (CRUD operations)
- Geocoding with Redis caching

## Admin System

### Roles
- Super Admin, Admin, Moderator, Support Agent
- Custom role-based permissions per module/action
- Permission granularity: view, create, edit, delete, approve, suspend

### Feature Management
- Feature flags with rollout percentages
- Per-role feature access
- Global maintenance mode
- Per-user feature suspension

### Monitoring
- Audit logging for all admin actions
- User reports and moderation
- Platform health metrics

## Merchant System

### Types
- Coaching Centers, Schools, Colleges, Universities, Training Institutes

### Features
- Institution profile management
- Staff management (roles: Owner, Admin, Teacher, Accountant)
- Student enrollment and tracking
- Course management
- Attendance tracking (manual, QR code)
- Exam creation and result publishing
- Fee collection and tracking
- Announcement system
- Routine/schedule management

## LMS System

### Course Management
- Modules/sections organization
- Lesson types: Video, Text, Quiz, Assignment, Live Class, Document
- Course categories and tags
- Prerequisites

### Live Classes
- Real-time video (WebRTC)
- Screen sharing
- Chat during class
- Recording

### Assessments
- Quizzes (multiple choice, true/false, short answer)
- Assignments with file upload
- Auto-grading for quizzes
- Peer review

### Progress Tracking
- Lesson completion tracking
- Quiz scores and assignment grades
- Overall course progress
- Certificates on completion

## Packages & Subscriptions

### User Packages
- Free, Pro, Premium tiers
- Admin-configurable features and limits

### Employer Packages
- Per Job Post, Monthly, Yearly subscriptions
- Custom enterprise options

### Merchant Packages
- Starter, Growth, Scale tiers
- Student and feature limits

## Coupon System

### Types
- Percentage discount
- Fixed amount
- Free trial
- Upgrade coupons
- Referral codes

### Rules
- Usage limits (total and per user)
- Expiry dates
- Minimum purchase requirements
- Package-specific applicability

## Support System

### Ticket Management
- Categories and priority levels
- Status tracking (Open, In Progress, Resolved, Closed)
- File attachments
- Internal notes

### Live Chat
- Real-time messaging
- Bot responses
- Escalation to human agents

## Analytics

### Admin Analytics
- User growth metrics
- Job posting statistics
- Revenue tracking
- Geographic distribution

### User Analytics
- Application statistics
- Profile views
- Learning progress

### Employer Analytics
- Job performance metrics
- Application metrics
- Hire conversion rates

### Tutor Analytics
- Booking and earnings
- Student ratings
- Class attendance

## Security

### Anti-Scraping
- robots.txt blocking AI scrapers
- Honeypot fields
- Rate limiting
- CAPTCHA on sensitive actions

### Data Protection
- End-to-end encryption for messaging
- Data masking for PII
- GDPR compliance tools

### Verification
- Document verification (OCR + AI)
- Face matching
- Tampering detection
