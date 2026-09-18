# TELND — Complete Documentation

## Career & Talent Platform

---

# Table of Contents

1. Executive Summary
2. Product Vision & Overview
3. Target Users & Account Types
4. Features & Capabilities
5. Technical Architecture
6. Technology Stack
7. Database Design
8. API Reference
9. Authentication & Security
10. Caching & Performance
11. Deployment & Infrastructure
12. Development Workflow
13. Implementation Timeline
14. File Structure
15. Environment Configuration

---

# 1. Executive Summary

**TELND** is a comprehensive career and talent ecosystem focused on Bangladesh. One platform, multiple everyday needs — jobs, tutoring, projects, Influencers, and local services (fix) in one ecosystem instead of separate platforms.

**Core Product Loop:** Learn → Practice → Assess → Match → Apply → Interview → Offer → Get Hired → Grow

**Key Differentiators:**
1. **One Platform, Multiple Needs** — Jobs, tutoring, projects, Influencers, and local services (fix) in one ecosystem
2. **Intelligent Matching, Not Just Search** — Matches based on skills, qualifications, location, availability, experience, requirements, and preferences
3. **Strict-Match Hiring** — Only candidates who meet predefined requirements can apply
4. **Opportunity → Preparation → Hiring** — Test skills, practice interviews, improve CV, generate cover letters, then apply
5. **Verified People and Opportunities** — Identity/student/company verification for trust
6. **Local-First, Bangladesh-Focused** — Understands Bangladesh-specific realities
7. **Two-Sided Ecosystem** — Job seeker, tutor, project creator, service provider — one account

---

# 2. Product Vision & Overview

## 2.1 Product Modules

| Module | Description |
|--------|-------------|
| TELND Jobs | Job opportunities marketplace |
| TELND Hire | Employer recruitment tools |
| TELND Assess | Company assessments |
| TELND Mock | Interview and test preparation |
| TELND Learn | Courses and learning |
| TELND Workforce | TELND's own recruitment/outsourcing |

## 2.2 Vision

TELND is a full career lifecycle platform — not just a job board. It combines:
- Job marketplace
- AI-powered career assistance
- Skill assessments and certifications
- Learning/courses
- Recruitment management for employers
- Workforce/outsourcing (TELND as employer)

---

# 3. Target Users & Account Types

## 3.1 Account Types

### General Account
- Jobs (Corporate, General, Government via modal selection)
- Find Tutors
- Project Works (post and apply)
- Influencer listing (consent + upload avatar)
- Package range: 0-199 BDT

### Influencer Account
- **No separate account needed** — creators list from General Account
- Creator listing requires consent acceptance
- Upload creator avatar and profile pictures
- Elite/Premium Influencers added by admin only

### Employer Account (3 Types)
- **General Job Employer** — posts general jobs + project works
- **Corporate Job Employer** — posts corporate jobs + project works (verification required)
- **Government Job Employer** — admin-created accounts only
- All three can post project works

### Merchant Account
- Institution/coaching center management

### Admin Account
- Platform administration
- Can enable/disable job types (Corporate, General, Government)
- Can create government job accounts
- Can add Elite/Premium Influencers

## 3.2 Account Login Restrictions
- General Account → cannot login to other portals
- Employer Account → cannot login to other portals
- Merchant Account → cannot login to other portals
- Influencer Account → cannot login to other portals
- Admin Account → cannot login to other portals

## 3.3 User Roles

| Role | Description |
|------|-------------|
| General User | Jobs, Tutors, Project Works, Creator listing |
| Corporate Employer | Corporate jobs + project works (verified) |
| General Employer | General jobs + project works |
| Government Employer | Admin-created, government jobs |
| Creator | Tutor + Influencer (from general account) |
| Merchant | Institution owner |
| Admin | Platform administrator |

## 3.4 Multi-Type Accounts

- **Candidate** — Job seeker
- **Employer** — Company/recruiter
- **Admin** — Platform administrator
- **Creator** — Course/Influencer
- **Freelancer** — Independent worker
- **Agency** — Recruitment agency
- **Tutor** — Teaching services
- **Merchant** — Institution owner

Users can have multiple account types with seamless switching between roles.

---

# 4. Features & Capabilities

## 4.1 Authentication

### Login/Signup Methods
- Email + password
- Phone number + OTP
- Google social login
- Facebook social login
- LinkedIn social login

### Account Linking
- Users can connect multiple login methods to one TELND account
- Social accounts link to existing user accounts

### Security
- Password hashing (bcrypt, 12+ rounds)
- JWT with short expiry (15 min access, 7 day refresh)
- Refresh token rotation
- Session management with device tracking
- Multi-factor authentication (MFA) support

## 4.2 Candidate Career Profile

### Personal Information
- Name, photo, phone, email
- Location, nationality, languages
- About me

### Professional Information
- Current position, desired position
- Career level, experience, industries
- Employment type, expected salary
- Preferred locations
- Remote/hybrid/on-site preference
- Availability and notice period

### Education
- Degree, institution, major
- Graduation year, GPA/CGPA
- Certifications

### Skills
- Technical skills, soft skills, industry skills
- Skill level and years of experience

### Experience
- Company, position, employment period
- Responsibilities and achievements

### Portfolio
- Projects, GitHub, LinkedIn
- Personal website
- Creative/professional links

### TELND Career Score
Based on: Profile completeness, Skills assessment, Experience, Education, Assessments taken, Certifications, Platform activity

## 4.3 AI Career Assistant

### Capabilities
- Natural-language job search
- Search jobs, explain matches
- Track applications
- Improve CVs, generate cover letters
- Prepare for interviews
- Recommend courses
- Identify skill gaps
- Provide salary guidance
- Send reminders

## 4.4 Intelligent Job Search

### Search Methods
- Keyword search
- Natural-language search
- AI-assisted search

### Filters
- Location, distance
- Salary range
- Experience level
- Education requirements
- Industry
- Job type (full-time, part-time, contract)
- Workplace type (remote, hybrid, on-site)
- Company, posting date

### Ranking
- Location-aware ranking using geographic distance
- Personalized recommendations
- Relevance and proximity prioritized

## 4.5 AI Job Matching

