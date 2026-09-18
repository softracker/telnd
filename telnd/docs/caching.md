# TELND Caching Strategy

## Redis Usage

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

## When to Cache

✅ Cache:
- Job listings
- Company profiles
- Search results
- User sessions

❌ Don't cache:
- Application status (changes frequently)
- Real-time notifications
- Payment transactions
