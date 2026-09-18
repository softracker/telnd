# TELND — Complete Product Specification

> This is a proposed plan and architecture. It will be adjusted in the future as per requirement. A final documentation will be released after completion of work.

---

## 1. Project Overview

**TELND** is a comprehensive career and talent ecosystem focused on Bangladesh. One platform, multiple everyday needs — jobs, tutoring, projects, Influencers, and local services (fix) in one ecosystem instead of separate platforms.

**Employer value:** TELND helps companies discover, assess, interview, hire, and eventually outsource talent.

**Core Product Loop:**
Learn → Practice → Assess → Match → Apply → Interview → Offer → Get Hired → Grow

Every major feature must strengthen at least one part of this journey.

### Key Differentiators

1. **One Platform, Multiple Needs** — Jobs, tutoring, projects, Influencers, and local services (fix) in one ecosystem instead of separate platforms.

2. **Intelligent Matching, Not Just Search** — TELND matches people based on skills, qualifications, location, availability, experience, requirements, and preferences rather than simply showing keyword-based listings.

3. **Strict-Match Hiring** — Employers can activate Strict Match, allowing only candidates who actually meet predefined requirements to apply. This reduces irrelevant applications.

4. **Opportunity → Preparation → Hiring** — TELND doesn't stop at showing opportunities. Users can test their skills, practice interviews, improve their CV, generate cover letters, and then apply.

5. **Verified People and Opportunities** — Identity/student/company verification helps create more trust between employers, tutors, students, and project owners.

6. **Local-First, Bangladesh-Focused** — Instead of copying global platforms, TELND understands Bangladesh-specific realities — location, education system, universities, salary expectations, tutoring, local services, and employment patterns.

7. **Two-Sided Ecosystem** — A person can be a job seeker today, tutor tomorrow, project creator later, or service provider when needed — without creating separate accounts on different platforms.

---

## 2. Product Vision

TELND is a full career lifecycle platform — not just a job board. It combines:

- Job marketplace
- AI-powered career assistance
- Skill assessments and certifications
- Learning/courses
- Recruitment management for employers
- Workforce/outsourcing (TELND as employer)

**Product Modules (planned):**
- **TELND Jobs** — Job opportunities marketplace
- **TELND Hire** — Employer recruitment tools
- **TELND Assess** — Company assessments
- **TELND Mock** — Interview and test preparation
- **TELND Learn** — Courses and learning
- **TELND Workforce** — TELND's own recruitment/outsourcing services
- **TELND Digital** — Institution digitalization (results, students, batches, fees, quizzes, classroom digitalization, live classes)
- **TELND Fix** — Service providers (electrician, TV/freeze mechanic, AC servicing, etc.) with admin-managed work assignment

---

## 3. Target Users

### Candidate Side
- Job seekers (entry-level to experienced professionals)
- Students preparing for careers
- Professionals looking for career growth
- Freelancers seeking employment

### Employer Side
- Companies of all sizes
- HR teams and recruiters
- Hiring managers
- B2B clients (for workforce/outsourcing)

---

## 4. User Types & Roles

| Role | Description |
|------|-------------|
| Candidate | Job seeker with career profile |
| Employer | Company representative posting jobs |
| Employer Admin | Company team member with elevated permissions |
| Company Owner | Primary account holder for company |
| TELND Admin | Platform administrator |
| Influencer | Content creators, models |

---

## 5. Account Types

### General Account
- Jobs (Corporate, General, Government via modal selection)
- Find Tutors
- Project Works (post and apply)
- Influencer listing (consent + upload avatar)
- Package range: 0-199 BDT

### Influencer Account
- **No separate account needed** — creators list from their General Account
- Influencer Listing requires consent acceptance
- Upload Influencer Avatar and profile pictures
- System tracks work history automatically
- Elite/Premium Influencers added by admin only
- Can apply for project works (limited by user package)

### Employer Account (3 Types)
- **General Job Employer** — posts general jobs + project works (verification not mandatory)
- **Corporate Job Employer** — posts corporate jobs + project works (company verification required)
- **Government Job Employer** — admin-created accounts only, or admin posts directly
- All three can post project works

### Merchant Account
- Institution/coaching center management
- Cannot login to other account types

### Admin Account
- Platform administration
- Cannot login to other account types
- Can enable/disable job types (Corporate, General, Government)
- Can create government job accounts
- Can add Elite/Premium Influencers

### Account Isolation
- Each account type has its own isolated portal/app
- General users cannot login to employer portal and vice versa

---

## 6. Authentication Requirements

### Login/Signup Methods
- Email + password
- Phone number + OTP
- Google social login
- Facebook social login
- LinkedIn social login

### Account Linking
- Users can connect multiple login methods to one TELND account
- Social accounts should link to the same underlying user account (not create duplicates)
- Email/identity must be safely verifiable when linking social accounts

### Security
- Forgot password/recovery for password-based accounts
- OTP verification with rate limiting
- Secure session management
- Profile verification states: phone, email, identity, education, experience, skills

---

## 7. Authentication & Onboarding Workflow

Each account type has its own portal and onboarding process. Verification is **optional** for all account types.

### General Account Onboarding
```
User chooses Email / Phone / Google / Facebook / LinkedIn
  → Account is created or linked
  → Optional verification (phone, email, identity)
  → Profile setup (name, location, skills, education)
  → Personalized dashboard (jobs, tutors, projects)
```

### Employer Account Onboarding
```
User chooses Email / Phone / Google / Facebook / LinkedIn
  → Account is created or linked
  → Select employer type (General / Corporate / Government)
  → Optional company verification (for Corporate)
  → Profile setup (company info, logo, industry)
  → Personalized dashboard (post jobs, manage candidates)
```

### Tutor Account Onboarding
```
General Account → Accept Tutor Consent
  → Upload avatar and profile pictures
  → Set tuition fees and subjects
  → Tutor profile created
  → Dashboard (classes, students, exams)
```

### Merchant Account Onboarding (TELND Digital)
```
Sign up as Merchant
  → Institution details (name, type, address)
  → Add students and create batches
  → Setup fees and payment methods
  → Dashboard (results, classes, payments)
```

---

## 8. Candidate Career Profile

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
- **Transcripts** (optional upload — PDF/image)
- **Certificates** (optional upload — PDF/image)

### Skills
- Technical skills, soft skills, industry skills
- Skill level and years of experience

### Experience
- Company, position, employment period
- Responsibilities and achievements
- **Experience Certificates** (optional upload — PDF/image)
- **Recommendation Letters** (optional upload — PDF/image)

### Portfolio
- Projects, GitHub, LinkedIn
- Personal website
- Creative/professional links

### Document Uploads (Optional)
- **Transcripts**: Academic transcripts from institutions
- **Certificates**: Professional certifications, course completion certificates
- **Experience Certificates**: Employment verification letters
- **Recommendation Letters**: From previous employers/professors
- **Other Documents**: Any additional supporting documents
- All documents stored securely in cloud storage
- Supported formats: PDF, JPG, PNG
- Max file size: 5MB per document

### TELND Career Score
Based on:
- Profile completeness
- Skills assessment
- Experience
- Education
- Assessments taken
- Certifications
- Platform activity

---

## 9. AI Career Assistant

### Capabilities
- Natural-language job search that performs actual platform actions (not generic chatbot)
- Examples: "Find me a marketing job in Chattogram under ৳40,000" or "Apply to the first suitable job"

### Functions
- Search jobs
- Explain job matches
- Track applications
- Improve CVs
- Generate cover letters
- Prepare for interviews
- Recommend courses
- Identify skill gaps
- Provide salary guidance
- Send reminders

### Access Control
- Controlled access to TELND backend tools and user data
- Permissions and audit logs
- Never expose internal system details

---

## 10. Intelligent Job Search

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
- Job type (full-time, part-time, contract, etc.)
- Workplace type (remote, hybrid, on-site)
- Company
- Posting date
- Remote options

### Ranking
- Location-aware ranking using geographic distance
- Personalized recommendations based on candidate profile
- Relevance and proximity prioritized over random ordering

---

## 11. AI Job Matching & Eligibility

### Matching System
Simple and transparent — most match on top, lower matches below.

### Match Score Based On
- Skills match
- Qualifications match
- Location match
- Availability match
- Experience match
- Requirements match
- Candidate preferences

### Match Display
- Results sorted by match percentage (highest first)
- Show match percentage on each job card
- Explainable breakdown: Skills 95%, Experience 100%, Education 90%, Location 85%

### Strict-Match Hiring
- Employers can activate **Strict Match** mode
- Only candidates who meet **all** predefined requirements can apply
- Reduces irrelevant applications
- Ineligible candidates see "Not Eligible" (not an arbitrary low percentage)

### Eligibility Rules (Configurable by Employer)
- Required university (from predefined list)
- Required degree/major
- Minimum experience years
- Required certifications
- Location restrictions
- Salary range alignment

### Architecture Principle
- Deterministic backend rules for hard eligibility (distance, salary, application state)
- ML/recommendation for relevance scoring
- LLM for natural-language interaction, explanations, career assistance

---

## 12. Job Listings & Applications

### Job Type Modal (Popup Selection)
When user clicks "I'm looking for", a modal appears:

| Option | Description |
|--------|-------------|
| Corporate Job | Company/organization jobs (verification required) |
| General Job | Local businesses, shops, restaurants (verification optional) |
| Government Job | Admin-only posting (normal employers cannot post) |
| Project Works | Freelance/project-based work |

### Job Type Management
- Admin can **enable/disable** any of the three job types
- Corporate, General, Government — individually togglable
- Project Works always available

### Corporate Jobs
- Posted by corporate employers only
- **Company verification required** (document submission OR admin manual verification)
- Verification badge shown on job posts
- Company ROC/organization verification

### General Jobs
- Posted by general employers
- **Verification not mandatory**
- Includes: Shops, Restaurants, Drivers, Delivery, Garages, Salons, Hotels, Construction, Households, Small Businesses

### Government Jobs
- **Cannot be posted by normal employers**
- Admin creates government job accounts for posting
- OR admin posts government jobs directly
- Special verification and trust level

### Project Works (Freelance)
- Companies can post (verification badge shows)
- General accounts can post (auto-verification badge after first successful project)
- Rate limiting applies (see below)

### Project Works Rate Limiting
- Max **5 pending projects** at a time
- Limit releases upon **project start** (after escrow payment)
- When hire is made from previous 5, can post 1 more
- Prevents spam and ensures quality

### Job Creation (Employer)
- Job type auto-set based on modal selection
- Title, company, department
- Location (with geospatial data)
- Salary range
- Employment type, workplace type
- Number of vacancies
- Application deadline

### Job Content
- Description, responsibilities
- Requirements, preferred qualifications
- Benefits, working hours

### Pre-Defined Data System
All dropdowns and selections use pre-defined data for consistency:

#### Job Pre-Defined Data
- **Job Types**: Corporate, General, Government, Project Works
- **Job Posts/Categories**: IT, Finance, Marketing, HR, Sales, Engineering, Education, Healthcare, etc.
- **Employment Types**: Full-time, Part-time, Contract, Freelance, Internship
- **Workplace Types**: On-site, Remote, Hybrid

#### Education Pre-Defined Data
- **University Selection**:
  - Dropdown: All recognized universities in Bangladesh (public + private)
  - Option: **Foreign University** → opens input box to type university name
  - Option: **Other University** → opens input box to type university name