### Matching System
Simple and transparent — most match on top, lower matches below.

### Match Score Based On
Skills, qualifications, location, availability, experience, requirements, preferences

### Strict-Match Hiring
- Employers can activate Strict Match
- Only candidates who meet all predefined requirements can apply
- Reduces irrelevant applications

## 4.6 Job Listings & Applications

### Job Types (Two Categories)
When user clicks "Jobs", a popup appears to select job type:

**Corporate Jobs:** Companies, Banks, Startups, NGOs, Factories, Agencies, Schools/Universities, Corporate Organizations

**General Jobs:** Shops, Restaurants, Drivers, Delivery Businesses, Garages, Salons, Hotels, Construction Businesses, Households, Small Businesses

### Pre-Defined Data
- Job Types, Job Posts/Categories, Employment Types, Workplace Types
- University List (all recognized in Bangladesh)
- Degree Levels, Major/Department List
- Divisions, Districts, City/Area Lists
- Salary Ranges by job type and experience
- Skills List, Certification List, Company Sizes, Industry Sectors

### Job Creation (Employer)
- Job type auto-set based on popup selection
- Title, company, department
- Location (with geospatial data)
- Salary range, employment type, workplace type
- Number of vacancies, application deadline

### Job Visibility Options
- Normal, Featured, Urgent, Sponsored

## 4.7 Application Tracker

### Candidate Timeline
Applied → Viewed → Shortlisted → Assessment → Interview → Final Interview → Offer → Hired

## 4.8 Employer Dashboard

### Recruitment Pipeline
New → Screening → Shortlisted → Interview → Offer → Hired

### Candidate Search
- By skills, experience, education
- By university, location, salary
- By career level, assessment score
- By availability

## 4.9 Assessments

### Assessment Types
- English proficiency
- Logical reasoning
- Excel skills
- Technical knowledge
- Industry knowledge
- Personality/situational tests
- Role-specific tests

## 4.10 TELND Online Mock Tests

### Categories
- English, mathematics, logical reasoning
- General knowledge, aptitude
- Communication and professional skills
- Excel, PowerPoint, accounting
- Marketing, programming, data analysis
- Bank/Corporate/Government recruitment tests

## 4.11 AI Mock Interview

### Features
- Voice/video interviews
- Text-based interviews
- Role-specific sessions
- AI evaluation of answers
- Score reports and recommendations

## 4.12 AI CV & Cover Letter Tools

### CV Builder
- Multiple professional templates
- AI-assisted content generation
- Job-specific CV optimization

### CV Upload & Management (CV Box)
- Upload existing CV as PDF or image (JPG/PNG)
- AI-powered OCR extracts all information automatically
- Auto-populates profile fields (education, experience, skills)
- Store multiple CVs in "CV Box" for different job types
- Select specific CV when applying; auto-applies if only one exists
- CV preview, version tracking, and management

### Cover Letters
- AI-generated career summaries
- AI-generated cover letters

## 4.13 TELND Learn — Courses

### Course Types
- Free courses, Paid courses
- Video lessons, PDFs, Quizzes, Assignments
- Progress tracking

### Topics
- CV writing, interviews
- English, Excel
- Digital marketing, programming
- Communication and more

## 4.14 Messaging & Notifications

### In-App Messaging
- Real-time employer-candidate messaging
- Text messages with rich formatting
- Voice messages
- File/document attachments
- Read receipts and delivery status

### Audio Calling
- In-app voice calls (WebRTC)
- Call scheduling and reminders
- Call history and duration tracking

### Notifications
- Application status changes
- Interview reminders
- Assessment reminders
- Offer notifications
- New message alerts
- AI-driven personalized job alerts

## 4.15 Trust, Verification & Safety

### Candidate Verification
- Phone, email, identity, education, experience, skills verification

### Document Verification
- AI-powered ID card verification
- OCR for data extraction
- Face matching between ID photo and live selfie
- Document authenticity detection
- Manual review queue

### Verification Badge System (Both Employers & Job Holders)
- **Optional verification** — users choose to verify their account
- Verified accounts display a **verification badge** (✓) on profile and listings
- Badge tiers: Phone Verified, Email Verified, Identity Verified, Company Verified
- Admin can manually mark **new or known companies as verified**
- Builds trust for employers and candidates alike

## 4.16 Salary Intelligence & Career Analytics

### For Candidates
- Market salary estimates by role, location, experience
- Compare expected salary vs market range

### For Employers
- Salary recommendations
- Hiring cost metrics

## 4.17 Map Feature

### Location Display Rules
- **Exact location**: Jobs, Companies, Merchants
- **Approximate location**: Tutors, Freelancers, Creators (±500m)

### Features
- Interactive map with clustered markers
- Filter by type
- Search by location/area
- Bookmark locations
- Auto-sync with listings
- Geocoding with Redis caching

## 4.18 Merchant System

### Merchant Types
- Coaching Centers, Schools, Colleges, Universities, Training Institutes

### Features
- Institution profile management
- Staff management (Owner, Admin, Teacher, Accountant)
- Student enrollment and tracking
- Course management
- Attendance tracking
- Exam creation and result publishing
- Fee collection and tracking
- Announcement system
- Routine/schedule management

## 4.19 LMS System

