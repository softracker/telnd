# TELND Deployment

## Environment Setup

### Development
```bash
docker compose up -d  # PostgreSQL + Redis
npm install
npm run db:migrate
npm run dev
```

### Production

#### Infrastructure
- PostgreSQL: Managed service (AWS RDS / Supabase)
- Redis: Managed service (Upstash / Redis Cloud)
- Object Storage: Cloudflare R2
- CDN: Cloudflare
- Hosting: Vercel (web) / Railway (API)

#### Deployment Steps
1. Run migrations
2. Build applications
3. Deploy API
4. Deploy web
5. Deploy workers
6. Configure CDN
7. Set up monitoring

## Scaling

### Horizontal
- Multiple API instances behind load balancer
- Worker scaling based on queue depth
- Read replicas for database

### Vertical
- Database instance upgrade
- Redis memory increase
- API server resources