- **School/College Selection**:
  - Dropdown: All recognized schools/colleges in Bangladesh
  - Option: **Other** → opens input box to type school/college name
- **Degree Levels**: SSC, HSC, Diploma, Bachelor's, Master's, PhD
- **Major/Department List**: Common departments/faculties

#### Location Pre-Defined Data
- **Divisions**: Dhaka, Chittagong, Rajshahi, Khulna, Barisal, Sylhet, Rangpur, Mymensingh
- **Districts**: All 64 districts
- **City/Area Lists**: Major cities and areas within each district

#### Salary Pre-Defined Data
- **Salary Ranges**: By job type and experience level
- **Currency**: BDT (Bangladeshi Taka)

#### Other Pre-Defined Data
- **Skills List**: Comprehensive skills database by industry
- **Certification List**: Common professional certifications
- **Company Sizes**: 1-10, 11-50, 51-200, 201-500, 501-1000, 1000+
- **Industry Sectors**: All major industries in Bangladesh

### Application Configuration
- Eligibility controls
- Custom questions
- Required documents (optional per job):
  - **Transcripts** — can be required
  - **Certificates** — can be required
  - **Experience Certificates** — can be required
  - **Recommendation Letters** — can be required
  - **Other Documents** — can be required
- CV, portfolio requirements
- Assessment requirements

### Application Requirement Check
When candidate clicks "Apply", system checks all job requirements:
1. **Profile completeness** — name, email, phone, location
2. **Education** — degree, institution, graduation year
3. **Skills** — required skills for the job
4. **Experience** — years of experience, relevant positions
5. **Documents** — uploaded transcripts, certificates, etc.
6. **Custom questions** — employer-specific questions

If any requirement is missing:
- **Popup appears** showing exactly what needs to be filled
- Candidate can click to go directly to that section
- Cannot submit application until all required fields are complete
- Optional fields shown as "Optional" in popup

### Job Visibility Options
- Normal
- Featured
- Urgent
- Sponsored
- **Boosted** (via Ads Manager — see Section 57)

### Job Boost (Ads Manager)
- Employers can boost job posts to reach top matching candidates
- Pay-as-you-go from wallet balance
- Minimum wallet deposit required before boosting
- Boost queue runs once daily
- Shows job to top matching profiles based on skills, location, experience
- Full analytics dashboard: impressions, clicks, applications, cost-per-click
- Targeting options: location, skills, experience level, education
- Budget control: daily cap, total campaign budget
- Auto-pause when wallet balance depleted

### Candidate Application Flow
1. Candidate clicks "Apply" on job
2. **System runs requirement check** (see Application Requirement Check above)
3. If requirements missing → **popup shows what needs to be filled**
4. Candidate fills missing information
5. Candidate selects CV from CV Box
6. Candidate selects cover letter (optional)
7. Candidate selects required documents (if job requires them)
8. Confirm application
9. Status tracking
10. Notifications on status changes

---

## 13. Application Tracker

### Candidate Timeline
Applied → Viewed → Shortlisted → Assessment → Interview → Final Interview → Offer → Hired

### Features
- Notifications on every status change
- Interview and assessment reminders
- Application history and analytics

---

## 14. Employer Accounts & Company Profiles

### Company Profile
- Company name, website, industry
- Location, size, description
- Listed jobs

### Verification
- Business/company verification
- Verified badge

### Trust Indicators
- Response rate
- Hiring activity
- Internal trust scoring

### Team Management
- Company-level team roles and permissions

---

## 15. Employer Recruitment Dashboard

### Dashboard Components
- Active jobs
- Applications
- Shortlisted candidates
- Interviews
- Offers
- Hiring metrics

### Recruitment Pipeline
New → Screening → Shortlisted → Interview → Offer → Hired

### Candidate Search & Filtering
- By skills, experience, education
- By university, location, salary
- By career level, assessment score
- By availability

### Candidate Database
- Access for proactive recruitment
- Candidate search without waiting for applications

### Employer Analytics
- Applications count
- Qualified applicant rate
- Interview conversion
- Offer conversion
- Time-to-hire

---

## 16. Employer-to-Candidate Invitations

### Invitation Types
- Interview invitations
- Job opportunity invitations
- Assessment invitations

### Candidate Actions
- Accept
- Decline
- Ask questions

### Employer Features
- Track invitation status
- Candidate discovery without waiting for applications

---

## 17. Assessments & Company Initial Tests

### Assessment Types
- English proficiency
- Logical reasoning
- Excel skills
- Technical knowledge
- Industry knowledge
- Personality/situational tests
- Role-specific tests

### Configuration
- Duration
- Question count
- Difficulty level
- Passing score
- Attempt rules

### AI Integration
- AI can generate draft assessments from job description
- Employer reviews and approves AI-generated questions before publishing

### Screening Integration
- Assessment results become part of candidate screening

---

## 18. TELND Online Mock Tests

### Availability
- Free and paid mock tests

### Categories
- English, mathematics, logical reasoning
- General knowledge, aptitude
- Communication and professional skills

### Professional Tests
- Excel, PowerPoint, accounting
- Marketing, programming, data analysis
- HR and finance

### Recruitment Preparation
- Bank recruitment tests
- Corporate recruitment tests
- Government recruitment tests

### Features
- Timed tests
- Scoring
- Explanations
- History and performance tracking

---

## 19. AI Mock Interview

### Interview Options
- Voice/video interviews
- Text-based interviews
- Role-specific sessions

### AI Evaluation
- Answer relevance
- Communication quality
- Answer structure
- Confidence indicators
- Filler word detection
- Technical knowledge assessment

### Post-Interview
- Score report
- Strengths and weaknesses
- Recommended practice areas
- Interview history and progress comparison

---

## 19B. AI Live Skill Test

### Overview
Users can test their skills through AI-powered live video tests. AI analyzes the video and generates a certificate. Verified skills show as "Verified" on profile.

### How It Works
1. User selects skill to test
2. Pays for the test (per test charge)
3. Takes AI live test with video recording
4. AI analyzes video (performance, accuracy, communication)
5. Generates certificate with score
6. Skills marked as "Verified" on profile

### Test Rules
- Each purchase gives **2 attempts**
- If user fails both attempts, must purchase again
- Certificate generated only on pass
- Verified badge shown next to skill

### Pricing
- Per test charge (configurable by admin)
- Payment via wallet or direct payment

### AI Analysis
- Video analysis (facial expressions, confidence, body language)
- Audio analysis (communication clarity, technical terminology)
- Content analysis (accuracy of answers, problem-solving approach)
- Performance scoring across multiple dimensions

### Certificate
- Digital certificate with unique ID
- Score and grade
- Date of completion
- Skill verified badge
- Shareable on social media and CV

---

## 20. AI CV & Cover Letter Tools

### CV Builder
- Multiple professional templates
- AI-assisted content generation

### CV Upload & Management (CV Box)
- Upload existing CV as PDF or image (JPG/PNG)
- AI-powered OCR extracts all information from uploaded CV
- Auto-populates profile fields (education, experience, skills, etc.)
- Support multiple CVs stored in "CV Box"
- Each CV can be tailored for different job types/industries
- When applying, candidate selects which CV to use from CV Box
- If only one CV exists, auto-applies with that CV (no selection prompt)
- CV version tracking and management
- CV preview before applying

### Optimization
- Job-specific CV optimization
- CV-to-job comparison
- Optimization score

### Cover Letters
- AI-generated career summaries
- AI-generated cover letters

### Management
- Multiple targeted CV versions
- Maintain different CVs for different job types

---

## 21. TELND Learn — Courses

### Course Types
- Free courses
- Paid courses

### Content
- Video lessons
- PDFs and documents
- Quizzes
- Assignments
- Progress tracking

### Topics
- CV writing, interviews
- English, Excel
- Digital marketing, programming
- Communication and more

### Future Features
- Creator/instructor course publishing

### Recommendations
- Based on job demand
- Based on candidate skill gaps

---

## 22. TELND Certifications & Skill Assessments

### Assessment Types
- Skill-specific assessments
- Examples: JavaScript, Excel, English communication, digital marketing

### Results
- Scores and proficiency levels
- Certificates verifiable through TELND

### Profile Integration
- Profile badges for verified education, skills, assessments, certifications

---

## 23. Career Path & Skill Gap Analysis

### Process
1. Candidate selects target career
2. TELND compares current skills with target-role requirements
3. Shows missing skills
4. Recommends courses/tests

### Example Path
Excel → SQL → Statistics → Power BI → Python → Projects → Assessment → Applications

### Integration
- Connect learning directly to real job opportunities

---

## 24. Interview & Offer Management

### Interview Scheduling
- Physical interviews
- Phone interviews
- Online interviews (video)
- Calendar integration
- Reminders, confirmation, rescheduling

### Video Interview Support
- Built-in video interview platform
- One-on-one video interviews
- Panel/multi-party video interviews
- Screen sharing capability
- Real-time chat during interview
- Interview recording (with consent)
- AI-powered interview analysis
  - Speech-to-text transcription
  - Answer quality scoring
  - Communication pattern analysis
  - Confidence and clarity metrics
- Post-interview feedback forms
- Interview scheduling with timezone support
- Calendar sync (Google Calendar, Outlook)
- Automatic reminders before interview
- Interview link generation (unique, secure)

### Video Interview Technical Requirements
- WebRTC for real-time video/audio
- Adaptive bitrate for low-bandwidth support
- Recording storage in object storage (S3/R2)
- Transcript generation and storage
- End-to-end encryption for privacy
- Bandwidth detection and quality adjustment
- Fallback to third-party (Google Meet, Zoom) if needed

### Offer Management
- Position details
- Salary and benefits
- Joining date
- Location
- Probation and contract details

### Candidate Actions
- Accept
- Decline
- Negotiate

### Audit
- Offer status history
- Audit trail

---

## 25. Messaging & Notifications

### In-App Messaging System
- Real-time employer-candidate messaging
- Text messages with rich formatting
- Voice messages (audio recording and playback)
- File/document attachments
- Image sharing
- Read receipts and delivery status
- Message search and filtering
- Conversation archiving
- Message reactions (optional)

### Audio Calling
- In-app voice calls between employer and candidate
- WebRTC-based peer-to-peer calling
- Call scheduling and reminders
- Call history and duration tracking
- Call recording (with consent)
- Missed call notifications
- Call quality indicators
- Fallback to phone number if needed

### Voice Messages
- Record and send voice notes
- Playback with speed control (0.5x, 1x, 1.5x, 2x)
- Transcription to text (AI-powered)
- Voice message duration limits
- Auto-delete option after period

### Notifications
- Application status changes
- Interview reminders
- Assessment reminders
- Offer notifications
- New message alerts
- Incoming call notifications
- AI-driven personalized job alerts
  - High-match nearby job alerts
  - Interview reminders
  - Profile improvement notifications

---

## 26. Trust, Verification & Safety

### Candidate Verification
- Phone verification
- Email verification
- Identity verification
- Education verification
- Experience verification
- Skills verification

### Automated Document Verification (ID Card)
- AI-powered ID card verification
- Supported document types:
  - National ID card (Bangladesh)
  - Passport
  - Driving license
  - Student ID
  - Professional certificates
- OCR (Optical Character Recognition) for data extraction
- Face matching between ID photo and live selfie
- Document authenticity detection
  - Tampering detection
  - Image manipulation detection
  - Fake document detection
