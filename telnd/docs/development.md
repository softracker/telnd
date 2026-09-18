# TELND Development Guide

## Prerequisites

- Node.js 20+
- npm 10+
- Flutter 3.2+
- Docker Desktop
- PostgreSQL 16 (or use Docker)

## Quick Start

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

## Development Commands

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

## Flutter Development

```bash
cd apps/mobile
flutter pub get
flutter run
```

## Code Style

- TypeScript strict mode
- ESLint + Prettier
- Conventional commits
- Small, focused modules
