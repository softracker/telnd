# TELND — Career & Talent Platform

TELND is a career and talent ecosystem that helps people prepare for careers, discover opportunities, prove their skills, get hired, and continue growing.

## Tech Stack

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

## Monorepo Structure

```
telnd/
├── apps/
│   ├── web/          # Next.js web application
│   ├── mobile/       # Flutter mobile app
│   └── admin/        # Admin dashboard
├── packages/
│   ├── types/        # Shared TypeScript types
│   ├── validation/   # Zod validation schemas
│   ├── config/       # Configuration
│   ├── utils/        # Shared utilities
│   ├── database/     # Prisma + Redis
│   ├── api/          # Hono API layer
│   └── ui/           # Shared UI components
├── services/
│   └── workers/      # Background job processing
├── infrastructure/
│   ├── docker/       # Dockerfiles
│   └── nginx/        # Nginx config
├── docs/             # Documentation
└── scripts/          # Dev scripts
```

## Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop
- Flutter 3.2+ (for mobile)

## Quick Start

```bash
# Clone the repository
git clone <repo-url>
cd telnd

# Install dependencies
npm install

# Start infrastructure (PostgreSQL + Redis)
docker compose up -d

# Copy environment file
cp .env.example .env

# Run database migrations
npm run db:migrate

# Seed database
npm run db:seed

# Start development server
npm run dev
```

The web app will be available at http://localhost:3000.

## Development Commands

```bash
npm run dev           # Start web app
npm run build         # Build web app
npm run lint          # Lint all packages
npm run typecheck     # Type check all packages
npm run test          # Run all tests

npm run db:migrate    # Run migrations
npm run db:seed       # Seed database
npm run db:studio     # Open Prisma Studio
npm run db:reset      # Reset database
```

## Flutter Development

```bash
cd apps/mobile
flutter pub get
flutter run
```

## Project Documentation

- [Architecture](docs/architecture.md)
- [Database](docs/database.md)
- [API](docs/api.md)
- [Authentication](docs/authentication.md)
- [Caching](docs/caching.md)
- [Performance](docs/performance.md)
- [Deployment](docs/deployment.md)
- [Security](docs/security.md)
- [Development Guide](docs/development.md)
- [Product Specification](TELND_PROJECT_DETAILS.md)

## Environment Variables

See [`.env.example`](.env.example) for all required environment variables.

## License

Proprietary — All rights reserved.