- Verification status: Pending → Processing → Verified/Rejected
- Manual review queue for flagged documents
- Re-verification support
- Document storage with encryption
- Compliance with data protection regulations

### Verification Workflow
1. User uploads document photo
2. OCR extracts text data
3. AI validates document format and authenticity
4. Face matching compares selfie with ID photo
5. System auto-approves or flags for manual review
6. Verification status updated on profile
7. Notification sent to user

### Employer/Company Verification
- Business verification
- Company profile verification
- Trade license verification (automated)
- Company registration verification

### Verification Badge System (Both Employers & Job Holders)
- **Optional verification** — users can choose to verify their account
- Verified accounts display a **verification badge** (✓) on profile and listings
- Badge tiers:
  - **Phone Verified** — OTP confirmation
  - **Email Verified** — email link confirmation
  - **Identity Verified** — NID/Passport OCR + face match
  - **Company Verified** — trade license + registration confirmed
- Admin can manually mark **new or known companies as verified**
- Verification status visible on profile, job posts, and search results
- Builds trust for employers and candidates alike

### Job Safety
- Job reporting and moderation
- Fake-job detection (rules + AI)
- Suspicious payment request detection
- Fake company detection
- Copied job description detection
- Suspicious recruiter behavior detection

### Trust System
- Internal job/company trust scoring
- Human review
- Appeals process

---

## 27. Salary Intelligence & Career Analytics

### For Candidates
- Market salary estimates by role, location, experience
- Compare expected salary vs market range

### For Employers
- Salary recommendations
- Hiring cost metrics

### Candidate Analytics
- Applications count
- Response rate
- Interview rate
- Successful job categories
- Demanded skills
- Profile score

### Employer Analytics
- Application quality
- Qualified rate
- Assessment results
- Interview conversion
- Offer conversion
- Hiring time

---

## 28. TELND Workforce — TELND as Employer

### Services
- Customer support
- Data entry
- Virtual assistants
- Sales
- Digital marketing
- Software development
- Graphic design
- Back-office operations

### Capabilities
- Recruit and employ workers
- Train, assess, deploy, manage
- B2B workforce/outsourcing revenue stream

---

## 29. Outsourcing / Workforce Services

### Workflow
1. Company submits workforce requirement
2. TELND identifies or recruits suitable people
3. Candidates complete screening, assessment, training
4. TELND deploys workforce and manages service delivery

### Future Features
- Team management
- Attendance tracking
- Performance management
- Client reporting
- Payroll integrations

---

## 30. Payments & Monetization

### Employer Revenue
- Standard job posting fees (per-job packages)
- VIP subscriptions (Silver/Gold/Platinum)
- Pay Later mode (use now, pay later — any package)
- Job Boost / Ads Manager (pay-as-you-go from wallet)
- Advertising on platform (companies can post banner ads)
- Featured/urgent/sponsored jobs
- Candidate database access
- Recruitment services
- Managed hiring fees
- Assessment and screening services

### Candidate Revenue
- Premium AI tools
- Premium mock tests
- Paid courses

### Platform Ad Revenue
- **Free users** see Google Ads and platform-sold ads
- **Paid users** (Pro/Premium) see **no ads**
- Companies can purchase ad placements directly from TELND

### Course Marketplace
- Revenue share model

### B2B Revenue
- Future outsourcing/workforce revenue

### Important Rule
- Candidates should NOT be charged simply to apply for ordinary jobs
- Tutors and Creators: **search, find, and hiring is completely free**
- Tutors/Creators only pay for payment processing and advanced features

---

## 31. Candidate Premium

### Premium Features
- Advanced AI career assistant
- Unlimited or higher limits for AI mock interviews
- Advanced CV optimization
- Career analytics
- Premium tests
- Salary insights
- Advanced career roadmaps
- Premium courses or bundled learning benefits

---

## 32. Personalized Home Feed

### Content
- Personalized jobs with match percentage and distance
- "Why this job?" explanations
- Continue-learning section
- Recommended mock tests
- Profile improvement tasks
- Application/interview reminders
- Career progress summary

---

## 33. Gamification & Engagement

### Career XP
Earned for:
- Profile completion
- Assessments taken
- Courses completed
- Mock interviews
- Useful career activity

### Professional Badges
- Profile Pro
- Interview Ready
- Skill Certified

### Principle
- Keep gamification professional and optional

---

## 34. End-to-End Workflows

### Candidate Workflow
1. Discover TELND
2. Sign up/login
3. Build career profile
4. Verify account
5. Take skill/assessment tests
6. Receive Career Score
7. Search or ask AI for jobs
8. AI ranks jobs by relevance and distance
9. Check eligibility
10. Apply
11. Complete company assessment if required
12. Interview
13. Receive offer
14. Accept/negotiate/decline
15. Get hired
16. Continue learning and career growth

### Employer Workflow
1. Register company
2. Verify company
3. Create job
4. Define mandatory requirements
5. Configure application questions/assessment
6. Publish
7. Receive eligible applications
8. AI-assisted screening
9. Shortlist
10. Invite/interview
11. Assessment
12. Final interview
13. Send offer
14. Candidate accepts
15. Hire

---

## 35. Technical Architecture

| Layer | Technology |
|-------|-----------|
| Mobile | Flutter (Android/iOS) |
| Web | Next.js (public website, candidate web, employer/admin) |
| Backend API | Node.js/TypeScript (TypeScript monorepo) |
| Primary Database | PostgreSQL |
| Geospatial | PostGIS |
| Vector/semantic matching | pgvector (initially) |
| Cache/Queues | Redis |
| Object Storage | S3-compatible (Cloudflare R2) |
| Search (scale) | OpenSearch (when needed) |
| Analytics (scale) | ClickHouse (when needed) |

### Architecture Principle
- Deterministic backend rules for hard eligibility, distance, salary, application state
- ML/recommendation for relevance
- LLM for natural-language interaction, explanations, career assistance

---

## 36. Database Design (Prisma Schema)

### Database Overview
- **Total Models**: 77+
- **Database**: PostgreSQL with PostGIS extension
- **Vector Search**: pgvector extension for semantic matching
- **ORM**: Prisma Client

### Model Categories

#### Users & Authentication (8 models)
- `User` — Core user model with roles, verification states, preferences
- `Session` — Active user sessions
- `RefreshToken` — JWT refresh tokens
- `UserCapability` — Multi-role support (JOB_SEEKER, TUTOR, FREELANCER, CREATOR, STUDENT, GUARDIAN)
- `Country` — Country configuration with currency, phone codes
- `Language` — Language configuration
- `CountryLanguage` — Country-language mapping
- `Translation` — i18n translations

#### Candidate Profile (7 models)
- `CandidateProfile` — Career profile with score, verification states
- `Education` — Education history
- `Skill` — Skills with categories (TECHNICAL, SOFT, INDUSTRY)
- `Experience` — Work experience
- `Portfolio` — Projects, GitHub, LinkedIn, websites
- `CandidateDocument` — Uploaded documents (transcripts, certificates, experience letters)
- `JobRequiredDocument` — Documents required by employers for specific jobs

#### Company & Employer (3 models)
- `Company` — Company profile with verification, trust score
- `CompanyTeamMember` — Team member roles (OWNER, ADMIN, RECRUITER, VIEWER)
- `CompanyRole` — Role enum

#### Jobs & Applications (9 models)
- `Job` — Job listings with visibility, status, requirements
- `JobCustomQuestion` — Custom application questions
- `MandatoryRequirement` — Strict-match requirements (UNIVERSITY, DEGREE, EXPERIENCE)
- `JobRequiredDocument` — Documents required for this job (transcripts, certificates, etc.)
- `Application` — Job applications with status tracking
- `ApplicationAnswer` — Answers to custom questions
- `ApplicationDocument` — Documents submitted with application
- `SavedJob` — Saved/bookmarked jobs

#### Interviews & Offers (3 models)
- `Interview` — Interview scheduling with type (PHONE, VIDEO, ONSITE, AI_MOCK)
- `Offer` — Job offers with status tracking
- `Invitation` — Employer-to-candidate invitations

#### In-App Messaging (5 models)
- `Conversation` — Chat conversations
- `ConversationParticipant` — Conversation members
- `Message` — Messages (TEXT, IMAGE, FILE, VOICE, SYSTEM)
- `MessageReaction` — Message reactions

#### Audio/Video Calls (2 models)
- `CallLog` — Call history
- `VideoInterview` — Video interview sessions with recording

#### Video Interview Analysis (2 models)
- `InterviewAnalysis` — AI analysis of video interviews
- `InterviewAnalysis` — Scores, transcript, recommendations

#### Document Verification (3 models)
- `VerificationRequest` — Verification requests (NATIONAL_ID, PASSPORT, etc.)
- `Document` — Uploaded documents with OCR data
- `FaceMatch` — Face matching verification

#### Notifications (1 model)
- `Notification` — Push/in-app notifications

#### Tutor System (5 models)
- `TutorProfile` — Tutor profile with subjects, rates, availability
- `TutorBooking` — Tutoring bookings
- `TutorClass` — Individual class sessions
- `TutorExam` — Tutor-created exams
- `TutorReport` — Progress reports

#### Merchant System (TELND Digital) (8 models)
- `Merchant` — Institution profile (COACHING_CENTER, SCHOOL, COLLEGE, UNIVERSITY)
- `MerchantStaff` — Staff members with roles
- `MerchantStudent` — Student enrollments
- `MerchantCourse` — Institution courses
- `MerchantAttendance` — Attendance tracking
- `MerchantExam` — Exam results
- `MerchantAnnouncement` — Announcements
- `MerchantFee` — Fee management

#### LMS System (10 models)
- `LMSCourse` — Course listings
- `LMSModule` — Course modules
- `LMSLesson` — Individual lessons (VIDEO, TEXT, QUIZ, ASSIGNMENT)
- `LMSEnrollment` — Student enrollments
- `LMSProgress` — Lesson progress tracking
- `LMSQuiz` — Course quizzes
- `LMSAssignment` — Course assignments
- `LMSDiscussion` — Course discussions
- `LMSCertificate` — Course certificates
- `LMSInstructor` — Instructor profiles

#### Wallet & Payments (4 models)
- `Wallet` — User wallets with balance
- `WalletTransaction` — Wallet transaction history
- `PaymentTransaction` — Payment records
- `Invoice` — Manual invoices

#### Packages & Subscriptions (3 models)
- `Package` — Subscription packages
- `UserSubscription` — Active subscriptions
- `CouponUsage` — Coupon usage records

#### Admin System (2 models)
- `AdminUser` — Admin user profiles
- `AdminAction` — Admin action audit log

#### Support System (2 models)
- `SupportTicket` — Support tickets
- `SupportMessage` — Ticket messages

#### Map & Location (2 models)
- `MapPin` — Map pins (jobs, tutors, services)
- `MapPinBookmark` — Saved map pins

#### Reports & Moderation (2 models)
- `Report` — Content reports
- `NotificationPreference` — User notification settings

---

## 37. API Endpoints

### Authentication (`/api/auth`)
- `POST /register` — Register new user
- `POST /login` — Login with email/phone
- `POST /social-login` — Login with Google/Facebook/LinkedIn
- `POST /refresh-token` — Refresh JWT token
- `POST /logout` — Logout and invalidate session
- `POST /forgot-password` — Request password reset
- `POST /reset-password` — Reset password with token
- `POST /verify-otp` — Verify phone/email OTP
- `POST /resend-otp` — Resend OTP