### Course Management (Admin-Handled)
- **TELND admin handles all course details**
- Admin creates and publishes courses (TELND's own courses)
- Admin adds instructors (their portal login is future work)
- Modules/sections organization
- Lesson types: Video, Text, Quiz, Assignment, Live Class, Document

### Future: Multi-Instructor Platform
- Admin publishes TELND's own courses
- Other instructors can also publish their courses (future)
- Instructor portal login (future work)

### Live Classes (Separate Portal in Future)
- **Live will be completely a separate portal in the future**
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
- Certificates on completion

## 4.20 Packages & Subscriptions

### User Packages
- Free, Pro, Premium tiers
- Admin-configurable features and limits

### Employer Packages
- **Standard Packages (Per Job)**: ৳500/job (Basic), ৳1,000/job (Standard), ৳1,200/job (Premium)
- **VIP Packages (Monthly)**: Silver (৳5,000/mo, 10 jobs), Gold (৳15,000/mo, 50 jobs), Platinum (৳40,000/mo, Unlimited)
- **Pay Later Mode**: Available on ALL packages — use now, pay later (net 15/30 days)
- **Job Boost (Ads Manager)**: Pay-as-you-go from wallet, daily queue, full analytics
- **Logo Customization**: Pro = accent color, Premium = full brand colors
- **Account Verification**: Optional badge for employers AND job seekers
- **Package Upgrades**: Anytime, pro-rated billing

### Wallet System
- Every employer gets a wallet
- Top-up via SSLCommerz (bKash, Nagad, Rocket)
- Used for: job posting, boost, ads, premium features
- Transaction history, invoices, auto-recharge (planned)

### Manual Invoice & Payment System
- Admin can create manual invoices for any user/employer
- Every invoice has a corresponding payment record in payment tables
- When invoice is cancelled, all associated payments are also cancelled
- Admin handles refunds: original payment method, wallet credit, or bank transfer
- Refund status tracking: Pending → Processing → Completed → Failed

### Advertising System
- Free users: See Google Ads + platform ads
- Pro users: Reduced ads
- Premium users: Completely ad-free
- Companies can purchase ad placements

### Merchant Packages
- **To be decided later** — after core features finalized

### Coupon System
- Percentage discount, Fixed amount
- Free trial, Upgrade coupons
- Referral codes

## 4.21 Support System

### Ticket Management
- Categories and priority levels
- Status tracking (Open, In Progress, Resolved, Closed)
- File attachments

### Live Chat
- Real-time messaging with support
- Bot responses for common questions
- Escalation to human agents

## 4.22 Analytics

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

## 4.23 Dark Mode & Theme System

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

## 4.24 Anti-Scraping & Security

- robots.txt blocking AI scrapers (GPTBot, CCBot, Google-Extended)
- Honeypot fields and links
- Rate limiting per IP
- CAPTCHA on sensitive actions
- Data masking for sensitive information
- Watermarks on generated content

## 4.25 Age Restrictions

### Feature Gating by Age
- Job apply: 18+
- Tutor services: 21+
- Freelancing: 18+
- Content creation: 13+ (with parental consent under 18)

---

# 5. Technical Architecture

## 5.1 Architecture Overview

```
Flutter Mobile ─┐
                ├──→ API (Hono) ──→ PostgreSQL + Redis
Next.js Web ────┘         │
                          ├──→ WebSocket Server (Messaging/Video)
                          ├──→ Background Workers (BullMQ)
                          └──→ Object Storage (S3/R2)
```

## 5.2 Monorepo Structure

```
telnd/
├── apps/
│   ├── web/          # Next.js 15 web application
│   ├── mobile/       # Flutter mobile application
│   └── admin/        # Admin dashboard (future)
├── packages/
│   ├── types/        # Shared TypeScript types
│   ├── validation/   # Zod validation schemas
│   ├── config/       # Configuration management
│   ├── utils/        # Shared utilities
│   ├── database/     # Prisma ORM + Redis
│   ├── api/          # Hono API layer
│   └── ui/           # Shared UI components (future)
├── services/
│   └── workers/      # Background job processing
├── infrastructure/
│   ├── docker/       # Dockerfiles
│   └── nginx/        # Nginx configuration
├── docs/             # Documentation
└── scripts/          # Development scripts
```

## 5.3 Data Flow

```
Client (Web/Mobile)
       ↓
   API (Hono)
       ↓
  ┌────┴────┐
  ↓         ↓
PostgreSQL  Redis
  ↓         ↓
Prisma    Cache/Queue
  ↓
Background Workers (BullMQ)
  ↓
Object Storage (S3/R2)
```

## 5.4 Real-Time Features Architecture

### WebSocket Server
- Socket.io for real-time messaging
- WebRTC signaling for video/audio calls
- Redis Pub/Sub for scaling across instances

### Video Interview Architecture
```
Interviewer                          Candidate
     ↓                                    ↓
WebRTC Client ←→ SFU Server ←→ WebRTC Client
                    ↓
            Recording Pipeline
                    ↓
         Object Storage (S3/R2)
                    ↓
         AI Analysis Pipeline
                    ↓
         Transcription + Scoring
```

## 5.5 Document Verification Architecture

```
User uploads document photo
       ↓
Image preprocessing (crop, enhance)
       ↓
OCR extraction (text from image)
       ↓
Document validation (format, authenticity)
       ↓
Face matching (selfie vs ID photo)
       ↓
Auto-approve or flag for review
       ↓
Verification status updated
```

## 5.6 Security Layers

1. Input validation (Zod)
2. Authentication (JWT + sessions)
3. Authorization (role-based)
4. Rate limiting (Redis)
5. CORS configuration
6. Secure headers
7. SQL injection prevention (Prisma)
8. End-to-end encryption (messaging)
9. Document encryption (verification)
10. API key management (integrations)

---

# 6. Technology Stack

## 6.1 Core Technologies

| Layer | Technology |
|-------|-----------|
| Web | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Mobile | Flutter, Dart, Riverpod |
| API | Hono (TypeScript) |
| Database | PostgreSQL + PostGIS |
| Cache/Queue | Redis + BullMQ |
| ORM | Prisma |
| Validation | Zod |
| Storage | S3-compatible (Cloudflare R2) |

## 6.2 Why These Technologies?

### Hono for API
- Lightweight and fast
- Edge-runtime compatible
- Works with Next.js API routes and standalone
- TypeScript-first

### Prisma
- Excellent TypeScript support
- Type-safe database queries
- Built-in migrations
- Good PostgreSQL/PostGIS support

### Flutter for Mobile
- Single codebase for Android/iOS
- Strong performance on low-end devices
- Rich widget ecosystem

### PostgreSQL + PostGIS
- PostGIS for geospatial queries
- pgvector for semantic matching (future)
- Battle-tested at scale

## 6.3 External Services

| Service | Provider |
|---------|----------|
| Maps | Google Maps API |
| Payment | SSLCommerz |
| Mobile Money | bKash, Nagad, Rocket |
| CDN/DDoS | Cloudflare |
| Storage | Cloudflare R2 |
| Email | SMTP / SendGrid |
| SMS | Local SMS provider |
| Push | Firebase Cloud Messaging |
| AI | OpenAI API |

---

# 7. Database Design

## 7.1 Core Tables

### User & Authentication
- **User** — Authentication and basic info
- **Session** — Active sessions
- **RefreshToken** — Token refresh
- **UserCapability** — User capabilities (Job Seeker, Tutor, etc.)

### Candidate System
- **CandidateProfile** — Candidate career profiles
- **Education** — Candidate education
- **Skill** — Candidate skills
- **Experience** — Work experience
- **Portfolio** — Portfolio items

### Employer System
- **Company** — Employer companies
- **CompanyTeamMember** — Company team

### Job System
- **JobPosting** — Job listings
- **Application** — Job applications
- **Interview** — Interview schedules
- **Offer** — Job offers

### Tutor System
- **TutorProfile** — Tutor profiles
- **TutorBooking** — Tuition bookings
- **TutorClass** — Tuition classes
- **TutorExam** — Tutor exams
- **TutorReport** — Tutor reports

### Merchant System
- **Merchant** — Institution profiles
- **MerchantStaff** — Staff members
- **MerchantStudent** — Enrolled students
- **MerchantCourse** — Courses offered
- **MerchantAttendance** — Attendance records
- **MerchantExam** — Exams
- **MerchantAnnouncement** — Announcements
- **MerchantFee** — Fee collection
- **MerchantRoutine** — Class schedules
- **MerchantDocument** — Documents

### LMS System
- **LMSCourse** — Online courses
- **LMSModule** — Course modules
- **LMSLesson** — Course lessons
- **LMSEnrollment** — Course enrollments
- **LMSProgress** — Lesson progress
- **LMSQuiz** — Course quizzes
- **LMSAssignment** — Course assignments
- **LMSDiscussion** — Course discussions
- **LMSCertificate** — Course certificates

### Package & Payment System
- **Package** — Subscription packages
- **UserSubscription** — User subscriptions
- **PaymentTransaction** — Payment records
- **PaymentRefund** — Refund records
- **Wallet** — User wallets
- **WalletTransaction** — Wallet transactions
- **Invoice** — Invoices

### Coupon System
- **Coupon** — Discount coupons
- **CouponUsage** — Coupon usage records

### Admin System
- **AdminRole** — Admin roles
- **AdminUser** — Admin users
- **AdminAction** — Admin actions
- **FeatureFlag** — Feature flags
- **MaintenanceMode** — Maintenance mode

### Support System
- **SupportTicket** — Support tickets
- **SupportMessage** — Ticket messages

### Map System
- **MapPin** — Map locations
- **MapPinView** — Pin view tracking
- **MapPinBookmark** — Pin bookmarks
- **GeocodingCache** — Geocoding cache

### Analytics & Monitoring
- **AuditLog** — Audit trail
- **Report** — User reports
- **NotificationPreference** — Notification settings
- **AgeRestriction** — Age restrictions

### Verification System
- **VerificationRequest** — Verification submissions
- **Document** — Uploaded documents
- **FaceMatch** — Face matching results

### Internationalization
- **Country** — Country configurations
- **Language** — Supported languages
- **Translation** — UI translations

## 7.2 Indexes

Indexes are created on:
- Foreign keys
- Frequently queried columns (status, type, location)
- Date fields for sorting
- Composite indexes for common query patterns
- Geospatial indexes (PostGIS)

## 7.3 Scaling Strategy

1. Connection pooling with PgBouncer
2. Read replicas for read-heavy queries
3. Partitioning for large tables
4. OpenSearch for full-text search at scale
5. ClickHouse for analytics at scale

---

# 8. API Reference

## 8.1 Base URL

```
Development: http://localhost:3001/api
Production: https://api.telnd.com/api
```

## 8.2 Authentication

All authenticated endpoints require:
```
Authorization: Bearer <token>
```

## 8.3 Response Format

### Success
```json
{
  "success": true,
  "data": { ... }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data"
  }
}
```

## 8.4 Endpoints

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

### Admin
- `GET /api/admin/dashboard` — Get admin dashboard stats
- `GET /api/admin/users` — List users
- `GET /api/admin/users/:id` — Get user details
- `PATCH /api/admin/users/:id/suspend` — Suspend user
- `PATCH /api/admin/users/:id/activate` — Activate user
- `GET /api/admin/features` — List feature flags
- `POST /api/admin/features` — Create feature flag
- `PATCH /api/admin/features/:id` — Update feature flag
- `DELETE /api/admin/features/:id` — Delete feature flag
- `GET /api/admin/maintenance` — Get maintenance status
- `POST /api/admin/maintenance` — Set maintenance mode
- `GET /api/admin/reports` — List reports
- `PATCH /api/admin/reports/:id` — Update report status
- `GET /api/admin/audit-log` — List audit logs
- `GET /api/admin/roles` — List admin roles
- `POST /api/admin/roles` — Create admin role

### Map
- `GET /api/map/pins` — List map pins
- `GET /api/map/pins/:id` — Get pin details
- `POST /api/map/pins` — Create/upsert map pin
- `DELETE /api/map/pins/:id` — Delete map pin
- `GET /api/map/bookmarks` — List user bookmarks
- `POST /api/map/bookmarks` — Bookmark a pin
- `DELETE /api/map/bookmarks/:pinId` — Remove bookmark
- `GET /api/map/geocode` — Geocode address
- `GET /api/map/reverse-geocode` — Reverse geocode

### Packages
- `GET /api/packages` — List packages
- `GET /api/packages/:id` — Get package details
- `POST /api/packages/subscribe` — Subscribe to package
- `GET /api/packages/subscriptions/mine` — Get subscriptions
- `PATCH /api/packages/subscriptions/:id/cancel` — Cancel
- `GET /api/packages/invoices/mine` — Get invoices
- `GET /api/packages/wallet` — Get wallet balance
- `GET /api/packages/wallet/transactions` — Get transactions
- `POST /api/packages/coupons/validate` — Validate coupon
- `POST /api/packages/coupons/apply` — Apply coupon

### Support
- `POST /api/support/tickets` — Create ticket
- `GET /api/support/tickets` — List tickets
- `GET /api/support/tickets/:id` — Get ticket
- `POST /api/support/tickets/:id/messages` — Add message
- `GET /api/support/admin/tickets` — List all tickets (admin)
- `PATCH /api/support/admin/tickets/:id` — Update ticket (admin)
- `POST /api/support/admin/tickets/:id/messages` — Reply (admin)

### Merchant
- `GET /api/merchant` — List merchants
- `GET /api/merchant/:slug` — Get merchant
- `POST /api/merchant` — Create merchant
- `PATCH /api/merchant/:id` — Update merchant
- `GET /api/merchant/:id/staff` — List staff
- `POST /api/merchant/:id/staff` — Add staff
- `DELETE /api/merchant/:id/staff/:staffId` — Remove staff
- `GET /api/merchant/:id/students` — List students
- `POST /api/merchant/:id/students` — Enroll student
- `GET /api/merchant/:id/courses` — List courses
- `POST /api/merchant/:id/courses` — Create course
- `POST /api/merchant/:id/attendance` — Mark attendance
- `GET /api/merchant/:id/attendance` — Get attendance
- `POST /api/merchant/:id/exams` — Create exam
- `GET /api/merchant/:id/exams` — List exams
- `GET /api/merchant/:id/announcements` — List announcements
- `POST /api/merchant/:id/announcements` — Create announcement
- `POST /api/merchant/:id/fees` — Create fee
- `GET /api/merchant/:id/fees` — List fees
- `GET /api/merchant/:id/routine` — Get routine
- `POST /api/merchant/:id/routine` — Add routine

### LMS
- `GET /api/lms/courses` — List courses
- `GET /api/lms/courses/:slug` — Get course
- `POST /api/lms/courses` — Create course
- `PATCH /api/lms/courses/:id` — Update course
- `GET /api/lms/courses/:courseId/modules` — List modules
- `POST /api/lms/courses/:courseId/modules` — Create module
- `POST /api/lms/modules/:moduleId/lessons` — Create lesson
- `POST /api/lms/enroll` — Enroll in course
- `GET /api/lms/enrollments` — Get enrollments
- `POST /api/lms/progress` — Update progress
- `POST /api/lms/courses/:courseId/quizzes` — Create quiz
- `GET /api/lms/courses/:courseId/quizzes` — List quizzes
- `POST /api/lms/courses/:courseId/assignments` — Create assignment
- `POST /api/lms/courses/:courseId/discussions` — Create discussion
- `GET /api/lms/courses/:courseId/discussions` — List discussions
- `GET /api/lms/certificates` — Get certificates

### Analytics
- `GET /api/analytics/admin/overview` — Platform overview
- `GET /api/analytics/admin/users` — User analytics
- `GET /api/analytics/admin/jobs` — Job analytics
- `GET /api/analytics/user/profile` — User profile analytics
- `GET /api/analytics/employer/jobs` — Employer job analytics
- `GET /api/analytics/tutor/bookings` — Tutor booking analytics

---

# 9. Authentication & Security

## 9.1 Authentication Methods

1. Email + Password
2. Phone + OTP
3. Google OAuth
4. Facebook OAuth
5. LinkedIn OAuth

## 9.2 Token Strategy

- Access token: JWT (15 min)
- Refresh token: Opaque (7 days)
- Session tracking in database
- Refresh token rotation

## 9.3 Account Linking

Social accounts link to existing user accounts when:
- Email matches verified email
- User explicitly links accounts

## 9.4 Security Measures

### Authentication Security
- Password hashing (bcrypt, 12+ rounds)
- JWT with secure flags
- HTTP-only cookies where possible
- Refresh token rotation
- Session management with device tracking
- Rate limiting on auth endpoints
- OTP expiration (5 minutes)

### Authorization
- Role-based access control (RBAC)
- Resource ownership verification
- Permission checks at API level
- Resource-level permissions
- API key management for integrations
- IP allowlisting for admin access

### Data Protection
- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- PII data masking in logs
- Data retention policies
- Right to deletion (GDPR/local compliance)
- Consent management

### API Security
- Rate limiting per user/IP
- Input validation (Zod schemas)
- SQL injection prevention (Prisma ORM)
- XSS prevention (output encoding)
- CSRF protection
- Request size limits
- API versioning

### Infrastructure Security
- DDoS protection (Cloudflare)
- WAF (Web Application Firewall)
- Secure headers (HSTS, CSP, X-Frame-Options)
- Secrets management (env vars, vault)
- Container security scanning
- Dependency vulnerability checks

### Monitoring & Incident Response
- Security event logging
- Anomaly detection
- Failed login tracking
- Suspicious activity alerts
- Incident response playbook
- Regular security audits

### Compliance
- Bangladesh data protection laws
- PCI DSS (for payments)
- GDPR preparation (for international)
- SOC 2 preparation (future)
- Regular penetration testing

---

# 10. Caching & Performance

## 10.1 Redis Usage

### Cache Keys
```
user:{id}           → User profile (TTL: 1h)
job:{id}            → Job details (TTL: 30min)
jobs:search:{hash}  → Search results (TTL: 15min)
company:{id}        → Company profile (TTL: 1h)
otp:{phone}         → OTP code (TTL: 5min)
rate:{ip}           → Rate limit counter (TTL: window)
```

### Cache Invalidation
- On data update: invalidate related keys
- Pattern-based flush for related caches
- TTL as fallback for stale data

### Queue Usage (BullMQ)
- email — Email sending
- sms — SMS/OTP sending
- notification — Push notifications
- image — Image processing

## 10.2 When to Cache

**Cache:**
- Job listings
- Company profiles
- Search results
- User sessions

**Don't cache:**
- Application status (changes frequently)
- Real-time notifications
- Payment transactions

## 10.3 Web Performance

- Server Components by default
- Static generation for public pages
- ISR for job listings
- Image optimization (Next.js)
- Code splitting
- Bundle analysis

## 10.4 API Performance

- Connection pooling
- Query optimization
- Redis caching
- Pagination
- Field selection
- Background jobs for expensive operations

## 10.5 Mobile Performance

- ListView.builder for lists
- Image caching
- Lazy loading
- Offline support (future)
- Minimal rebuilds
- Efficient state management

## 10.6 Database Performance

- Proper indexes
- N+1 prevention
- Cursor pagination
- Batch operations
- Connection pooling

---

# 11. Deployment & Infrastructure

## 11.1 Development Setup

```bash
# Clone repository
git clone <repo-url>
cd telnd

# Install dependencies
npm install

# Start infrastructure
docker compose up -d

# Set up environment
cp .env.example .env

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed

# Start development
npm run dev
```

## 11.2 Production Infrastructure

| Service | Provider |
|---------|----------|
| PostgreSQL | Managed service (AWS RDS / Supabase) |
| Redis | Managed service (Upstash / Redis Cloud) |
| Object Storage | Cloudflare R2 |
| CDN | Cloudflare |
| Web Hosting | Vercel |
| API Hosting | Railway |
| Mobile | App Store / Google Play |

## 11.3 Deployment Steps

1. Run migrations
2. Build applications
3. Deploy API
4. Deploy web
5. Deploy workers
6. Configure CDN
7. Set up monitoring

## 11.4 Scaling

### Horizontal
- Multiple API instances behind load balancer
- Worker scaling based on queue depth
- Read replicas for database

### Vertical
- Database instance upgrade
- Redis memory increase
- API server resources

## 11.5 Docker

```yaml
# docker-compose.yml
services:
  db:
    image: postgis/postgis:16-3.4
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: telnd
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

---

# 12. Development Workflow

## 12.1 Prerequisites

- Node.js 20+
- npm 10+
- Flutter 3.2+
- Docker Desktop
- PostgreSQL 16 (or use Docker)

## 12.2 Development Commands

```bash
npm run dev           # Start Next.js web app
npm run dev:admin     # Start admin app
npm run lint          # Lint all packages
npm run typecheck     # Type check all packages
npm run test          # Run all tests
npm run db:migrate    # Run database migrations
npm run db:seed       # Seed database
npm run db:studio     # Open Prisma Studio
```

## 12.3 Flutter Development

```bash
cd apps/mobile
flutter pub get
flutter run
```

## 12.4 Code Style

- TypeScript strict mode
- ESLint + Prettier
- Conventional commits
- Small, focused modules
- Component-based architecture

## 12.5 Testing Strategy

- Unit tests for business logic
- Integration tests for API endpoints
- E2E tests for critical flows
- Performance testing

---

# 13. Implementation Timeline

## Phase 0 — Planning (Weeks 1–2)
- Brand/product spec
- UX flows
- Database design
- API contracts
- Architecture
- Security model

## Phase 1 — Foundation (Weeks 3–6)
- API, PostgreSQL/PostGIS, Redis
- Flutter/Next.js foundations
- Authentication, roles
- Company/candidate profiles

## Phase 2 — MVP Jobs (Weeks 7–12)
- Candidate profiles
- Employer profiles
- Job posting, search, filters
- Applications, saved jobs
- Notifications

## Phase 3 — Smart Matching (Weeks 13–16)
- AI-assisted profile parsing
- Job matching
- Location ranking
- Explainable match score
- Mandatory eligibility rules

## Phase 4 — Recruitment (Weeks 17–21)
- Candidate discovery
- Employer invitations
- Shortlisting
- Recruitment pipeline
- Messaging
- Interview scheduling

## Phase 5 — Assessment (Weeks 22–26)
- Company initial tests
- Assessment engine
- Scoring, question bank
- TELND mock tests
- Assessment analytics

## Phase 6 — AI Career (Weeks 27–31)
- AI Career Assistant
- AI CV builder
- Job-action tools
- AI mock interviews
- Skill-gap analysis

## Phase 7 — Learning (Weeks 32–36)
- TELND Learn
- Free/paid courses
- Progress tracking
- Certifications
- Skill assessments

## Phase 8 — Workforce (Weeks 37–42)
- TELND hiring operations
- Workforce/outsourcing workflows
- B2B service management

## Phase 9 — Scale & Intelligence (Ongoing)
- Advanced analytics
- Salary intelligence
- Trust scoring
- Anti-fraud
- OpenSearch/ClickHouse
- Optimization

---

# 14. File Structure

## 14.1 Complete File List

### Root
- `package.json` — Root package configuration
- `tsconfig.json` — TypeScript configuration
- `.prettierrc` — Prettier configuration
- `.gitignore` — Git ignore rules
- `.env.example` — Environment variables template
- `.editorconfig` — Editor configuration
- `.prettierignore` — Prettier ignore rules
- `docker-compose.yml` — Docker services
- `README.md` — Project documentation

### Web App (apps/web/)
- `package.json` — Next.js dependencies
- `next.config.js` — Next.js configuration
- `tailwind.config.ts` — Tailwind CSS configuration
- `tsconfig.json` — TypeScript configuration
- `src/app/layout.tsx` — Root layout with ThemeProvider
- `src/app/page.tsx` — Homepage
- `src/app/globals.css` — Global styles with dark mode
- `src/app/jobs/page.tsx` — Jobs page
- `src/app/auth/login/page.tsx` — Login page
- `src/app/auth/signup/page.tsx` — Signup page
- `src/components/ThemeProvider.tsx` — Theme context provider
- `src/components/ThemeToggle.tsx` — Theme toggle component
- `src/lib/theme.ts` — Theme utilities
- `src/lib/api.ts` — API client

### Mobile App (apps/mobile/)
- `pubspec.yaml` — Flutter dependencies
- `lib/main.dart` — App entry point
- `lib/core/app.dart` — App configuration with theme
- `lib/core/theme.dart` — Light/dark themes
- `lib/core/theme_provider.dart` — Theme state management
- `lib/core/router.dart` — App routing
- `lib/core/api_client.dart` — API client
- `lib/core/constants.dart` — App constants
- `lib/features/home/presentation/pages/home_page.dart` — Home page
- `lib/features/auth/presentation/pages/login_page.dart` — Login page
- `lib/features/auth/presentation/pages/signup_page.dart` — Signup page
- `lib/features/jobs/presentation/pages/jobs_page.dart` — Jobs page
- `lib/features/profile/presentation/pages/profile_page.dart` — Profile page
- `lib/features/settings/presentation/pages/settings_page.dart` — Settings page
- `lib/shared/presentation/widgets/bottom_nav.dart` — Navigation
- `lib/shared/presentation/widgets/loading_skeleton.dart` — Loading skeleton
- `lib/shared/presentation/widgets/theme_toggle.dart` — Theme toggle

### Shared Packages (packages/)

#### types/
- `src/common.ts` — Common types
- `src/user.ts` — User types
- `src/job.ts` — Job types
- `src/company.ts` — Company types
- `src/application.ts` — Application types
- `src/messaging.ts` — Messaging types
- `src/verification.ts` — Verification types
- `src/i18n.ts` — Internationalization types
- `src/admin.ts` — Admin types
- `src/package.ts` — Package/subscription types
- `src/support.ts` — Support types
- `src/map.ts` — Map types
- `src/merchant.ts` — Merchant types
- `src/lms.ts` — LMS types
- `src/analytics.ts` — Analytics types
- `src/tutor.ts` — Tutor types
- `src/index.ts` — Exports all types

#### validation/
- `src/auth.ts` — Auth validation schemas
- `src/job.ts` — Job validation schemas
- `src/user.ts` — User validation schemas
- `src/messaging.ts` — Messaging validation
- `src/verification.ts` — Verification validation
- `src/i18n.ts` — Internationalization validation
- `src/admin.ts` — Admin validation schemas
- `src/package.ts` — Package validation schemas
- `src/support.ts` — Support validation schemas
- `src/map.ts` — Map validation schemas
- `src/merchant.ts` — Merchant validation schemas
- `src/lms.ts` — LMS validation schemas
- `src/index.ts` — Exports all schemas

#### database/
- `prisma/schema.prisma` — Database schema (77 models)
- `src/redis.ts` — Redis utilities
- `src/seed.ts` — Database seeder

#### api/
- `src/index.ts` — API entry point
- `src/routes/auth.ts` — Auth routes
- `src/routes/jobs.ts` — Job routes
- `src/routes/users.ts` — User routes
- `src/routes/companies.ts` — Company routes
- `src/routes/admin.ts` — Admin routes
- `src/routes/map.ts` — Map routes
- `src/routes/packages.ts` — Package routes
- `src/routes/support.ts` — Support routes
- `src/routes/merchant.ts` — Merchant routes
- `src/routes/lms.ts` — LMS routes
- `src/routes/analytics.ts` — Analytics routes
- `src/middleware/auth.ts` — Auth middleware
- `src/middleware/validate.ts` — Validation middleware
- `src/middleware/rateLimit.ts` — Rate limiting

#### config/
- `src/index.ts` — Configuration management

#### utils/
- `src/format.ts` — Formatting utilities
- `src/distance.ts` — Distance calculations
- `src/slug.ts` — Slug generation

### Services (services/)
- `workers/src/index.ts` — Worker entry point
- `workers/src/email.ts` — Email worker
- `workers/src/sms.ts` — SMS worker
- `workers/src/notification.ts` — Push notification worker
- `workers/src/image.ts` — Image processing worker

### Documentation (docs/)
- `architecture.md` — Architecture documentation
- `database.md` — Database documentation
- `api.md` — API documentation
- `authentication.md` — Authentication documentation
- `security.md` — Security documentation
- `caching.md` — Caching strategy
- `performance.md` — Performance guidelines
- `deployment.md` — Deployment guide
- `development.md` — Development guide
- `features.md` — Features documentation

---

# 15. Environment Configuration

## 15.1 Required Environment Variables

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/telnd"
REDIS_URL="redis://localhost:6379"

# Auth
JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-jwt-refresh-secret"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Google Maps
GOOGLE_MAPS_API_KEY="your-google-maps-api-key"

# SSLCommerz
SSLCOMMERZ_STORE_ID="your-sslc-store-id"
SSLCOMMERZ_STORE_PASS="your-sslc-store-password"
SSLCOMMERZ_IS_LIVE="false"

# bKash
BKASH_APP_KEY="your-bkash-app-key"
BKASH_APP_SECRET="your-bkash-app-secret"
BKASH_USERNAME="your-bkash-username"
BKASH_PASSWORD="your-bkash-password"

# Nagad
NAGAD_MERCHANT_ID="your-nagad-merchant-id"
NAGAD_PUBLIC_KEY="your-nagad-public-key"
NAGAD_PRIVATE_KEY="your-nagad-private-key"

# Rocket
ROCKET_API_KEY="your-rocket-api-key"
ROCKET_SECRET_KEY="your-rocket-secret-key"

# Email
SMTP_HOST="localhost"
SMTP_PORT=1025
EMAIL_FROM="noreply@telnd.com"

# SMS
SMS_API_KEY="your-sms-api-key"

# Firebase
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_PRIVATE_KEY="your-firebase-private-key"
FIREBASE_CLIENT_EMAIL="your-firebase-client-email"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# App
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
APP_ENV="development"
```

---

# Appendix A: Database Models Count

Total models: **77**

| Category | Count |
|----------|-------|
| User & Auth | 4 |
| Candidate | 1 |
| Employer | 2 |
| Jobs | 2 |
| Tutor | 5 |
| Merchant | 10 |
| LMS | 10 |
| Packages & Payment | 7 |
| Coupons | 2 |
| Admin | 5 |
| Support | 2 |
| Map | 3 |
| Analytics & Monitoring | 4 |
| Verification | 3 |
| Internationalization | 3 |
| Other | 12 |

---

# Appendix B: API Endpoints Count

Total endpoints: **120+**

| Module | Endpoints |
|--------|-----------|
| Auth | 4 |
| Jobs | 3 |
| Users | 2 |
| Companies | 2 |
| Admin | 15 |
| Map | 9 |
| Packages | 10 |
| Support | 7 |
| Merchant | 20 |
| LMS | 16 |
| Analytics | 6 |

---

# Appendix C: Development Commands

```bash
# Root
npm install                    # Install dependencies
npm run dev                    # Start all apps
npm run build                  # Build all apps
npm run lint                   # Lint all packages
npm run typecheck              # Type check all packages
npm run test                   # Run all tests

# Database
npm run db:migrate             # Run migrations
npm run db:seed                # Seed database
npm run db:studio              # Open Prisma Studio
npm run db:reset               # Reset database

# Web App
cd apps/web
npm run dev                    # Start web app
npm run build                  # Build web app

# Mobile App
cd apps/mobile
flutter pub get                # Install dependencies
flutter run                    # Run on device
flutter build apk              # Build Android
flutter build ios              # Build iOS

# Docker
docker compose up -d           # Start services
docker compose down            # Stop services
docker compose logs -f         # View logs
```

---

## 4.25 Job Boost & Ads Manager

### Boost System
- Employers boost job posts to reach top matching candidates
- Pay-as-you-go from wallet balance (minimum deposit required)
- Boost queue runs once daily
- Algorithm matches job to top profiles by skills, location, experience

### Boost Analytics
- Impressions, unique views, click-through rate, applications
- Cost-per-click, daily spend, campaign performance

### Targeting & Budget
- Location, skills, experience, education, industry targeting
- Daily cap, total campaign budget, auto-pause on depletion

## 4.26 Advertising System

### Platform Ads
- Companies can purchase ad placements on TELND
- Banner ads, sponsored content, featured placements

### Google Ads Integration
- Google Ads shown to **free users** only
- Paid users (Pro/Premium) see **no ads**

## 4.27 Tutor & Creator Pricing

### Free Services (No Charge)
- Profile creation, search, discovery, receiving inquiries, hiring, basic analytics

### Paid Services (Charges Apply)
- Payment processing fee, premium profile features, advanced tools

### Revenue Model
- TELND takes commission only on transactions processed through platform
- Search, find, and hiring is **completely free** for tutors and creators

## 4.28 Pro/Premium Subscriber Benefits

### Logo Customization
- Free: default, Pro: accent color, Premium: full brand colors

### Ad-Free Experience
- Free: see ads, Pro: reduced ads, Premium: completely ad-free

### Priority Features
- Priority in search results, faster support, early access to new features

## 4.29 AI Live Skill Test

### Overview
Users test skills through AI-powered live video tests. AI analyzes video, generates certificate, skills marked as "Verified".

### How It Works
1. Select skill to test
2. Pay per test charge
3. Take AI live test with video recording
4. AI analyzes video (performance, accuracy, communication)
5. Generate certificate with score
6. Skills marked as "Verified" on profile

### Test Rules
- Each purchase: **2 attempts**
- If fail both, must purchase again
- Certificate only on pass
- Verified badge next to skill

## 4.30 Job Type System

### Job Type Modal
When user clicks "I'm looking for":
- Corporate Job (verification required)
- General Job (verification optional)
- Government Job (admin only)
- Project Works (rate limited)

### Corporate Jobs
- Company verification required (document or admin manual)
- Verification badge on posts

### General Jobs
- Verification not mandatory
- Shops, Restaurants, Drivers, etc.

### Government Jobs
- Normal employers cannot post
- Admin creates government accounts or posts directly

### Project Works
- Companies post (with badge)
- General accounts post (auto-badge after first success)
- Rate limit: 5 pending, release on project start (escrow payment)

## 4.31 Tutor Messaging System

### Approaching Tutors
- 10 tutors per day limit
- Must request with: student name, class, age, subject
- Request goes to tutor inbox
- Cannot send more until tutor replies

### Tutor Response Flow
1. Tutor receives request with details
2. Tutor asks questions, sends fees card
3. Student accepts → selected
4. Only tutor can make video/audio call

## 4.32 Influencer Listing

### How to Become Creator
- List from General Account (no separate account)
- Accept consent form
- Upload creator avatar and pictures
- System tracks work history

### Limits
- Normal: 5/day, 25/month approaches
- Premium/Elite: Added by admin only
- Premium/Elite choose: direct or through TELND

### Verification
- Auto-verification badge after first successful project

## 4.33 AI Selection for Employers

### AI Shortlisting
- Type requirements in natural language
- AI asks for clarification
- Returns shortlisted candidates with match scores

### Package Limits
- AI selections次数 limited by employer package

## 4.34 Workflow Map

### Job Seeker Flow
```
Sign Up → Complete Profile → Click "I'm Looking For" → Select Job Type
    → Browse Jobs → AI Matching → Apply → Interview → Offer → Hired
```

### Tutor Flow
```
General Account → Accept Consent → Upload Avatar → Tutor Profile
    → Receive Request → Respond → Send Fees Card → Student Accepts
    → Video/Audio Call → Tuition Starts → Manage Classes → Get Paid
```

### Employer Flow
```
Sign Up → Select Employer Type → Complete Profile → Verify (if Corporate)
    → Post Jobs → AI Shortlist → Interview → Hire
    → OR: Post Project Works → Escrow → Hire → Complete
```

## 4.35 Portal Structure

### General Portal (Flutter App)
- Job search, Find tutors, Project works, Influencer listing
- AI skill tests, Profile management, Wallet

### Tutor Portal (Flutter App)
- Classes dashboard, Students, Exam plans, Routines
- Create exams, Send messages, Class history, Earnings

### Employer Portal (Flutter App)
- General/Corporate/Government job posting
- AI shortlisting, Candidate management, Project works
- Wallet, Invoices, Analytics

### Admin Portal (Web)
- User management, Job type enable/disable
- Government job posting, Influencer management
- LMS management (courses, instructors)
- Invoice/payment management, Refunds, Analytics

## 4.36 Future Updates

### School/College/University/Institution Connection
- Connect schools, colleges, universities, and institutions to TELND platform
- Institutional dashboards for managing students and courses
- Integration with existing LMS systems

### Live Portal (Separate Portal)
- Live classes will be completely separate portal in the future
- Real-time video, screen sharing, recording
- Separate instructor and student portals

### Instructor Portal (Future Work)
- Instructors added by admin can have their own portal
- Course management dashboard
- Student management
- Earnings and analytics

### Multi-Instructor Platform
- Admin publishes TELND's own courses
- Other instructors can also publish their courses (future)
- Revenue sharing model for external instructors

---

**Document Version:** 1.2
**Last Updated:** September 2026
**Status:** Active Development
