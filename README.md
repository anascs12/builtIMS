# BuildIMS — Student Developer Platform

> "Build daily. Make it visible. Make it verifiable."

A web-based social learning platform exclusively for IT students at IMSciences, Peshawar.

---

## Prerequisites

- Docker & Docker Compose (v2.x)
- Node.js 20+ (for local development without Docker)
- Git

---

## Quick Start

```bash
# 1. Clone and enter the project
git clone <repo-url> buildims && cd buildims

# 2. Create your environment file
cp .env.example .env
# → Edit .env and fill in all required secrets

# 3. Generate JWT secrets (run each command separately)
openssl rand -base64 64   # → paste as JWT_SECRET
openssl rand -base64 64   # → paste as JWT_REFRESH_SECRET

# 4. Start all services
docker compose up --build

# Services:
#   PostgreSQL  → localhost:5432
#   Redis       → localhost:6379
#   Backend API → http://localhost:4000
#   Frontend    → http://localhost:3000
```

---

## Project Structure

```
buildims/
├── docker-compose.yml          # All services
├── .env.example                # Environment template
├── .gitignore
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── app.js              # Express + Socket.io entry point
│       ├── config/
│       │   ├── database.js     # PostgreSQL pool
│       │   └── redis.js        # Redis client + key builders
│       ├── middleware/
│       │   ├── auth.js         # JWT verification, requireAuth, requireRole
│       │   ├── rateLimit.js    # Redis-backed rate limiters
│       │   └── errorHandler.js # Global error handler + validator
│       ├── routes/
│       │   └── auth.routes.js  # /api/auth/*
│       ├── controllers/
│       │   └── auth.controller.js
│       ├── services/
│       │   ├── auth.service.js   # All auth business logic
│       │   └── email.service.js  # SendGrid email templates
│       └── utils/
│           ├── ApiError.js     # Structured error class
│           ├── jwt.js          # Sign/verify JWT tokens
│           ├── crypto.js       # Token generation & hashing
│           └── logger.js       # Winston logger
│
├── database/
│   └── migrations/             # Run in order on postgres init
│       ├── 001_extensions.sql
│       ├── 002_users_auth.sql
│       ├── 003_projects_showcase.sql
│       ├── 004_challenges_streaks_badges.sql
│       ├── 005_social.sql
│       └── 006_portfolio_view.sql
│
└── frontend/
    ├── Dockerfile
    └── package.json
```

---

## API Reference — Auth Endpoints

| Method | Endpoint                        | Auth     | Description                   |
|--------|---------------------------------|----------|-------------------------------|
| POST   | `/api/auth/register`            | Public   | Register new student          |
| GET    | `/api/auth/verify-email?token=` | Public   | Verify email address          |
| POST   | `/api/auth/resend-verification` | Public   | Resend verification email     |
| POST   | `/api/auth/login`               | Public   | Login → access + refresh token|
| POST   | `/api/auth/refresh`             | Public   | Rotate access token           |
| POST   | `/api/auth/logout`              | Bearer   | Revoke tokens                 |
| GET    | `/api/auth/me`                  | Bearer   | Get current user profile      |
| POST   | `/api/auth/forgot-password`     | Public   | Request password reset email  |
| POST   | `/api/auth/reset-password`      | Public   | Reset with token              |

### Register Request Body

```json
{
  "email":           "s20-bscs-0001@imsciences.edu.pk",
  "username":        "ali_dev",
  "password":        "SecurePass123",
  "fullName":        "Ali Hassan",
  "studentId":       "S20-BSCS-0001",
  "programId":       1,
  "currentSemester": 4,
  "careerInterestId": 1
}
```

---

## Security Notes

- All passwords hashed with bcrypt (cost 12)
- JWTs signed with separate secrets for access and refresh tokens
- Refresh tokens stored as SHA-256 hashes — raw token is never stored
- Account locked after 5 failed login attempts (15 min)
- Rate limiting: 100 req/min global, 20 req/15min on auth endpoints
- Only `@imsciences.edu.pk` emails accepted
- Refresh token rotated on every use (one-time tokens)
- Access tokens blacklisted in Redis on logout and password change

---

## Development Workflow

For each new feature, the order is:

1. Write/update migration SQL in `database/migrations/`
2. Implement service layer (`src/services/*.service.js`)
3. Implement controller (`src/controllers/*.controller.js`) with validation
4. Register route (`src/routes/*.routes.js`)
5. Build React component in `frontend/src/`

---

## Next Features to Build (Phase 1)

- [ ] `GET /api/users/:username` — Public profile page
- [ ] `POST /api/projects` — Submit project to showcase
- [ ] `GET /api/showcase/active` — Active showcase window
- [ ] `POST /api/projects/:id/vote` — Cast a vote
- [ ] `GET /api/feed` — Paginated activity feed
- [ ] `GET /api/leaderboard` — Top streaks, top projects
- [ ] `GET /api/challenges/today` — Today's challenge
- [ ] `POST /api/challenges/:id/submit` — Submit challenge answer