### Users (`/api/users`)
- `GET /me` — Get current user profile
- `PUT /me` — Update current user profile
- `GET /:id` — Get user by ID
- `PUT /:id` — Update user by ID
- `DELETE /:id` — Delete user account
- `POST /:id/avatar` — Upload avatar

### Candidate Profile (`/api/candidates`)
- `GET /me` — Get candidate profile
- `PUT /me` — Update candidate profile
- `POST /education` — Add education
- `PUT /education/:id` — Update education
- `DELETE /education/:id` — Delete education
- `POST /skills` — Add skill
- `PUT /skills/:id` — Update skill
- `DELETE /skills/:id` — Delete skill
- `POST /experience` — Add experience
- `PUT /experience/:id` — Update experience
- `DELETE /experience/:id` — Delete experience
- `POST /portfolio` — Add portfolio item
- `PUT /portfolio/:id` — Update portfolio item
- `DELETE /portfolio/:id` — Delete portfolio item

### Companies (`/api/companies`)
- `POST /` — Create company profile
- `GET /:slug` — Get company by slug
- `PUT /:id` — Update company
- `GET /:id/jobs` — Get company jobs
- `GET /:id/team` — Get company team
- `POST /:id/team/invite` — Invite team member
- `PUT /team/:id` — Update team member role
- `DELETE /team/:id` — Remove team member

### Jobs (`/api/jobs`)
- `POST /` — Create job listing
- `GET /` — Search jobs with filters
- `GET /:id` — Get job details
- `PUT /:id` — Update job
- `DELETE /:id` — Delete job
- `POST /:id/publish` — Publish job
- `POST /:id/close` — Close job
- `POST /:id/save` — Save job
- `DELETE /:id/save` — Unsave job
- `GET /saved` — Get saved jobs

### Applications (`/api/applications`)
- `POST /` — Apply to job
- `GET /` — Get user applications
- `GET /:id` — Get application details
- `PUT /:id/status` — Update application status (employer)
- `POST /:id/shortlist` — Shortlist candidate
- `POST /:id/reject` — Reject candidate
- `GET /job/:jobId` — Get applications for job (employer)

### Interviews (`/api/interviews`)
- `POST /` — Schedule interview
- `GET /` — Get user interviews
- `GET /:id` — Get interview details
- `PUT /:id` — Update interview
- `POST /:id/complete` — Complete interview
- `POST /:id/cancel` — Cancel interview

### Offers (`/api/offers`)
- `POST /` — Send offer
- `GET /` — Get user offers
- `GET /:id` — Get offer details
- `POST /:id/accept` — Accept offer
- `POST /:id/decline` — Decline offer
- `POST /:id/negotiate` — Negotiate offer

### Assessments (`/api/assessments`)
- `POST /` — Create assessment (employer)
- `GET /` — Get assessments
- `GET /:id` — Get assessment details
- `POST /:id/submit` — Submit assessment answers
- `GET /:id/results` — Get assessment results

### Messaging (`/api/messages`)
- `POST /conversations` — Create conversation
- `GET /conversations` — Get conversations
- `GET /conversations/:id` — Get conversation messages
- `POST /conversations/:id/messages` — Send message
- `PUT /conversations/:id/read` — Mark as read
- `DELETE /messages/:id` — Delete message

### Tutor System (`/api/tutors`)
- `GET /` — Search tutors
- `GET /:id` — Get tutor profile
- `POST /book` — Book tutor session
- `GET /bookings` — Get tutor bookings
- `PUT /bookings/:id` — Update booking status
- `POST /bookings/:id/classes` — Add class
- `POST /bookings/:id/exams` — Add exam
- `POST /bookings/:id/reports` — Add report

### Merchant System (`/api/merchants`)
- `POST /` — Create merchant profile
- `GET /:slug` — Get merchant by slug
- `PUT /:id` — Update merchant
- `POST /students` — Add student
- `GET /students` — List students
- `POST /courses` — Add course
- `GET /courses` — List courses
- `POST /attendance` — Mark attendance
- `GET /attendance` — Get attendance
- `POST /exams` — Add exam result
- `GET /exams` — Get exam results
- `POST /announcements` — Create announcement
- `GET /announcements` — List announcements
- `POST /fees` — Create fee record
- `GET /fees` — Get fee records

### LMS (`/api/lms`)
- `POST /courses` — Create course
- `GET /courses` — List courses
- `GET /courses/:id` — Get course details
- `PUT /courses/:id` — Update course
- `POST /courses/:id/enroll` — Enroll in course
- `GET /courses/:id/lessons` — Get course lessons
- `POST /courses/:id/lessons` — Add lesson
- `PUT /lessons/:id` — Update lesson
- `POST /lessons/:id/progress` — Update progress
- `GET /courses/:id/quizzes` — Get course quizzes
- `POST /courses/:id/quizzes` — Create quiz
- `POST /quizzes/:id/submit` — Submit quiz answers
- `GET /courses/:id/assignments` — Get assignments
- `POST /courses/:id/assignments` — Create assignment
- `POST /assignments/:id/submit` — Submit assignment
- `GET /courses/:id/discussions` — Get discussions
- `POST /courses/:id/discussions` — Create discussion
- `GET /courses/:id/certificates` — Get certificates

### Wallet & Payments (`/api/wallet`)
- `GET /` — Get wallet balance
- `POST /topup` — Top up wallet
- `GET /transactions` — Get wallet transactions
- `POST /withdraw` — Withdraw funds

### Invoices (`/api/invoices`)
- `POST /` — Create invoice (admin)
- `GET /` — Get invoices
- `GET /:id` — Get invoice details
- `PUT /:id/status` — Update invoice status
- `POST /:id/payment` — Record payment

### Packages (`/api/packages`)
- `GET /` — List packages
- `GET /:id` — Get package details
- `POST /:id/subscribe` — Subscribe to package
- `GET /subscriptions` — Get user subscriptions
- `POST /coupons/validate` — Validate coupon

### Admin (`/api/admin`)
- `GET /users` — List all users
- `PUT /users/:id` — Update user
- `DELETE /users/:id` — Delete user
- `GET /jobs` — List all jobs
- `PUT /jobs/:id` — Update job
- `DELETE /jobs/:id` — Delete job
- `GET /companies` — List all companies
- `PUT /companies/:id` — Update company
- `POST /companies/:id/verify` — Verify company
- `GET /reports` — List reports
- `PUT /reports/:id` — Handle report
- `POST /tutors/:id/promote` — Promote to Premium/Elite
- `POST /influencers/:id/promote` — Add Premium/Elite influencer
- `GET /analytics` — Platform analytics

### Support (`/api/support`)
- `POST /tickets` — Create support ticket
- `GET /tickets` — List user tickets
- `GET /tickets/:id` — Get ticket details
- `POST /tickets/:id/messages` — Add message
- `PUT /tickets/:id/status` — Update ticket status

### Map (`/api/map`)
- `GET /pins` — Search map pins
- `POST /pins` — Create map pin
- `GET /pins/:id` — Get pin details
- `PUT /pins/:id` — Update pin
- `DELETE /pins/:id` — Delete pin
- `POST /pins/:id/bookmark` — Bookmark pin
- `DELETE /pins/:id/bookmark` — Remove bookmark

### Analytics (`/api/analytics`)
- `GET /candidate/dashboard` — Candidate dashboard analytics
- `GET /employer/dashboard` — Employer dashboard analytics
- `GET /tutor/dashboard` — Tutor dashboard analytics
- `GET /merchant/dashboard` — Merchant dashboard analytics

---

## 38. File Structure

