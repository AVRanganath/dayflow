# 🚀 START HERE

This is the central source of truth for the Dayflow HRMS hackathon team. Read this first, follow the instructions, and start coding.

**Hackathon Constraints:** 7.5 hours, 3-4 people
**Tech Stack:** Next.js 14, Express, PostgreSQL, Prisma, Redis, JWT, Zod, Docker, TypeScript

---

## 1. Quick Start (Get Running in 5 Minutes)

Copy-paste these commands to get your local environment running immediately.

```bash
# 1. Clone and install dependencies
git clone <repo-url>
cd dayflow
npm install

# 2. Start infrastructure (PostgreSQL & Redis)
docker-compose up -d

# 3. Setup database
cd packages/db
npx prisma migrate dev
npx prisma db seed
cd ../..

# 4. Start development server (Frontend + Backend)
npm run dev
```

### Important URLs
- **Frontend App:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Health Check / Docs:** http://localhost:8000/api/v1/health

### Demo Credentials (from Seed)
- **Admin:** `admin@dayflow.com` / `Admin@123`
- **Employee:** `john@dayflow.com` / `Employee@123`

---

## 2. Project Structure

This is a monorepo setup. Everything you need is neatly organized:

```
dayflow/
├── apps/
│   ├── web/                # Next.js 14 Frontend
│   └── api/                # Express Backend
├── packages/
│   ├── db/                 # Prisma schema and migrations
│   ├── shared/             # Shared Zod schemas, types, and constants
│   └── ui/                 # Shared UI components (optional)
├── docs/                   # Detailed documentation (API, DB, Architecture)
├── docker-compose.yml      # Local infrastructure
├── plan.md                 # Master project plan
└── BUILD_CHECKLIST.md      # Hackathon task list
```

---

## 3. Your Role

Find your assignment and start working. Coordinate with your team to avoid merge conflicts.

### Person 1: Backend Auth & Core
- **Files to touch:** `apps/api/src/modules/auth/`, `apps/api/src/modules/employee/`
- **Tasks:** Implement auth routes, JWT middleware, employee CRUD operations.
- **Reference:** `docs/API.md` for exact endpoint specifications.
- **Start with:** Setting up the Express app structure and building the authentication middleware.

### Person 2: Backend Features
- **Files to touch:** `apps/api/src/modules/attendance/`, `apps/api/src/modules/leave/`, `apps/api/src/modules/payroll/`
- **Tasks:** Implement endpoints for attendance tracking, leave requests, and payroll generation.
- **Reference:** `docs/API.md` for endpoint specifications.
- **Start with:** Attendance check-in/check-out endpoints.

### Person 3: Frontend Auth & Dashboard
- **Files to touch:** `apps/web/src/app/(auth)/`, `apps/web/src/app/(dashboard)/`
- **Tasks:** Build auth pages (Login/Signup), dashboard layouts, and user profile pages.
- **Reference:** `UI/` folder for design mockups.
- **Start with:** Sign In and Sign Up pages.

### Person 4: Frontend Features & Integration
- **Files to touch:** `apps/web/src/app/(dashboard)/attendance/`, `apps/web/src/app/(dashboard)/leaves/`, `apps/web/src/app/(dashboard)/payroll/`
- **Tasks:** Build feature-specific pages, integrate API endpoints, handle state management.
- **Reference:** `UI/` folder for designs, `docs/API.md` for endpoints.
- **Start with:** Setting up the global API client (`axios` or `fetch`) and the React context for Authentication.

---

## 4. How to Build Properly

### ⚠️ Code Quality Rules (JUDGES WILL CHECK)
- **Strict TypeScript:** NO `any` types allowed. Ever.
- **Documentation:** Every function/component must have JSDoc comments explaining its purpose.
- **Validation:** Every API endpoint must validate input using Zod schemas from `packages/shared`.
- **Shared Types:** Use shared types from `packages/shared`. NEVER duplicate type definitions between backend and frontend.
- **Error Handling:** Proper try/catch blocks. Never swallow errors. Use appropriate HTTP status codes (400 for bad input, 401 for unauthorized, etc.).
- **Naming Conventions:** Kebab-case for files (`user-controller.ts`), PascalCase for React components (`UserProfile.tsx`).

