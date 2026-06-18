# BuildIMS — Student Developer Platform

A full-stack platform built for the student developer community at **IMSciences Peshawar**. Students submit projects, complete daily coding challenges, track streaks, post ideas, and compete in showdowns — all in one place.

---

## Features

| Module | Description |
|--------|-------------|
| **Project Showcase** | Submit and vote on student-built projects with cover images and tech tags |
| **Daily Challenges** | Semester-aware coding challenges with streak tracking |
| **Leaderboard** | Rankings by streaks, votes, students, programs, and Hall of Fame |
| **Idea Garage** | Post startup ideas, invite collaborators, ship or abandon within 21 days |
| **Showdowns** | Timed head-to-head competitions judged by faculty |
| **Skills Radar** | Market demand vs. student skill gap visualizer |
| **Activity Feed** | Real-time public feed of all platform activity via Socket.io |
| **Admin Panel** | Manage users, moderate projects, create challenges and showdowns |
| **Auth** | JWT access + refresh tokens, email verification, account lockout |

---

## Tech Stack

**Frontend**
- React.js + Vite
- Tailwind CSS + Framer Motion
- Lucide React icons
- Zustand (state management)
- Socket.io client

**Backend**
- Node.js + Express.js
- PostgreSQL (with materialized views)
- Redis / Memurai (caching, rate limiting, token blacklist)
- Socket.io
- SendGrid (transactional email)
- Multer + Sharp (file uploads, image processing)
- node-cron (scheduled jobs)

**ML Server**
- Python + Flask (port 5001)
- DistilGPT-2 for AI-generated challenge content

---

## Project Structure

```
BuildIMS/
├── backend/          # Node.js + Express API (port 4000)
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── jobs/         # Cron jobs (streak reset, idea expiry, etc.)
│   │   └── config/       # DB, Redis
│   └── uploads/          # User-uploaded files (gitignored)
├── frontend/         # React + Vite SPA (port 3000)
│   └── src/
│       ├── pages/
│       ├── components/
│       │   └── ui/       # Shared component library
│       ├── store/        # Zustand auth store
│       └── utils/
├── database/
│   └── migrations/   # 9 sequential SQL migrations
└── ml_server.py      # Flask ML challenge generator
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis / [Memurai](https://www.memurai.com/) (Windows)
- Python 3.9+ (for ML server)

### 1 — Clone & install

```bash
git clone https://github.com/anascs12/builtIMS.git
cd builtIMS

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2 — Environment

```bash
cp .env.example .env
# Fill in DB credentials, JWT secrets, SendGrid key, etc.
```

### 3 — Database

```bash
# Create the database
createdb buildims

# Run migrations in order
psql -d buildims -f database/migrations/001_extensions.sql
psql -d buildims -f database/migrations/002_users_auth.sql
psql -d buildims -f database/migrations/003_projects_showcase.sql
psql -d buildims -f database/migrations/004_challenges_streaks_badges.sql
psql -d buildims -f database/migrations/005_social.sql
psql -d buildims -f database/migrations/006_portfolio_view.sql
psql -d buildims -f database/migrations/007_skills_radar.sql
psql -d buildims -f database/migrations/008_idea_garage.sql
psql -d buildims -f database/migrations/009_project_cover_image.sql
```

### 4 — Run

```bash
# Start all services (Windows)
start-dev.bat

# Or manually:
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev

# Terminal 3 — ML server (optional)
python ml_server.py
```

Frontend: `http://localhost:3000`  
API: `http://localhost:4000`

---

## Roles & Permissions

| Role | Capabilities |
|------|-------------|
| `student` | Submit projects, complete challenges, post ideas, join showdowns |
| `faculty` | All student permissions + vote weight ×3 + access admin panel |
| `admin` | Full platform control — moderate, create challenges/showdowns, manage users |

---

## Cron Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| Streak reset | Daily 00:01 PKT | Reset streaks for students who missed a day |
| Idea expiry | Daily 00:05 PKT | Mark overdue active ideas as abandoned |
| Showdown status | Every 15 min | Transition upcoming → active → judging → closed |
| ML challenge gen | Weekly | Auto-generate challenge suggestions via DistilGPT-2 |
| Weekly digest | Monday 09:00 PKT | Send activity summary emails via SendGrid |

---

## Contributors

| Name | Role |
|------|------|
| [Anas Khan](https://github.com/anascs12) | Lead Developer |
| [Muneeba Saleem](https://github.com/muneebasaleem12) | Co-Lead Developer |

---

## Institution

**IMSciences — Institute of Management Sciences, Peshawar**  
BS Computer Science / Software Engineering / AI / Data Science / Cybersecurity