### Monorepo Structure
```
telnd/
├── apps/
│   ├── web/                          # Next.js Web App (General Portal)
│   │   ├── src/
│   │   │   ├── app/                  # App Router pages
│   │   │   ├── components/           # React components
│   │   │   └── lib/                  # Utilities, hooks, context
│   │   ├── public/                   # Static assets
│   │   ├── package.json
│   │   └── next.config.js
│   │
│   ├── admin/                        # Next.js Admin Portal
│   │   ├── src/
│   │   │   └── app/                  # Admin pages
│   │   ├── package.json
│   │   └── next.config.js
│   │
│   ├── employer/                     # Next.js Employer Portal
│   │   ├── src/
│   │   │   └── app/                  # Employer pages
│   │   ├── package.json
│   │   └── next.config.js
│   │
│   ├── mobile-general/               # Flutter - TELND App (General Users)
│   │   ├── lib/
│   │   │   ├── main.dart
│   │   │   ├── core/                 # Theme, constants, utils
│   │   │   │   ├── theme/
│   │   │   │   ├── constants/
│   │   │   │   └── utils/
│   │   │   ├── data/                 # Data models, repositories
│   │   │   │   ├── models/
│   │   │   │   ├── repositories/
│   │   │   │   └── services/
│   │   │   ├── presentation/         # UI screens, widgets
│   │   │   │   ├── screens/
│   │   │   │   │   ├── auth/         # Login, register, onboarding
│   │   │   │   │   ├── home/         # Home screen
│   │   │   │   │   ├── jobs/         # Job search, details, apply
│   │   │   │   │   ├── tutors/       # Find tutors
│   │   │   │   │   ├── projects/     # Project works
│   │   │   │   │   ├── influencers/  # Influencer listing
│   │   │   │   │   ├── profile/      # Profile management
│   │   │   │   │   ├── messages/     # Chat/messaging
│   │   │   │   │   ├── wallet/       # Wallet, payments
│   │   │   │   │   ├── map/          # Map view
│   │   │   │   │   ├── settings/     # App settings
│   │   │   │   │   └── notifications/# Notifications
│   │   │   │   ├── widgets/          # Reusable widgets
│   │   │   │   └── providers/        # State management (Riverpod)
│   │   │   └── routes/               # Named routes
│   │   ├── android/
│   │   ├── ios/
│   │   └── pubspec.yaml
│   │
│   ├── mobile-employer/              # Flutter - TELND Employer App
│   │   ├── lib/
│   │   │   ├── main.dart
│   │   │   ├── core/
│   │   │   │   ├── theme/
│   │   │   │   ├── constants/
│   │   │   │   └── utils/
│   │   │   ├── data/
│   │   │   │   ├── models/
│   │   │   │   ├── repositories/
│   │   │   │   └── services/
│   │   │   ├── presentation/
│   │   │   │   ├── screens/
│   │   │   │   │   ├── auth/         # Employer login, register
│   │   │   │   │   ├── dashboard/    # Employer dashboard
│   │   │   │   │   ├── jobs/         # Post jobs, manage listings
│   │   │   │   │   ├── candidates/   # Search, shortlist, AI selection
│   │   │   │   │   ├── interviews/   # Interview scheduling
│   │   │   │   │   ├── projects/     # Project works, escrow
│   │   │   │   │   ├── wallet/       # Wallet, invoices, payments
│   │   │   │   │   ├── analytics/    # Job analytics, reports
│   │   │   │   │   ├── profile/      # Company profile
│   │   │   │   │   ├── messages/     # Candidate messaging
│   │   │   │   │   └── settings/     # App settings
│   │   │   │   ├── widgets/
│   │   │   │   └── providers/
│   │   │   └── routes/
│   │   ├── android/
│   │   ├── ios/
│   │   └── pubspec.yaml
│   │
│   ├── mobile-tutor/                 # Flutter - TELND Tutor App
│   │   ├── lib/
│   │   │   ├── main.dart
│   │   │   ├── core/
│   │   │   │   ├── theme/
│   │   │   │   ├── constants/
│   │   │   │   └── utils/
│   │   │   ├── data/
│   │   │   │   ├── models/
│   │   │   │   ├── repositories/
│   │   │   │   └── services/
│   │   │   ├── presentation/
│   │   │   │   ├── screens/
│   │   │   │   │   ├── auth/         # Tutor login, register
│   │   │   │   │   ├── dashboard/    # Tutor dashboard
│   │   │   │   │   ├── classes/      # Class management
│   │   │   │   │   ├── students/     # Student management
│   │   │   │   │   ├── exams/        # Create & manage exams
│   │   │   │   │   ├── routines/     # Class routines/schedules
│   │   │   │   │   ├── messages/     # Student messaging
│   │   │   │   │   ├── earnings/     # Earnings, payments
│   │   │   │   │   ├── reports/      # Progress reports
│   │   │   │   │   ├── profile/      # Tutor profile
│   │   │   │   │   └── settings/     # App settings
│   │   │   │   ├── widgets/
│   │   │   │   └── providers/
│   │   │   └── routes/
│   │   ├── android/
│   │   ├── ios/
│   │   └── pubspec.yaml
│   │
│   ├── mobile-fix/                   # Flutter - TELND Fix App (Service Providers)
│   │   ├── lib/
│   │   │   ├── main.dart
│   │   │   ├── core/
│   │   │   │   ├── theme/
│   │   │   │   ├── constants/
│   │   │   │   └── utils/
│   │   │   ├── data/
│   │   │   │   ├── models/
│   │   │   │   ├── repositories/
│   │   │   │   └── services/
│   │   │   ├── presentation/
│   │   │   │   ├── screens/
│   │   │   │   │   ├── auth/         # Provider login, register
│   │   │   │   │   ├── dashboard/    # Provider dashboard, analytics
│   │   │   │   │   ├── requests/     # Service requests from admin
│   │   │   │   │   ├── jobs/         # Active jobs, history
│   │   │   │   │   ├── earnings/     # Earnings, payment tracking
│   │   │   │   │   ├── profile/      # Provider profile, services
│   │   │   │   │   ├── messages/     # Admin/customer messaging
│   │   │   │   │   └── settings/     # App settings
│   │   │   │   ├── widgets/
│   │   │   │   └── providers/
│   │   │   └── routes/
│   │   ├── android/
│   │   ├── ios/
│   │   └── pubspec.yaml
│   │
│   └── mobile-digital/               # Flutter - TELND Digital App (Institutions - Future)
│       ├── lib/
│       │   ├── main.dart
│       │   ├── core/
│       │   │   ├── theme/
│       │   │   ├── constants/
│       │   │   └── utils/
│       │   ├── data/
│       │   │   ├── models/
│       │   │   ├── repositories/
│       │   │   └── services/
│       │   ├── presentation/
│       │   │   ├── screens/
│       │   │   │   ├── auth/         # Institution login
│       │   │   │   ├── dashboard/    # Institution dashboard
│       │   │   │   ├── students/     # Student management
│       │   │   │   ├── batches/      # Batch management
│       │   │   │   ├── results/      # Publish results
│       │   │   │   ├── fees/         # Fee management
│       │   │   │   ├── quiz/         # Quiz/MCQ creation
│       │   │   │   ├── classes/      # Live classes
│       │   │   │   ├── announcements/# Announcements
│       │   │   │   ├── profile/      # Institution profile
│       │   │   │   └── settings/     # App settings
│       │   │   ├── widgets/
│       │   │   └── providers/
│       │   └── routes/
│       ├── android/
│       ├── ios/
│       └── pubspec.yaml
│
├── packages/
│   ├── types/                        # Shared TypeScript types
│   │   └── src/
│   │       ├── index.ts
│   │       ├── user.ts               # User, UserRole, Session
│   │       ├── candidate.ts          # CandidateProfile, Education, Skill
│   │       ├── company.ts            # Company, CompanyTeamMember
│   │       ├── job.ts                # Job, Application, Interview
│   │       ├── tutor.ts              # TutorProfile, TutorBooking
│   │       ├── merchant.ts           # Merchant, MerchantStudent
│   │       ├── lms.ts                # LMSCourse, LMSModule, LMSLesson
│   │       ├── payment.ts            # Wallet, PaymentTransaction, Invoice
│   │       ├── notification.ts       # Notification, NotificationPreference
│   │       ├── message.ts            # Conversation, Message
│   │       ├── map.ts                # MapPin, MapPinBookmark
│   │       ├── admin.ts              # AdminUser, AdminAction
│   │       └── common.ts             # Shared enums, interfaces
│   │
│   ├── validation/                   # Zod validation schemas
│   │   └── src/
│   │       ├── index.ts
│   │       ├── auth.ts               # Login, register schemas
│   │       ├── candidate.ts          # Profile update schemas
│   │       ├── company.ts            # Company schemas
│   │       ├── job.ts                # Job posting schemas
│   │       ├── tutor.ts              # Tutor schemas
│   │       ├── merchant.ts           # Merchant schemas
│   │       ├── lms.ts                # Course schemas
│   │       ├── payment.ts            # Payment schemas
│   │       └── common.ts             # Shared validation
│   │
│   ├── config/                       # Shared configuration
│   │   └── src/
│   │       ├── index.ts
│   │       ├── env.ts                # Environment variables
│   │       └── constants.ts          # App constants
│   │
│   ├── utils/                        # Shared utilities
│   │   └── src/
│   │       ├── index.ts
│   │       ├── cn.ts                 # className utility
│   │       ├── date.ts               # Date formatting
│   │       ├── format.ts             # Number/currency formatting
│   │       └── storage.ts            # LocalStorage utilities
│   │
│   ├── ui/                           # Shared UI components
│   │   └── src/
│   │       ├── index.ts
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Card.tsx
│   │       └── ...                   # Other shared components
│   │
│   └── database/                     # Database package
│       └── prisma/
│           ├── schema.prisma         # Database schema (77+ models)
│           └── seed.ts               # Database seeder
│
├── packages/api/                     # Hono API
│   └── src/
│       ├── index.ts                  # API entry point
│       ├── middleware/
│       │   ├── auth.ts              # JWT authentication
│       │   ├── cors.ts              # CORS configuration
│       │   ├── rateLimit.ts         # Rate limiting
│       │   └── validate.ts          # Request validation
│       └── routes/
│           ├── auth.ts              # Auth routes
│           ├── users.ts             # User routes
│           ├── jobs.ts              # Job routes
│           ├── companies.ts         # Company routes
│           ├── lms.ts               # LMS routes
│           ├── merchant.ts          # Merchant routes
│           ├── map.ts               # Map routes
│           ├── admin.ts             # Admin routes
│           ├── analytics.ts         # Analytics routes
│           ├── packages.ts          # Package routes
│           └── support.ts           # Support routes
│
├── services/
│   └── workers/                      # BullMQ workers
│       ├── src/
│       │   ├── index.ts
│       │   ├── emailWorker.ts       # Email sending
│       │   ├── smsWorker.ts         # SMS sending
│       │   ├── notificationWorker.ts # Push notifications
│       │   ├── aiWorker.ts          # AI processing
│       │   ├── imageWorker.ts       # Image processing
│       │   └── videoWorker.ts       # Video processing
│       └── package.json
│
├── infrastructure/                    # Infrastructure configs
│   ├── docker/
│   │   └── docker-compose.yml
│   └── kubernetes/                   # K8s configs (future)
│
├── docs/                             # Documentation
│   ├── architecture.md
│   ├── database.md
│   ├── api.md
│   ├── deployment.md
│   ├── security.md
│   └── performance.md
│
├── scripts/                          # Build & utility scripts
│   ├── build.sh
│   ├── deploy.sh
│   └── seed.sh
│
├── docker-compose.yml                # Docker Compose
├── package.json                      # Root package.json
├── tsconfig.json                     # Root TypeScript config
├── .env.example                      # Environment variables template
└── README.md
```

### Mobile App Variants (Flutter)

#### TELND General App (mobile-general/)
```
mobile-general/
├── lib/
│   ├── main.dart
│   ├── core/
│   │   ├── theme/                    # AppTheme (Light/Dark/Auto)
│   │   ├── constants/                # Colors, strings, assets
│   │   └── utils/                    # Helpers, extensions
│   ├── data/
│   │   ├── models/                   # Data models
│   │   ├── repositories/             # API repositories
│   │   └── services/                 # API services, storage
│   ├── presentation/
│   │   ├── screens/
│   │   │   ├── auth/                 # Login, register, onboarding
│   │   │   ├── home/                 # Home screen
│   │   │   ├── jobs/                 # Job search, details, apply
│   │   │   ├── tutors/               # Find tutors
│   │   │   ├── projects/             # Project works
│   │   │   ├── influencers/          # Influencer listing
│   │   │   ├── profile/              # Profile management
│   │   │   ├── messages/             # Chat/messaging
│   │   │   ├── wallet/               # Wallet, payments
│   │   │   ├── map/                  # Map view
│   │   │   ├── settings/             # App settings
│   │   │   └── notifications/        # Notifications
│   │   ├── widgets/                  # Reusable widgets
│   │   └── providers/                # State management (Riverpod)
│   └── routes/                       # Named routes
├── android/
├── ios/
└── pubspec.yaml
```

#### TELND Employer App (mobile-employer/)
```
mobile-employer/
├── lib/
│   ├── main.dart
│   ├── core/
│   │   ├── theme/
│   │   ├── constants/
│   │   └── utils/
│   ├── data/
│   │   ├── models/
│   │   ├── repositories/
│   │   └── services/
│   ├── presentation/
│   │   ├── screens/
│   │   │   ├── auth/                 # Employer login, register
│   │   │   ├── dashboard/            # Employer dashboard
│   │   │   ├── jobs/                 # Post jobs, manage listings
│   │   │   ├── candidates/           # Search, shortlist, AI selection
│   │   │   ├── interviews/           # Interview scheduling
│   │   │   ├── projects/             # Project works, escrow
│   │   │   ├── wallet/               # Wallet, invoices, payments
│   │   │   ├── analytics/            # Job analytics, reports
│   │   │   ├── profile/              # Company profile
│   │   │   ├── messages/             # Candidate messaging
│   │   │   └── settings/             # App settings
│   │   ├── widgets/
│   │   └── providers/
│   └── routes/
├── android/
├── ios/
└── pubspec.yaml
```

#### TELND Tutor App (mobile-tutor/)
```
mobile-tutor/
├── lib/
│   ├── main.dart
│   ├── core/
│   │   ├── theme/
│   │   ├── constants/
│   │   └── utils/
│   ├── data/
│   │   ├── models/
│   │   ├── repositories/
│   │   └── services/
│   ├── presentation/
│   │   ├── screens/
│   │   │   ├── auth/                 # Tutor login, register
│   │   │   ├── dashboard/            # Tutor dashboard
│   │   │   ├── classes/              # Class management
│   │   │   ├── students/             # Student management
│   │   │   ├── exams/                # Create & manage exams
│   │   │   ├── routines/             # Class routines/schedules
│   │   │   ├── messages/             # Student messaging
│   │   │   ├── earnings/             # Earnings, payments
│   │   │   ├── reports/              # Progress reports
│   │   │   ├── profile/              # Tutor profile
│   │   │   └── settings/             # App settings
│   │   ├── widgets/
│   │   └── providers/
│   └── routes/
├── android/
├── ios/
└── pubspec.yaml
```