### Git Workflow
- **Branch Naming:** `feature/<your-module>` (e.g., `feature/auth-backend`)
- **Commit Messages:** Use conventional commits format: `feat(auth): add signup endpoint`, `fix(ui): resolve button alignment`
- **Cadence:** Push frequently. At least every 30 minutes to avoid massive merge conflicts.
- **PRs:** Create a Pull Request to `main` with a brief description. Get at least one review if possible.
- **Rule:** Never force push to `main`.

### When You're Stuck
- Endpoint details? ➡️ `docs/API.md`
- System design? ➡️ `docs/ARCHITECTURE.md`
- Database schema? ➡️ `docs/DATABASE.md`
- What task is next? ➡️ `BUILD_CHECKLIST.md`
- Big picture context? ➡️ `plan.md`

---

## 5. Environment Setup

Ensure you have these tools installed before starting:
- **Node.js:** v18+
- **npm:** v9+
- **Docker & Docker Compose**
- **Git**

### Environment Variables (`.env`)
Create a `.env` file in the root directory (copy from `.env.example` if it exists).

```env
# Database (Prisma)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dayflow?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# API & Auth
PORT=8000
JWT_SECRET="super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="1d"

# Web
NEXT_PUBLIC_API_URL="http://localhost:8000/api/v1"
```

---

## 6. Key Patterns to Follow

### Creating an API Endpoint (Backend)
```typescript
// apps/api/src/modules/leave/leave.controller.ts
import { Request, Response } from 'express';
import { CreateLeaveSchema } from '@dayflow/shared';
import { leaveService } from './leave.service';

/**
 * Creates a new leave request for the authenticated employee
 */
export const createLeaveRequest = async (req: Request, res: Response) => {
  try {
    // 1. Validate Input
    const validatedData = CreateLeaveSchema.parse(req.body);
    
    // 2. Call Service
    const leave = await leaveService.createLeave(req.user.id, validatedData);
    
    // 3. Return Response
    res.status(201).json({ success: true, data: leave });
  } catch (error) {
    // Error handling middleware catches this
    throw error;
  }
};
```

### Shared Zod Validation Schema
```typescript
// packages/shared/src/schemas/leave.schema.ts
import { z } from 'zod';

export const CreateLeaveSchema = z.object({
  type: z.enum(['SICK', 'VACATION', 'PERSONAL']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

export type CreateLeaveInput = z.infer<typeof CreateLeaveSchema>;
```

### Express Auth Middleware Usage
```typescript
// apps/api/src/routes.ts
import { Router } from 'express';
import { requireAuth, requireRole } from './middlewares/auth.middleware';
import { createLeaveRequest } from './modules/leave/leave.controller';

const router = Router();

// Protected route: Only authenticated users can access
router.post('/leaves', requireAuth, createLeaveRequest);

// Role-based route: Only Admins can access
router.get('/admin/payroll', requireAuth, requireRole(['ADMIN']), getPayrollReports);
```

### Next.js Data Fetching (Frontend)
```tsx
// apps/web/src/app/(dashboard)/leaves/page.tsx
import { leaveApi } from '@/lib/api/leave';

/**
 * Server Component for Leave Management
 */
export default async function LeavesPage() {
  // Fetch data directly on the server
  const leaves = await leaveApi.getMyLeaves();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Leave Requests</h1>
      <LeaveList initialData={leaves} />
    </div>
  );
}
```

---

## 7. Testing Your Work

### Testing APIs
Use cURL or Postman.
```bash
# Example: Login to get token
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@dayflow.com","password":"Employee@123"}'
```

### Database Verification
Open Prisma Studio to inspect records visually.
```bash
cd packages/db
npx prisma studio
```
This opens `http://localhost:5555` where you can view/edit the database.

### Checking Logs
Backend logs will appear in the terminal where you ran `npm run dev`. Watch them closely for validation errors or crash dumps.

---

## 8. Important Links

Keep these files open in your IDE at all times:
- [Master Plan (plan.md)](./plan.md)
- [Hackathon Task List (BUILD_CHECKLIST.md)](./BUILD_CHECKLIST.md)
- [System Architecture (docs/ARCHITECTURE.md)](./docs/ARCHITECTURE.md)
- [API Specifications (docs/API.md)](./docs/API.md)
- [Database Schema (docs/DATABASE.md)](./docs/DATABASE.md)
