# TELND Database

## PostgreSQL Schema

### Core Tables

- **User** — Authentication and basic info
- **Session** — Active sessions
- **RefreshToken** — Token refresh
- **CandidateProfile** — Candidate career profiles
- **Company** — Employer companies
- **Job** — Job listings
- **Application** — Job applications
- **Interview** — Interview schedules
- **Offer** — Job offers
- **Education** — Candidate education
- **Skill** — Candidate skills
- **Experience** — Work experience
- **Portfolio** — Portfolio items
- **Notification** — User notifications

### Messaging Tables (Future)

- **Conversation** — Chat conversations
- **Message** — Individual messages
- **MessageReaction** — Message reactions
- **CallLog** — Audio/video call history
- **VoiceMessage** — Voice message metadata

### Video Interview Tables (Future)

- **VideoInterview** — Video interview sessions
- **InterviewRecording** — Recorded interviews
- **InterviewTranscript** — AI-generated transcripts
- **InterviewAnalysis** — AI analysis results

### Document Verification Tables (Future)

- **VerificationRequest** — Verification submissions
- **Document** — Uploaded documents
- **VerificationResult** — Verification outcomes
- **FaceMatch** — Face matching results

### Internationalization Tables (Future)

- **Country** — Country configurations
- **Language** — Supported languages
- **Translation** — UI translations
- **CountryLanguage** — Country-language mappings

## Indexes

Indexes are created on:
- Foreign keys
- Frequently queried columns (status, type, location)
- Date fields for sorting
- Composite indexes for common query patterns

## Geospatial

PostGIS is used for:
- Job location storage (latitude/longitude)
- Distance-based job ranking
- Location-aware search

## Migrations

```bash
npm run db:migrate     # Development
npm run db:migrate:prod # Production
npm run db:seed        # Seed data
```

## Scaling Strategy

1. Connection pooling with PgBouncer
2. Read replicas for read-heavy queries
3. Partitioning for large tables (messages, notifications)
4. OpenSearch for full-text search at scale
5. ClickHouse for analytics at scale