#### TELND Fix App (mobile-fix/) — Service Providers
```
mobile-fix/
├── lib/
│   ├── main.dart
│   ├── core/
│   │   ├── theme/
│   │   ├── constants/
│   │   └── utils/
│   ├── data/
│   │   ├── models/
│   │   ├── repositories/
│   │   └── services/
│   ├── presentation/
│   │   ├── screens/
│   │   │   ├── auth/                 # Provider login, register
│   │   │   ├── dashboard/            # Provider dashboard, analytics
│   │   │   ├── requests/             # Service requests from admin
│   │   │   ├── jobs/                 # Active jobs, history
│   │   │   ├── earnings/             # Earnings, payment tracking
│   │   │   ├── profile/              # Provider profile, services
│   │   │   ├── messages/             # Admin/customer messaging
│   │   │   └── settings/             # App settings
│   │   ├── widgets/
│   │   └── providers/
│   └── routes/
├── android/
├── ios/
└── pubspec.yaml
```

#### TELND Digital App (mobile-digital/) — Institutions (Future)
```
mobile-digital/
├── lib/
│   ├── main.dart
│   ├── core/
│   │   ├── theme/
│   │   ├── constants/
│   │   └── utils/
│   ├── data/
│   │   ├── models/
│   │   ├── repositories/
│   │   └── services/
│   ├── presentation/
│   │   ├── screens/
│   │   │   ├── auth/                 # Institution login
│   │   │   ├── dashboard/            # Institution dashboard
│   │   │   ├── students/             # Student management
│   │   │   ├── batches/              # Batch management
│   │   │   ├── results/              # Publish results
│   │   │   ├── fees/                 # Fee management
│   │   │   ├── quiz/                 # Quiz/MCQ creation
│   │   │   ├── classes/              # Live classes
│   │   │   ├── announcements/        # Announcements
│   │   │   ├── profile/              # Institution profile
│   │   │   └── settings/             # App settings
│   │   ├── widgets/
│   │   └── providers/
│   └── routes/
├── android/
├── ios/
└── pubspec.yaml
```

### Web App Structure (Next.js)
```
web/src/
├── app/
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Landing page
│   ├── (auth)/                       # Auth routes
│   │   ├── login/
│   │   ├── register/
│   │   └── onboarding/
│   ├── (dashboard)/                  # Dashboard routes
│   │   ├── profile/
│   │   ├── jobs/
│   │   ├── applications/
│   │   ├── messages/
│   │   ├── wallet/
│   │   └── settings/
│   ├── jobs/
│   │   ├── [id]/                     # Job details
│   │   └── search/                   # Job search
│   └── api/                          # API routes (if needed)
├── components/
│   ├── ui/                           # UI components (shadcn/ui)
│   ├── forms/                        # Form components
│   ├── layout/                       # Layout components
│   └── shared/                       # Shared components
├── lib/
│   ├── api.ts                        # API client
│   ├── auth.ts                       # Auth utilities
│   ├── utils.ts                      # General utilities
│   └── hooks/                        # Custom React hooks
└── styles/
    └── globals.css                   # Global styles
```

### Admin Portal Structure (Next.js)
```
admin/src/
├── app/
│   ├── layout.tsx                    # Admin layout
│   ├── page.tsx                      # Admin dashboard
│   ├── users/
│   │   ├── page.tsx                  # User list
│   │   └── [id]/
│   │       └── page.tsx              # User details
│   ├── jobs/
│   │   ├── page.tsx                  # Job list
│   │   └── [id]/
│   │       └── page.tsx              # Job details
│   ├── companies/
│   │   ├── page.tsx                  # Company list
│   │   └── [id]/
│   │       └── page.tsx              # Company details
│   ├── reports/
│   │   └── page.tsx                  # Reports management
│   ├── analytics/
│   │   └── page.tsx                  # Analytics dashboard
│   ├── packages/
│   │   └── page.tsx                  # Package management
│   ├── support/
│   │   └── page.tsx                  # Support tickets
│   └── settings/
│       └── page.tsx                  # Platform settings
```

### Employer Portal Structure (Next.js)
```
employer/src/
├── app/
│   ├── layout.tsx                    # Employer layout
│   ├── page.tsx                      # Employer dashboard
│   ├── jobs/
│   │   ├── page.tsx                  # My jobs
│   │   ├── new/
│   │   │   └── page.tsx              # Create job
│   │   └── [id]/
│   │       ├── page.tsx              # Job details
│   │       └── applications/
│   │           └── page.tsx          # Job applications
│   ├── candidates/
│   │   └── page.tsx                  # Candidate search
│   ├── interviews/
│   │   └── page.tsx                  # Interview management
│   ├── wallet/
│   │   └── page.tsx                  # Wallet & payments
│   └── settings/
│       └── page.tsx                  # Company settings
```

---

## 39. Development Timeline

| Phase | Timeline | Main Deliverables |
|-------|----------|-------------------|
| 0 — Planning | Weeks 1–2 | Brand/product spec, UX flows, database design, API contracts, architecture, security model |
| 1 — Foundation | Weeks 3–6 | API, PostgreSQL/PostGIS, Redis, Flutter/Next.js foundations, authentication, roles, company/candidate profiles |
| 2 — MVP Jobs | Weeks 7–12 | Candidate profiles, employer profiles, job posting, search, filters, applications, saved jobs, notifications |
| 3 — Smart Matching | Weeks 13–16 | AI-assisted profile parsing, job matching, location ranking, explainable match score, mandatory eligibility rules |
| 4 — Recruitment | Weeks 17–21 | Candidate discovery, employer invitations, shortlisting, recruitment pipeline, messaging, interview scheduling |
| 5 — Assessment | Weeks 22–26 | Company initial tests, assessment engine, scoring, question bank, TELND mock tests, assessment analytics |
| 6 — AI Career | Weeks 27–31 | AI Career Assistant, AI CV builder, job-action tools, AI mock interviews, skill-gap analysis |
| 7 — Learning | Weeks 32–36 | TELND Learn, free/paid courses, progress tracking, certifications, skill assessments |
| 8 — Workforce | Weeks 37–42 | TELND hiring operations, workforce/outsourcing workflows, B2B service management |
| 9 — Scale & Intelligence | Ongoing | Advanced analytics, salary intelligence, trust scoring, anti-fraud, OpenSearch/ClickHouse, optimization |

---

## 37. Recommended MVP Scope

### Must Have at Launch
- Candidate signup/login
- Google/Facebook/LinkedIn/email/phone auth
- Candidate profile
- Employer/company profile
- Job posting and search
- Applications
- Basic notifications

### Early Differentiators
- AI natural-language job search
- Explainable match score
- Employer-to-candidate invitations
- Interview scheduling
- Company assessments

### Post-MVP
- AI mock interviews
- TELND Mock Tests
- CV builder
- Courses
- Certifications
- Salary intelligence
- Skill-gap analysis

### Expansion
- TELND Workforce
- Outsourcing
- Advanced analytics
- Large-scale search
- Creator courses
- Project/freelance opportunities

---

## 38. Technical Assumptions

1. The backend will use Node.js/TypeScript (the PDF recommends Laravel, but the project owner has chosen a TypeScript monorepo)
2. PostgreSQL with PostGIS extension for geospatial queries
3. pgvector for semantic/vector matching
4. Redis for caching, queues, and session data
5. Cloudflare R2 for object storage (S3-compatible)
6. Cloudflare for CDN and DDoS protection
7. OpenSearch will be introduced when search volume requires it
8. ClickHouse will be introduced for analytics at scale

---

## 40. Recommended Improvements

1. **Rate limiting on all public endpoints** — Prevent abuse
2. **Image optimization pipeline** — Process uploaded images asynchronously
3. **Video processing pipeline** — For course content and creator features
4. **Audit logging** — Track all sensitive operations
5. **Soft deletion** — For user accounts and important records
6. **Geospatial indexing** — Optimize location-based queries
7. **Connection pooling** — Use PgBouncer for PostgreSQL
8. **Background job architecture** — For email, SMS, push notifications, AI processing
9. **Search indexing** — Prepare for OpenSearch migration
10. **Analytics pipeline** — Prepare for ClickHouse integration

---

## 41. Open Questions / Decisions Required Later

1. **Payment gateway**: Which payment provider for Bangladesh? (bKash, Nagad, Stripe, etc.)
2. **SMS provider**: Which SMS gateway for OTP?
3. **Email provider**: SendGrid, AWS SES, or other?
4. **AI provider**: OpenAI, Anthropic, or self-hosted models?
5. **Video hosting**: For course content — self-hosted or third-party?
6. **Mobile push notifications**: Firebase Cloud Messaging or other?
7. **Domain and branding**: Final domain name and brand guidelines
8. **Legal compliance**: Bangladesh labor law, data protection, privacy requirements
9. **Localization**: Bengali language support scope
10. **Monetization pricing**: Specific pricing tiers for premium features
11. **WebRTC provider**: For video/audio calls — self-hosted or third-party (Daily.co, Twilio)?
12. **OCR/Verification provider**: For ID card verification — Google Vision, AWS Textract, or custom?
13. **International expansion**: Which countries to support first?

---

## 42. In-App Messaging System (Future)

### Real-Time Messaging
- WebSocket-based real-time messaging
- Text, voice messages, file sharing
- Message delivery and read receipts
- Typing indicators
- Message reactions and replies
- Conversation search and filtering
- Message pinning and archiving

### Audio Calling (Future)
- WebRTC peer-to-peer audio calls
- Call scheduling with calendar integration
- Call recording and transcription
- Call quality monitoring
- Fallback to PSTN (phone) if needed
- Call history and analytics

### Voice Messages (Future)
- Record, send, and playback voice notes
- AI-powered transcription
- Speed control (0.5x, 1x, 1.5x, 2x)
- Auto-transcription to text
- Duration limits and compression

### Technical Architecture
```
Client (Web/Mobile)
       ↓
WebSocket Server (Socket.io / ws)
       ↓
Message Queue (Redis Pub/Sub)
       ↓
Message Storage (PostgreSQL)
       ↓
Object Storage (Voice/Files - S3/R2)
```

### Security
- End-to-end encryption for messages
- Message retention policies
- Report and block functionality
- Content moderation (AI + human)
- Compliance with data protection laws

---

## 43. Video Interview Platform (Future)

### Features
- One-on-one video interviews
- Panel interviews (multiple interviewers)
- Screen sharing
- Real-time chat
- Interview recording
- AI-powered analysis

### Technical Stack
- WebRTC for real-time communication
- TURN/STUN servers for NAT traversal
- SFU (Selective Forwarding Unit) for multi-party
- Recording to object storage
- Speech-to-text transcription
- AI analysis pipeline

### Architecture
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

### Privacy & Compliance
- Consent required for recording
- Secure storage of recordings
- Data retention policies
- GDPR/local compliance
- Right to deletion

---

## 44. Internationalization & Multi-Language Support (Future)

### Language Support
- **Initial**: English (en) and Bengali (bn)
- **Expansion**: Admin can enable additional countries/languages
- **Supported languages per country**: Configurable by admin

