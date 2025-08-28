# Hono port of ipapi

This folder contains a Hono (TypeScript) implementation that mirrors the FastAPI app:

- PostgreSQL via Prisma (User, APIKey)
- Redis-based per-key rate limiting
- API key issuance/revocation with per-key limits (admin-protected)
- Health endpoint
- IP country lookup using MaxMind GeoLite2 (same DB file as repo root)
- Optional Slack webhook logging

## Endpoints
- GET /health
- POST /v1/auth/users { email }
- POST /v1/auth/keys { user_id, name, rate_limit_per_min? } -> returns api_key
- DELETE /v1/auth/keys/:keyId
- DELETE /v1/auth/users/:userId
- DELETE /v1/auth/users?email=
- GET /v1/ip with header X-API-Key: <api_key> or query ?api=

## Setup
1) Copy `.env.example` to `.env` and edit values.
2) Install dependencies
```
npm i
```
3) Generate Prisma client
```
npm run prisma:generate
```
4) Ensure PostgreSQL and Redis are running and accessible.

## Run
- Dev: `npm run dev`
- Build: `npm run build`
- Start: `npm start`

## Environment
See `.env.example`. Notable:
- DATABASE_URL, REDIS_URL
- ADMIN_API_KEY
- ENFORCE_HTTPS_FOR_API_KEYS (true/false)
- GEOIP_DB_PATH (defaults to repo root GeoLite2-Country.mmdb)
- DEFAULT_RATE_LIMIT_PER_MIN (default 60)

## Notes
- Prisma model `APIKey` is accessed as `prisma.aPIKey` (client field uses lowerCamelCase of the model name).
- The IP detection logic prefers proxy headers: `x-forwarded-for`, `x-real-ip`, `cf-connecting-ip`, `true-client-ip`, `x-client-ip`.
