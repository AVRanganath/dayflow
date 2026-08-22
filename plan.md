# Dayflow HRMS - Master Plan

## 1. Project Overview
Dayflow is a modern, scalable Human Resource Management System (HRMS) designed for small to medium enterprises. It streamlines core HR processes including employee management, attendance tracking, leave requests, and payroll processing. The goal for this hackathon is to deliver a production-ready MVP that prioritizes **scalability** and **production-level code quality**.

## 2. Tech Stack
- **Frontend:** Next.js 14 (App Router, TypeScript, Tailwind CSS) - chosen for performance, SEO, and developer experience.
- **Backend:** Node.js + Express (TypeScript) - lightweight, fast, and scalable.
- **Database:** PostgreSQL + Prisma ORM - reliable relational DB with type-safe database access.
- **Cache:** Redis - for session management, rate limiting, and caching frequently accessed data.
- **Auth:** JWT (access + refresh tokens) + bcrypt - stateless authentication suitable for microservices and scalable architectures.
- **Validation:** Zod - schema validation for both frontend forms and backend API requests.
- **Containerization:** Docker + Docker Compose - ensures consistent environments from development to production.
- **Monorepo:** npm workspaces (or Turborepo) - enables seamless code sharing between frontend and backend.

## 3. Project Structure
We are using a monorepo approach to share code (types, validators, constants) between the client and server.

```text
dayflow/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Express backend
├── packages/
│   ├── shared/       # Shared types, validators, constants
│   └── db/           # Prisma schema and generated client
├── docs/             # Documentation
├── UI/               # UI mockups (HTML from design tools)
├── docker-compose.yml
├── turbo.json
└── package.json
```

## 4. Team Allocation (7.5 hours, 3-4 people)
### Roles
- **Person 1 (Backend):** Auth & Employee modules, middleware, error handling, DB design.
- **Person 2 (Backend):** Attendance, Leave, Payroll modules, Redis caching.
- **Person 3 (Frontend):** Auth pages, Layouts, Dashboard, Profile pages.
- **Person 4 (Frontend):** Attendance, Leave, Payroll pages + API Integration.

### Timeline Breakdown
- **Hour 0-1:** Setup (everyone), DB schema, project scaffolding, Docker environments.
- **Hour 1-3:** Core module development (parallel API and UI development).
- **Hour 3-5:** Integration, API connections, global state management.
- **Hour 5-6.5:** Polish, edge cases, error states, and basic unit testing.
- **Hour 6.5-7.5:** Final testing, documentation (README, architecture), deployment prep, demo rehearsal.

## 5. Architecture Summary
The system follows a standard three-tier architecture (Client -> API -> Database). For a detailed breakdown of the microservices-ready design, caching strategies, and database schemas, please refer to `docs/ARCHITECTURE.md`.

## 6. Coding Standards
- **Linter/Formatter:** ESLint + Prettier on pre-commit hook (Husky).
- **Naming Conventions:** camelCase for variables/functions, PascalCase for classes/components, UPPER_SNAKE_CASE for constants.
- **Git Commit Messages:** Conventional Commits (e.g., `feat: add user login`, `fix: resolve token expiration bug`).
- **PR Guidelines:** Keep PRs small and focused on a single module. Require at least 1 approval before merging.
- **Error Handling:** Use custom `AppError` class extending `Error`. Global error handling middleware in Express. No raw errors exposed to the client.

## 7. Key Design Decisions (For Judges)
- **Monorepo:** Selected to enforce dry principles (DRY) using a `shared` package for Zod schemas, meaning validation logic is written once and used everywhere.
- **PostgreSQL + Prisma:** Guarantees data integrity and provides excellent type safety from DB to the API layer.
- **Refresh Token Rotation:** Enhances security by limiting the lifespan of access tokens while maintaining a good UX.
- **Docker Compose Setup:** Demonstrates a focus on developer experience and production readiness.

## 8. Environment Variables
*A unified `.env` will be split per app, but here is the master list:*

### Backend (`apps/api/.env`)
- `PORT` - API port (default: 4000)
- `NODE_ENV` - `development` or `production`
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_ACCESS_SECRET` - Secret for access tokens
- `JWT_REFRESH_SECRET` - Secret for refresh tokens
- `JWT_ACCESS_EXPIRATION` - e.g., `15m`
- `JWT_REFRESH_EXPIRATION` - e.g., `7d`

### Frontend (`apps/web/.env.local`)
- `NEXT_PUBLIC_API_URL` - URL of the backend API

## 9. Git Workflow
- **Branching Strategy:** Feature branching. Format: `feature/<module-name>`, `fix/<issue-name>`, `chore/<task>`.
- **Commits:** Commit often with descriptive messages.
- **Merging:** PRs to `main`. **No force pushes to `main`.**