### Architecture
- i18n framework integration (next-intl for web, flutter_localizations for mobile)
- Translation files stored as JSON
- Database-stored translations for dynamic content
- RTL support preparation (for future Arabic, Hebrew, etc.)
- Date, time, number, and currency formatting per locale

### Localization Features
- UI text translation
- Job titles and descriptions translation
- Currency conversion and display
- Date/time format per locale
- Phone number format per country
- Address format per country
- Holiday and working hours per country

### Country Configuration (Admin-Managed)
```json
{
  "country_code": "BD",
  "name": "Bangladesh",
  "enabled": true,
  "languages": ["en", "bn"],
  "default_language": "bn",
  "currency": "BDT",
  "phone_format": "+880",
  "date_format": "DD/MM/YYYY",
  "time_zone": "Asia/Dhaka"
}
```

### Internationalization Workflow
1. Admin enables new country
2. Admin configures country settings (currency, phone, timezone)
3. Admin uploads/enables language translations
4. Users can select their language
5. Content is displayed in selected language
6. Currency and date formats adjust automatically

---

## 45. Multi-Type Accounts (Enhanced)

### Account Types
- **Candidate** — Job seeker
- **Employer** — Company/recruiter
- **Admin** — Platform administrator
- **Creator** — Course/Influencer (future)
- **Freelancer** — Independent worker (future)
- **Agency** — Recruitment agency (future)

### Account Switching
- Users can have multiple account types
- Seamless switching between roles
- Separate dashboards per role
- Shared authentication across roles

### Role-Based Permissions
| Role | Can Do |
|------|--------|
| Candidate | Apply, message, take tests |
| Employer | Post jobs, manage hiring, message candidates |
| Admin | Manage platform, verify users, moderate content |
| Creator | Publish courses, manage students |
| Freelancer | Offer services, bid on projects |
| Agency | Manage multiple clients, submit candidates |

### Multi-Tenancy Preparation
- Company-level data isolation
- Agency client management
- Role-based API access
- Permission middleware

---

## 46. Security System (Comprehensive)

### Authentication Security
- Password hashing (bcrypt, 12+ rounds)
- JWT with short expiry (15 min access, 7 day refresh)
- Refresh token rotation
- Session management with device tracking
- OAuth 2.0 for social login
- Multi-factor authentication (MFA) support

### Authorization
- Role-based access control (RBAC)
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

## 47. Map Feature

### 47.1 Map Provider
- Google Maps (primary), with fallback to OpenStreetMap
- Google Maps JavaScript API for web
- Google Maps Flutter plugin for mobile
- PostGIS for geospatial queries

### 47.2 Location Display Rules
- **Exact location** (full address + precise coordinates):
  - Job listings
  - Company profiles
  - Merchant institutions (coaching centers, schools)
  - Merchants with physical addresses
- **Approximate location** (area name + coords ±500m):
  - Tutor profiles
  - Freelancer profiles
  - Influencer Profiles
  - Users without verified business addresses

### 47.3 Map Features
- View listings on interactive map
- Filter by type (jobs, tutors, creators, merchants)
- Cluster markers for dense areas
- Get directions to exact locations
- Save favorite locations
- Search by area/location
- Auto-sync with listings (on create/update/delete)
- Geocoding/caching for performance

### 47.4 Geocoding
- Address → Coordinates (geocoding)
- Coordinates → Address (reverse geocoding)
- Cache geocoding results (Redis)
- Rate limit geocoding API calls
- Batch geocoding for existing listings

## 48. Merchant System

### 48.1 Merchant Types
- Coaching Centers
- Schools
- Colleges
- Universities
- Training Institutes
- Custom institutions

### 48.2 Merchant Features
- Institution profile with logo, description, courses
- Staff management (teachers, admin, accountants)
- Student enrollment and management
- Course/class management
- Attendance tracking (manual, QR code, facial recognition)
- Exam creation and management
- Result publishing
- Routine/schedule management
- Fee collection and tracking
- Announcement system
- Document management
- Report generation

### 48.3 Merchant Staff Roles
- Owner
- Admin
- Teacher/Instructor
- Accountant
- Support Staff
- Custom roles (owner-created)

### 48.4 Merchant Packages
- **To be decided later** — merchant packages and revenue model will be designed after core platform features are finalized

## 49. LMS System

