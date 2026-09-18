# TELND Architecture

## Overview

TELND is a monorepo-based career and talent platform built with TypeScript (web/API) and Flutter (mobile). It supports internationalization, real-time messaging, video interviews, and automated document verification.

## Monorepo Structure

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

## Technology Decisions

### Why Hono for API?
- Lightweight and fast
- Edge-runtime compatible
- Works with Next.js API routes and standalone
- TypeScript-first

### Why Prisma?
- Excellent TypeScript support
- Type-safe database queries
- Built-in migrations
- Good PostgreSQL/PostGIS support

### Why Flutter for Mobile?
- Single codebase for Android/iOS
- Strong performance on low-end devices
- Rich widget ecosystem

### Why PostgreSQL + PostGIS?
- PostGIS for geospatial queries (distance-based job ranking)
- pgvector for semantic matching (future)
- Battle-tested at scale

## Data Flow

```
Flutter Mobile ─┐
                ├──→ API (Hono) ──→ PostgreSQL + Redis
Next.js Web ────┘         │
                          ├──→ WebSocket Server (Messaging/Video)
                          ├──→ Background Workers (BullMQ)
                          └──→ Object Storage (S3/R2)
```

## Real-Time Features Architecture

### WebSocket Server
- Socket.io for real-time messaging
- WebRTC signaling for video/audio calls
- Redis Pub/Sub for scaling across instances
- Connection management and authentication

### Video Interview Architecture
```
Client (Web/Mobile)
       ↓
WebSocket (Signaling)
       ↓
WebRTC (Peer Connection)
       ↓
SFU Server (Multi-party)
       ↓
Recording Pipeline → Object Storage
       ↓
AI Analysis → Transcription + Scoring
```

## Internationalization Architecture

### Language Support
- Initial: English (en) and Bengali (bn)
- Expansion: Admin-configurable per country
- Database-stored translations for dynamic content

### Translation Flow
```
User selects language
       ↓
i18n framework loads translations
       ↓
UI renders in selected language
       ↓
Date/time/number formatting adjusts
       ↓
Currency display updates
```

### Country Configuration
- Admin enables countries via dashboard
- Per-country settings (currency, timezone, phone format)
- Language availability per country
- Content moderation rules per region

## Document Verification Architecture

### OCR & Verification Pipeline
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

### Security
- Encrypted document storage
- Access control (only verification team)
- Data retention policies
- Compliance with local regulations

## Security Layers

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
