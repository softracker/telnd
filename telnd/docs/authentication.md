# TELND Authentication

## Methods

1. Email + Password
2. Phone + OTP
3. Google OAuth
4. Facebook OAuth
5. LinkedIn OAuth

## Token Strategy

- Access token: JWT (7 days)
- Refresh token: Opaque (30 days)
- Session tracking in database

## Account Linking

Social accounts link to existing user accounts when:
- Email matches verified email
- User explicitly links accounts

## Security

- Password hashing with bcrypt
- Rate limiting on auth endpoints
- OTP expiration (5 minutes)
- Session invalidation on password change