### 49.1 Course Management (Admin-Handled)
- **TELND admin handles all course details**
- Admin creates and publishes courses (TELND's own courses)
- Admin adds instructors (their portal login is future work)
- Course creation with modules/sections
- Lesson types: Video, Text, Quiz, Assignment, Live Class
- Course categories and tags
- Course prerequisites
- Course certificates
- Course reviews and ratings

### 49.2 Future: Multi-Instructor Platform
- Admin can publish courses
- Other instructors can also publish their courses (future)
- Instructor portal login (future work)
- Course management dashboard for instructors

### 49.3 Live Classes (Separate Portal in Future)
- **Live will be completely a separate portal in the future**
- Real-time video classes (WebRTC)
- Screen sharing
- Chat during class
- Recording (with permission)
- Attendance tracking
- Q&A sessions

### 49.4 Assessments
- Quizzes (multiple choice, true/false, short answer)
- Assignments (file upload, text submission)
- Grading system
- Auto-grading for quizzes
- Peer review for assignments

### 49.5 Progress Tracking
- Lesson completion tracking
- Quiz scores
- Assignment grades
- Overall course progress
- Certificates on completion
- Learning analytics

### 49.6 Discussion Forums
- Course-specific discussions
- Threaded replies
- Upvote/downvote
- Mark as answer
- Moderation tools

## 50. Analytics System

### 50.1 Admin Analytics
- Total users/employers/merchants
- New registrations (daily/weekly/monthly)
- Active users (DAU, WAU, MAU)
- Revenue metrics
- Popular job categories
- Geographic distribution
- Feature usage statistics
- Platform health metrics

### 50.2 User Analytics
- Application statistics
- Profile views
- Search appearances
- Skill endorsements
- Learning progress
- Recommendation accuracy

### 50.3 Employer Analytics
- Job posting performance
- Application metrics
- Hire conversion rates
- Cost per hire
- Time to hire
- Candidate quality scores

### 50.4 Tutor Analytics
- Tuition hours
- Earnings
- Student ratings
- Class attendance
- Student progress
- Popular subjects

### 50.5 AI-Powered Insights
- Trend predictions
- Anomaly detection
- Automated recommendations
- Performance forecasts
- Market demand analysis

## 51. Packages & Subscriptions

### 51.1 User Packages
- Free (basic features, limited access)
- Pro (advanced features, priority support)
- Premium (all features, premium support)
- Custom packages (admin-configurable)

### 51.2 Employer Packages

#### Standard Employer Packages (Per Job)
| Package | Price | Features |
|---------|-------|----------|
| Basic | ৳500/job | Standard listing, basic analytics |
| Standard | ৳1,000/job | Featured listing, advanced analytics, priority support |
| Premium | ৳1,200/job | Sponsored listing, full analytics, dedicated support, profile boost |

#### VIP Employer Packages (Monthly Subscription)
| Package | Price | Jobs Included | Extra Features |
|---------|-------|---------------|----------------|
| Silver | ৳5,000/month | 10 jobs | Basic branding, standard analytics |
| Gold | ৳15,000/month | 50 jobs | Custom branding, advanced analytics, priority listing |
| Platinum | ৳40,000/month | Unlimited | Full branding, premium analytics, dedicated account manager, API access |

#### Logo Color by Package
- **Free employers**: Default logo display
- **Pro subscribers**: Logo gets accent color treatment
- **Premium subscribers**: Logo gets full brand color display
- Visual distinction encourages upgrades

#### Pay Later Mode (Available on ALL Employer Packages)
- Employers can use **any feature or package** and pay later
- Connects directly with their TELND account
- Bills generated after usage (per-job, per-boost, per-feature)
- Payment terms: net 15 or net 30 days (configurable by admin)
- Credit limit set by admin based on company history
- Late payment penalties configurable by admin
- Auto-subscription via bKash API (planned for later phase)

#### Package Upgrades
- Employers can upgrade/downgrade packages anytime
- Pro-rated billing for mid-cycle changes
- Immediate access to new features upon upgrade

### 51.3 Merchant Packages
- **To be decided later** — merchant packages and revenue model will be designed after core platform features are finalized

### 51.4 Package Features
- Admin-configurable pricing
- Feature gates per package
- Usage limits per package
- Trial periods
- Upgrade/downgrade
- Proration
- Multi-currency support

## 52. Coupon & Discount System

### 52.1 Coupon Types
- Percentage discount (e.g., 10% off)
- Fixed amount (e.g., $5 off)
- Free trial (e.g., 7 days free)
- Upgrade (e.g., Free → Pro)

### 52.2 Coupon Rules
- Usage limits (total and per user)
- Expiry dates
- Minimum purchase amount
- Applicable to specific packages
- Applicable to specific users
- First purchase only
- Referral codes

### 52.3 Referral System
- Unique referral codes per user
- Referrer rewards
- Referee rewards
- Referral tracking
- Fraud detection

## 53. Support System

### 53.1 Support Tickets
- Create tickets with categories
- Priority levels (low, medium, high, urgent)
- Status tracking (open, in-progress, resolved, closed)
- Internal notes
- File attachments
- Auto-assignment

### 53.2 Live Chat
- Real-time messaging with support
- Bot responses for common questions
- Escalation to human agents
- Chat history
- Satisfaction ratings

### 53.3 Help Center
- FAQ articles
- Searchable knowledge base
- Video tutorials
- Contact forms
- Community forums

## 54. Security Features

### 54.1 Anti-Scraping
- robots.txt blocking AI scrapers (GPTBot, CCBot, Google-Extended, etc.)
- Honeypot fields and links
- Rate limiting per IP
- CAPTCHA on sensitive actions
- Data masking for sensitive information
- Watermarks on generated content

### 54.2 Data Protection
- End-to-end encryption for messaging
- At-rest encryption for sensitive data
- Data masking for PII
- GDPR compliance tools
- Data retention policies
- Right to deletion

### 54.3 Verification System
- Document verification (OCR + AI)
- Face matching (selfie vs ID)
- Tampering detection
- Manual review queue
- Verification badges

### 54.4 Account Security
- Two-factor authentication (2FA)
- Login alerts
- Session management
- Password strength requirements
- Account lockout after failed attempts

## 55. Age Restrictions

### 55.1 Feature Gating by Age
- Job apply: 18+
- Tutor services: 21+
- Freelancing: 18+
- Merchant enrollment: varies by type
- Content creation: 13+ (with parental consent under 18)

### 55.2 Age Verification
- Date of birth required at signup
- Age verification for restricted features
- Parental consent for minors
- Age-appropriate content filtering

## 56. Multi-Language Support

### 56.1 Supported Languages
- English (en) — default
- Bengali (bn) — Bangladesh

### 56.2 Language Features
- Per-user language preference
- Admin-configurable default language
- RTL support (future)
- Date/time localization
- Number formatting
- Currency localization

### 56.3 Content Translation
- UI text translation
- User-generated content (optional)
- AI-powered translation
- Manual translation review
- Translation memory

---

## 57. Job Boost & Ads Manager

### 57.1 Boost System
- Employers boost job posts to reach top matching candidates
- Pay-as-you-go from wallet balance
- Minimum deposit required (configurable by admin, e.g., ৳500 minimum)
- Boost queue runs once daily (batch processing)
- Algorithm matches job to top profiles based on: skills, location, experience, education
- Employer receives full analytics report

### 57.2 Boost Analytics
- Total impressions (how many saw the boosted job)
- Unique views
- Click-through rate
- Applications received
- Cost-per-click breakdown
- Daily spend tracking
- Campaign performance over time
- Comparison with non-boosted posts

### 57.3 Targeting Options
- Location (district, division, nationwide)
- Skills match
- Experience level
- Education level
- Industry/category
- Age range

### 57.4 Budget Controls
- Daily spending cap
- Total campaign budget
- Auto-pause when wallet depleted
- Manual pause/resume
- Budget adjustment mid-campaign

---

## 58. Advertising System

### 58.1 Platform Ads (Admin Only)
- **Only admin can add platform ads** — employers cannot add ads directly
- Admin creates and manages all ad placements
- Banner ads, sponsored content, featured placements
- Admin manages ad inventory and pricing
- Ad scheduling and rotation

### 58.2 Home Page Ad Slots
- **10 ad slots** on home page
- Ads refresh **randomly** on every page refresh
- **Google Mini Ads** also shown on home page
- Mix of platform ads and Google ads

### 58.3 Job List Page Ads
- **Featured Jobs** show only on job list page
- **General Jobs, Corporate Jobs, Government Jobs** — all can have ads
- All ads show in dedicated job list page
- **Sponsored Jobs** show randomly in job list:
  - Example: after 3 jobs, then after 6 jobs, then after 4 jobs
  - Pattern is **not fixed** — random placement after a few jobs
  - Creates natural ad experience without fixed positions

### 58.4 Job Details Page Ads
- **Sponsored Jobs** show randomly in job details page
- Placement depends on **targeting** (location, skills, experience)
- Relevant sponsored jobs shown based on candidate profile
- Non-intrusive placement within job details

### 58.5 Google Ads Integration
- Google Ads shown to **free users** only
- Paid users (Pro/Premium) see **no ads**
- Revenue from Google AdSense for free user traffic

### 58.6 Ad-Free Experience
- Pro subscribers: reduced ads
- Premium subscribers: completely ad-free
- Incentive for users to upgrade to paid plans

---

## 58B. Force Update Policy

### All Mobile Apps — Mandatory Version Update
- **All TELND mobile apps** (General, Employer, Tutor, Fix, Digital) use **force update**
- When a newer version is released, **previous version cannot be used**
- User must update to latest version to continue using the app
- No option to skip or dismiss update

### How It Works
1. App checks version on launch
2. If current version < minimum required version → **force update popup**
3. User is redirected to App Store / Play Store
4. App closes until updated
5. No access to any features until update complete

### Update Management
- Admin sets minimum required version from admin panel
- Admin can force update for specific app versions
- Version control per platform (iOS/Android separately)
- Staged rollout supported (percentage-based)

### Benefits
- Ensures all users have latest security patches
- Prevents compatibility issues with old APIs
- Simplifies maintenance (no need to support old versions)
- Ensures all users see latest features and bug fixes

---

## 59. Wallet System

### 59.1 Wallet Features
- Every employer gets a wallet upon account creation
- Minimum deposit required (configurable by admin)
- Top-up via SSLCommerz (bKash, Nagad, Rocket, card)
- Balance used for: job posting, job boost, ads, premium features
- Transaction history with receipts
- Auto-recharge option (planned)

### 59.2 Wallet Operations
- Deposit (top-up)
- Deduction (per-job, per-boost, per-ad)
- Refund (if job removed, dispute won)
- Transfer (employer to employer — admin configurable)
- Withdrawal (request payout — admin approval required)

### 59.3 Billing & Invoices
- Monthly invoice generation
- Detailed breakdown of all charges
- PDF download for accounting
- Tax calculation (VAT, SD as applicable)

### 59.4 Manual Invoice & Payment System

#### Invoice Creation
- Admin can create manual invoices for any user/employer
- Invoice includes: user details, description, amount, due date, payment terms
- Invoice status: Draft → Pending → Paid / Cancelled

#### Payment Recording
- Every invoice has a corresponding payment record in payment tables
- Payment details: amount, method, date, transaction ID, status
- Multiple payments can be applied to one invoice (partial payments)
- Payment history tracked for each invoice

#### Invoice Cancellation
- Admin can cancel any invoice
- When invoice is cancelled, all associated payments are also cancelled
- Cancelled payments reflected in payment records with "Cancelled" status
- Refund processing for any payments already made

#### Admin Refund Handling
- Admin can process refunds for cancelled invoices
- Refund methods: original payment method, wallet credit, bank transfer
- Refund status tracking: Pending → Processing → Completed → Failed
- Refund receipts generated automatically

---

## 60. Tutor & Influencer Pricing

### 60.1 Free Services (No Charge)
- Profile creation and listing
- Search and discovery by students/clients
- Receiving inquiries
- Hiring and project assignment
- Basic analytics

### 60.2 Paid Services (Charges Apply)
- Payment processing fee (when receiving payments through TELND)
- Premium profile features (priority listing, advanced analytics)
- Tuition Management Tools (schedules, exams, docs sharing, etc.)
- Marketing/promotion features
- Withdrawal processing fee

### 60.3 Revenue Model
- TELND takes commission only on transactions processed through the platform
- Search, find, and hiring is **completely free** for tutors and influencers
- No subscription required for basic services
- **No 70/30 or 80/20 split** — only escrow % fees apply

### 60.4 Tutor Messaging System

#### Approaching Tutors
- General accounts can approach **10 tutors per day** via direct message
- **Before sending message**, user must request with details:
  - Student name
  - Class
  - Age
  - Subject interested to study
- Request goes to tutor inbox
- **Until tutor replies, user cannot send more messages**

#### Tutor Response Flow
1. Tutor receives request with student details
2. Tutor can ask questions and send message
3. Tutor selects tuition fees
4. System sends a **card with all details** to student
5. Student accepts → selected as tutor
6. Only **tutor can make video/audio call** to discuss

#### Rate Limiting
- 10 tutor approaches per day
- Limit resets daily
- Pending requests block new approaches until tutor responds

### 60.5 Influencer Listing

#### How to Become a Creator
- **No separate account needed** — list from General Account
- Creator must accept **consent form** before listing
- Upload Influencer Avatar and profile pictures
- System tracks work history automatically

#### Influencer Limits
- Normal influencers: **5 approaches per day**, **25 per month**
- Premium/Elite Influencers: Added by admin only
- Premium/Elite can choose: direct messages OR through TELND
- Limit releases when hire is made

#### Influencer Verification
- After first successful project work, system automatically shows verification badge
- Badge appears beside project work posts
- Builds trust for future clients

### 60.6 AI Selection for Employers

#### AI Candidate Shortlisting
- Employers can ask TELND AI to shortlist candidates
- **By specific criteria** — just type requirements in natural language
- AI asks back for confirmation or refinement
- AI provides shortlisted candidates with match scores

#### How It Works
1. Employer types requirement message (e.g., "Find me 5 React developers with 3+ years experience in Dhaka")
2. AI asks for any missing information or clarification
3. AI processes and returns shortlisted candidates
4. Employer reviews and contacts selected candidates

#### Package Limits
- AI selection count limited by employer package
- Higher packages get more AI selections per month

---

## 61. Pro/Premium Subscriber Benefits

### 61.1 Logo Customization
- **Free users**: Default logo display
- **Pro subscribers**: Logo gets accent color treatment (theme-aware)
- **Premium subscribers**: Full brand color display on logo

### 61.2 Ad-Free Experience
- Free users: See Google Ads and platform ads
- Pro users: Reduced ads
- Premium users: Completely ad-free

### 61.3 Priority Features
- Priority in search results
- Faster customer support
- Early access to new features
- Advanced analytics and reporting

---

## 62. Workflow Map

### Job Seeker Workflow
```
Sign Up → Select Account Type (General) → Complete Profile
    ↓
Click "I'm Looking For" → Select Job Type Modal
    ↓
┌─────────────────┬──────────────────┬──────────────────┬─────────────────┐
│ Corporate Job   │ General Job      │ Government Job   │ Project Works   │
│ (Verification   │ (No verification│ (Admin only)     │ (Rate limited)  │
│  required)      │  required)       │                  │                 │
└─────────────────┴──────────────────┴──────────────────┴─────────────────┘
    ↓
Browse Jobs → AI Matching → Apply → Interview → Offer → Hired
    ↓
OR: AI Live Skill Test → Video Test → Certificate → Verified Skills
```

### Tutor Workflow
```
General Account → Accept Tutor Consent → Upload Avatar → Tutor Profile Created
    ↓
Receive Request (with student details) → Respond → Send Fees Card
    ↓
Student Accepts → Video/Audio Call → Tuition Starts
    ↓
Manage Classes → Send Exams → Track Reports → Get Paid
```

### Creator Workflow
```
General Account → Accept Creator Consent → Upload Avatar → Influencer Profile Created
    ↓
List Services → Receive Approaches → Respond → Hire
    ↓
Complete Work → Auto Verification Badge → Build Reputation
```

### Employer Workflow
```
Sign Up → Select Employer Type (General/Corporate/Government)
    ↓
Complete Profile → Company Verification (if Corporate)
    ↓
Post Jobs → AI Shortlist Candidates → Review → Interview → Hire
    ↓
OR: Post Project Works → Escrow Payment → Hire Freelancer
```

### Project Works Flow
```
Post Project → Set Requirements → Escrow Payment → Project Starts
    ↓
Rate Limit: 5 pending projects max
    ↓
Hire Freelancer → Work Delivered → Review → Release Payment
    ↓
Project Complete → Limit Released → Can Post New Project
```

### Tutor Messaging Flow
```
Student Approaches (10/day limit)
    ↓
Submit Request (name, class, age, subject)
    ↓
Request → Tutor Inbox
    ↓
Tutor Responds → Ask Questions → Send Fees Card
    ↓
Student Accepts → Selected → Video/Audio Call (tutor initiates)
```

---

## 63. Portal Structure

### General Portal (Flutter App)
- Job search and application
- Find tutors
- Post project works
- Influencer Listing (with consent)
- AI skill tests
- Profile management
- Wallet and payments

### Tutor Portal (Flutter App)
- Classes dashboard
- Students management
- Exam plans and routines
- Create online exams
- Send messages to students
- Notification of classes
- Class history tracking
- Earnings and payments

### Employer Portal (Flutter App)
- **Account Types**: General Job, Corporate Job, Government Job
- Post jobs (all three types can post project works)
- AI candidate shortlisting
- Candidate management
- Interview scheduling
- Project works management
- Wallet and invoices
- Analytics dashboard

### Admin Portal (Web)
- User management
- Job type enable/disable (Corporate, General, Government)
- Government job posting
- Influencer management (add Elite/Premium)
- LMS management (create courses, add instructors)
- Invoice and payment management
- Refund processing
- Platform analytics
- Content moderation

---

## 64. Future Updates

### School/College/University/Institution Connection
- Connect schools, colleges, universities, and institutions to TELND platform
- Institutional dashboards for managing students and courses
- Integration with existing LMS systems
- Institutional verification and badges

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

### Creator Portal (Future)
- If needed, separate creator portal can be added
- Currently creators list from General Account
