# Dayflow - Build Checklist

This checklist organizes the development process for the 7.5-hour hackathon. Tick these off as you complete them.

## Phase 0: Setup (Hour 0-1)
- [ ] Initialize monorepo with npm workspaces (or Turborepo)
- [ ] Setup TypeScript configs (base, web, api)
- [ ] Setup ESLint + Prettier
- [ ] Create `docker-compose.yml` (PostgreSQL, Redis)
- [ ] Setup Prisma schema in `packages/db` and run migrations
- [ ] Seed database with demo data (Admin user, basic roles, departments)
- [ ] Setup `packages/shared` package (types, Zod validators, constants)
- [ ] Setup Express boilerplate with basic middleware (cors, helmet, express.json)
- [ ] Setup Next.js with Tailwind CSS
- [ ] Create `.env.example` files for both web and api

## Phase 1: Core Backend (Hour 1-3)
- [ ] Auth module (signup, signin, refresh token, logout)
- [ ] Auth middleware (JWT verification, role/permission guard)
- [ ] Employee CRUD endpoints
- [ ] Attendance endpoints (check-in, check-out, view history)
- [ ] Leave management endpoints (request leave, approve/reject, balance)
- [ ] Payroll endpoints (generate payslip, view history)
- [ ] Input validation with Zod on all endpoints
- [ ] Error handling middleware (catch-all and custom AppError)
- [ ] Request logging middleware (e.g., morgan)
- [ ] Rate limiting (Redis-based, for auth routes)

## Phase 2: Core Frontend (Hour 1-3)
- [ ] Auth pages (Sign Up, Sign In)
- [ ] Layout component (sidebar navigation, top header)
- [ ] Employee Dashboard (quick stats, recent activity)
- [ ] Admin Dashboard (system overview, pending approvals)
- [ ] Profile view/edit pages
- [ ] Auth context/store (React Context or Zustand)
- [ ] API client setup (Axios or Fetch wrapper with interceptors for auth tokens)

## Phase 3: Integration (Hour 3-5)
- [ ] Connect auth flow end-to-end (login, store token, redirect)
- [ ] Employee profile CRUD integration
- [ ] Attendance check-in/out flow integration
- [ ] Attendance calendar/table views integration
- [ ] Leave request flow integration
- [ ] Leave approval flow (admin view) integration
- [ ] Payroll view integration
- [ ] Admin employee management (list, add, deactivate) integration

## Phase 4: Polish (Hour 5-6.5)
- [ ] Loading states and skeletons (Suspense boundaries)
- [ ] Error boundaries and fallback UI
- [ ] Toast notifications for success/error actions (e.g., react-hot-toast)
- [ ] Form validation (client-side using react-hook-form + Zod)
- [ ] Responsive design check (mobile/tablet views)
- [ ] Empty states for tables and lists
- [ ] Pagination on large datasets (attendance, employees)

## Phase 5: Production Quality (Hour 6.5-7.5)
- [ ] Health check endpoint (`/health` or `/ping`)
- [ ] Graceful shutdown handling in Express
- [ ] Dockerfile for API (multi-stage build)
- [ ] Dockerfile for Web (standalone output)
- [ ] README.md update (how to run, architecture overview)
- [ ] Environment variable validation on startup (Zod schema for envs)
- [ ] Final testing pass (happy paths and common edge cases)
- [ ] Demo data seeded and ready for presentation

## Bonus (If time permits)
- [ ] Email notifications (SendGrid/Nodemailer for leave approvals)
- [ ] Analytics dashboard charts (e.g., Chart.js or Recharts)
- [ ] Audit logging (track who changed what)
- [ ] Export to PDF (generate salary slips)
