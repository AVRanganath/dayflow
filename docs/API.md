# Dayflow HRMS API Documentation

## Overview

Welcome to the Dayflow HRMS API documentation. This API provides functionality for the Dayflow Human Resource Management System, including authentication, employee management, attendance tracking, leave management, and payroll.

### Base URL
All API requests should be prefixed with the following base URL:
```
/api/v1
```

### Authentication
The API uses JSON Web Tokens (JWT) for authentication. Include the access token in the `Authorization` header of your requests.
```http
Authorization: Bearer <access_token>
```

### Response Formats

**Success Response Format**
```typescript
{
  success: true,
  data: any,
  meta?: {
    nextCursor?: string | null,
    total?: number,
    limit?: number
  } // Included for paginated endpoints
}
```

**Error Response Format**
```typescript
{
  success: false,
  error: {
    code: string, // e.g., 'UNAUTHORIZED', 'VALIDATION_ERROR'
    message: string,
    details?: any // e.g., array of field validation errors
  }
}
```

### Pagination
List endpoints use cursor-based pagination. You will receive a `nextCursor` in the `meta` object of a successful response. Pass this cursor in the query parameters of the next request (`?cursor=<nextCursor>`).

### Rate Limiting
Rate limit information is included in the following response headers:
- `X-RateLimit-Limit`: Maximum requests allowed per window
- `X-RateLimit-Remaining`: Requests remaining in the current window
- `X-RateLimit-Reset`: Time when the rate limit window resets

---

## 1. Authentication

### Signup (Company / Admin Onboarding)
- **Method & Path:** `POST /api/v1/auth/signup`
- **Description:** Company/admin onboarding **only**. Creates the first `ADMIN` user **and** the `Company` (see §6) in one transaction. Regular employees do **not** self-register — they are created by Admin/HR via `POST /api/v1/employees` (see §2).
- **Auth Required:** None — but allowed **only while no `ADMIN` exists** (bootstrap). Once an `ADMIN` exists, this endpoint is closed.
- **Request Body:**
  ```typescript
  {
    companyName: string, // z.string().min(2)
    adminEmail: string, // z.string().email()
    password: string, // z.string().min(8)
    firstName: string, // z.string().min(2)
    lastName: string // z.string().min(2)
  }
  ```
- **Success Response (201 Created):** `accessToken` is returned in the body; the
  refresh token is set as an HttpOnly `dayflow_rt` cookie (ADR-007), **not** in the body.
  ```json
  {
    "success": true,
    "data": {
      "company": { "id": "uuid", "name": "Odoo India", "loginIdPrefix": "OI" },
      "user": { "id": "uuid", "email": "admin@dayflow.com", "role": "ADMIN", "loginId": "OISUAD20260001", "mustChangePassword": false },
      "accessToken": "ey..."
    }
  }
  ```
  > Sets `Set-Cookie: dayflow_rt=<refresh JWT>; HttpOnly; SameSite=Strict; Path=/api/v1/auth` (Secure in production).
- **Error Response (403 Forbidden):**
  ```json
  {
    "success": false,
    "error": { "code": "REGISTRATION_CLOSED", "message": "An admin already exists. Public registration is closed." }
  }
  ```

### Signin
- **Method & Path:** `POST /api/v1/auth/signin`
- **Description:** Authenticate a user and receive tokens. Accepts **email or Login ID** as the identifier.
- **Auth Required:** None
- **Request Body:**
  ```typescript
  {
    identifier: string, // email OR loginId (e.g. "jane@dayflow.com" or "OIJODO20220001")
    password: string // z.string()
  }
  ```
- **Success Response (200 OK):** `accessToken` in the body; the refresh token is set
  as the HttpOnly `dayflow_rt` cookie (ADR-007), not in the body. `mustChangePassword`
  is included so the client can force a first-login password change.
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": "uuid", "email": "employee@dayflow.com", "loginId": "OIJODO20220001", "role": "EMPLOYEE", "mustChangePassword": true },
      "accessToken": "ey..."
    }
  }
  ```
- **Error Response (401 Unauthorized):**
  ```json
  {
    "success": false,
    "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid credentials" }
  }
  ```

### Change Password
- **Method & Path:** `POST /api/v1/auth/change-password`
- **Description:** Change the current user's password. Used after first login to replace the system-generated temporary password; clears the `mustChangePassword` flag.
- **Auth Required:** Any authenticated role
- **Request Body:**
  ```typescript
  {
    currentPassword: string, // z.string()
    newPassword: string // z.string().min(8)
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { "message": "Password changed successfully", "mustChangePassword": false }
  }
  ```

### Refresh Token
- **Method & Path:** `POST /api/v1/auth/refresh`
- **Description:** Get a new access token by rotating the refresh token. The refresh
  token is read from the HttpOnly `dayflow_rt` cookie (ADR-007) — **no request body**.
  The presented token is rotated (the old one is blacklisted) and a new `dayflow_rt`
  cookie is set.
- **Auth Required:** None (a valid, non-blacklisted refresh cookie is required)
- **Request Body:** None (cookie-based).
- **Success Response (200 OK):** `accessToken` in the body; a fresh `dayflow_rt` cookie
  is set via `Set-Cookie`.
  ```json
  {
    "success": true,
    "data": { "accessToken": "ey..." }
  }
  ```

### Logout
- **Method & Path:** `POST /api/v1/auth/logout`
- **Description:** Clears the `dayflow_rt` cookie and blacklists the refresh token in
  Redis until its natural expiry (ADR-007). The refresh token is read from the cookie —
  **no request body**.
- **Auth Required:** None (cookie-based).
- **Request Body:** None (cookie-based).
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { "message": "Logged out successfully" }
  }
  ```

### Verify Email
- **Method & Path:** `GET /api/v1/auth/verify-email/:token`
- **Description:** Verify user's email address using a token sent to their inbox.
- **Auth Required:** None
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { "message": "Email verified successfully" }
  }
  ```

### Forgot Password
- **Method & Path:** `POST /api/v1/auth/forgot-password`
- **Description:** Request a password reset link.
- **Auth Required:** None
- **Request Body:**
  ```typescript
  {
    email: string // z.string().email()
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { "message": "Password reset link sent if email exists" }
  }
  ```

### Reset Password
- **Method & Path:** `POST /api/v1/auth/reset-password`
- **Description:** Reset password using a valid reset token.
- **Auth Required:** None
- **Request Body:**
  ```typescript
  {
    token: string, // z.string()
    newPassword: string // z.string().min(8)
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { "message": "Password reset successfully" }
  }
  ```

---

## 2. Employees

### Create Employee
- **Method & Path:** `POST /api/v1/employees`
- **Description:** Create a new employee (or HR) account. The server **auto-generates** the `loginId` (format `OIJODO20220001`, see below) and a **temporary password**, which is returned once to the creator and/or emailed via the notifier. The user must change it on first login (`mustChangePassword=true`). Regular employees cannot self-register — this is the only creation path.
- **Auth Required:** Admin/HR
- **Login ID format:** `OI` + first two letters of first name + first two letters of last name (uppercased) + 4-digit year of joining + 4-digit zero-padded serial for that year. Example `OIJODO20220001` = `OI` (company prefix) + `JODO` (John Doe) + `2022` (join year) + `0001` (first joiner that year). The prefix comes from the Company (`loginIdPrefix`, default `OI`; see §6).
- **Request Body:**
  ```typescript
  {
    firstName: string, // z.string().min(2)
    lastName: string, // z.string().min(2)
    email: string, // z.string().email()
    departmentId: string, // z.string().uuid()
    designation: string, // z.string()
    dateOfJoining: string, // z.string().datetime()
    employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN",
    role?: "EMPLOYEE" | "HR", // z.enum([...]).default('EMPLOYEE')
    managerId?: string // z.string().uuid() - reporting manager (Employee)
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@dayflow.com",
      "loginId": "OIJODO20220001",
      "role": "EMPLOYEE",
      "temporaryPassword": "Xy7$kPmq",
      "mustChangePassword": true
    }
  }
  ```
  > `temporaryPassword` is returned **once** at creation time only; it is never returned by any other endpoint.

### Get All Employees
- **Method & Path:** `GET /api/v1/employees`
- **Description:** Retrieve a paginated list of employees with optional search and filtering.
- **Auth Required:** Admin
- **Query Params:**
  - `cursor` (optional): For pagination
  - `limit` (optional): Number of records (default 20)
  - `search` (optional): Search by name or email
  - `departmentId` (optional): Filter by department
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      { "id": "uuid1", "firstName": "John", "lastName": "Doe", "email": "john@dayflow.com", "loginId": "OIJODO20220001", "departmentId": "uuid2", "designation": "Engineer", "workStatus": "PRESENT" }
    ],
    "meta": { "nextCursor": "cursor_string", "limit": 20 }
  }
  ```
  > `workStatus` (`PRESENT` | `ABSENT` | `ON_LEAVE`) is computed server-side from today's `Attendance` + approved `LeaveRequest` (not stored): `PRESENT` = checked in, `ABSENT` = not checked in and no approved leave, `ON_LEAVE` = on approved leave today.

### Get Current User Profile
- **Method & Path:** `GET /api/v1/employees/me`
- **Description:** Retrieve the profile of the currently authenticated user.
- **Auth Required:** Any authenticated role
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@dayflow.com",
      "loginId": "OIJASM20230001",
      "role": "EMPLOYEE",
      "departmentId": "uuid2",
      "designation": "Engineer",
      "managerId": "uuid-manager",
      "employeeCode": "EMP-0007",
      "dateOfJoining": "2023-01-15T00:00:00Z",
      "employmentType": "FULL_TIME",
      "workStatus": "PRESENT",
      "workingDaysPerWeek": 5,
      "personalEmail": "jane.personal@gmail.com",
      "phone": "+91 98765 43210",
      "address": "42 MG Road, Bengaluru",
      "dateOfBirth": "1995-06-20T00:00:00Z",
      "gender": "FEMALE",
      "maritalStatus": "SINGLE",
      "nationality": "Indian",
      "panNumber": "ABCDE1234F",
      "uanNumber": "100234567890",
      "bankAccountNumber": "****1234",
      "bankName": "HDFC Bank",
      "bankIfsc": "HDFC0001234",
      "resume": {
        "about": "...",
        "whatILove": "...",
        "hobbies": "...",
        "skills": ["TypeScript", "React"],
        "certifications": "..."
      }
    }
  }
  ```
  > `workStatus` is computed (see Get All Employees). `joinDate` is superseded by `dateOfJoining`.

### Get Employee by ID
- **Method & Path:** `GET /api/v1/employees/:id`
- **Description:** Retrieve details of a specific employee.
- **Auth Required:** Admin
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { "id": "uuid", "firstName": "John", "email": "john@dayflow.com" }
  }
  ```

### Update My Profile
- **Method & Path:** `PUT /api/v1/employees/me`
- **Description:** Update the current user's own profile. Limited to the **self-editable** subset — contact and Resume-tab fields. Employment/identity fields (department, designation, role, `loginId`, salary, PAN/UAN, etc.) are Admin-only.
- **Auth Required:** Any authenticated role
- **Request Body:**
  ```typescript
  {
    phone?: string,
    address?: string,
    personalEmail?: string, // z.string().email()
    // Resume tab
    about?: string,
    whatILove?: string,
    hobbies?: string,
    skills?: string[],
    certifications?: string
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { "id": "uuid", "phone": "+91 98765 43210", "personalEmail": "jane.personal@gmail.com" }
  }
  ```
  > Profile picture is updated separately via `PATCH /employees/:id/profile-picture`.

### Update Employee
- **Method & Path:** `PUT /api/v1/employees/:id`
- **Description:** Update employee details (Admin/HR). Admins may edit **all** fields, including employment/identity fields that are not self-editable.
- **Auth Required:** Admin
- **Request Body:**
  ```typescript
  {
    firstName?: string,
    lastName?: string,
    email?: string,
    departmentId?: string,
    designation?: string,
    managerId?: string, // reporting manager (Employee)
    employmentType?: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN",
    employeeCode?: string,
    dateOfJoining?: string, // z.string().datetime()
    workingDaysPerWeek?: number, // z.number().int().min(1).max(7)
    // Contact
    phone?: string,
    address?: string,
    personalEmail?: string,
    dateOfBirth?: string,
    gender?: "MALE" | "FEMALE" | "OTHER",
    // Private info
    maritalStatus?: "SINGLE" | "MARRIED" | "OTHER",
    nationality?: string,
    panNumber?: string,
    uanNumber?: string,
    // Bank details
    bankAccountNumber?: string,
    bankName?: string,
    bankIfsc?: string,
    // Resume tab
    about?: string,
    whatILove?: string,
    hobbies?: string,
    skills?: string[],
    certifications?: string
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { "id": "uuid", "firstName": "Updated Name", "departmentId": "uuid3", "managerId": "uuid-manager" }
  }
  ```

### Update Profile Picture
- **Method & Path:** `PATCH /api/v1/employees/:id/profile-picture`
- **Description:** Upload/update profile picture. Multipart/form-data.
- **Auth Required:** Admin (or Self if :id matches current user)
- **Request Body:** `multipart/form-data` with `file` field.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { "profilePictureUrl": "https://storage.provider.com/images/..." }
  }
  ```

---

## 3. Attendance

### Check In
- **Method & Path:** `POST /api/v1/attendance/check-in`
- **Description:** Record start time for the day.
- **Auth Required:** Employee
- **Request Body:**
  ```typescript
  {
    location: string, // z.string()
    ipAddress: string // z.string().ip() - Usually inferred from request
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": { "id": "uuid", "checkInTime": "2023-10-25T09:05:00Z", "status": "PRESENT" }
  }
  ```

### Check Out
- **Method & Path:** `POST /api/v1/attendance/check-out`
- **Description:** Record end time for the day. Optionally report break time, which is subtracted from worked hours.
- **Auth Required:** Employee
- **Request Body:**
  ```typescript
  {
    breakMinutes?: number // z.number().int().nonnegative().default(0)
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid",
      "checkOutTime": "2023-10-25T17:30:00Z",
      "breakMinutes": 45,
      "hoursWorked": 7.65,
      "extraHours": 0
    }
  }
  ```
  > `hoursWorked` = worked − breaks; `extraHours` = hours beyond the standard workday (derived from `workingDaysPerWeek` / company settings).

### Get My Attendance
- **Method & Path:** `GET /api/v1/attendance/me`
- **Description:** View personal attendance records. **Default listing is day-wise for the current month.**
- **Auth Required:** Employee
- **Query Params:**
  - `range`: `daily` | `weekly` | `monthly` (default `monthly` — current month, day-wise)
  - `cursor`: optional
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      { "date": "2023-10-25", "checkInTime": "09:05:00Z", "checkOutTime": "17:30:00Z", "breakMinutes": 45, "hoursWorked": 7.65, "extraHours": 0, "status": "PRESENT" }
    ],
    "meta": { "nextCursor": "cursor_string" }
  }
  ```
  > Attendance records report `breakMinutes`, `hoursWorked`, and `extraHours` alongside `status`.

### Get All Attendance
- **Method & Path:** `GET /api/v1/attendance`
- **Description:** Admin view of all employee attendance.
- **Auth Required:** Admin
- **Query Params:** `date`, `departmentId`, `status`, `cursor`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      { "employeeId": "uuid", "date": "2023-10-25", "status": "PRESENT", "employee": { "name": "John Doe" } }
    ],
    "meta": { "nextCursor": "cursor_string" }
  }
  ```

### Attendance Summary
- **Method & Path:** `GET /api/v1/attendance/summary`
- **Description:** High-level attendance stats for the dashboard.
- **Auth Required:** Admin
- **Query Params:** `date` (defaults to today)
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { "totalEmployees": 150, "present": 135, "absent": 5, "onLeave": 10 }
  }
  ```

---

## 4. Leave

### Apply for Leave
- **Method & Path:** `POST /api/v1/leaves`
- **Description:** Submit a new leave request. May optionally carry an attachment (e.g. a sick-leave certificate) — either as multipart upload or as a pre-uploaded file URL (`attachmentUrl`).
- **Auth Required:** Employee
- **Request Body:**
  ```typescript
  {
    type: "PAID" | "SICK" | "CASUAL" | "UNPAID" | "MATERNITY" | "PATERNITY", // z.enum([...])
    startDate: string, // z.string().datetime()
    endDate: string, // z.string().datetime()
    reason: string, // z.string().min(10)
    attachmentUrl?: string // z.string().url() - e.g. sick-leave certificate
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": { "id": "uuid", "status": "PENDING", "type": "SICK", "days": 2, "attachmentUrl": "https://storage.provider.com/certs/..." }
  }
  ```

### Allocate Leave Balance
- **Method & Path:** `POST /api/v1/leaves/allocations`
- **Description:** Allocate a leave balance to an employee for a given year (the "Allocation" flow — e.g. Paid 24 days, Sick 7 days). Writes/updates the `LeaveBalance` row.
- **Auth Required:** Admin/HR
- **Request Body:**
  ```typescript
  {
    employeeId: string, // z.string().uuid()
    leaveType: "PAID" | "SICK" | "CASUAL" | "UNPAID" | "MATERNITY" | "PATERNITY",
    year: number, // z.number().int()
    totalAllowed: number // z.number().nonnegative()
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": { "id": "uuid", "employeeId": "uuid2", "leaveType": "PAID", "year": 2026, "totalAllowed": 24, "used": 0, "remaining": 24 }
  }
  ```

### Get My Leaves
- **Method & Path:** `GET /api/v1/leaves/me`
- **Description:** View personal leave history.
- **Auth Required:** Employee
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      { "id": "uuid", "type": "SICK", "startDate": "2023-11-01T00:00:00Z", "status": "APPROVED" }
    ],
    "meta": { "nextCursor": null }
  }
  ```

### Get All Leave Requests
- **Method & Path:** `GET /api/v1/leaves`
- **Description:** Admin view of all leave requests.
- **Auth Required:** Admin
- **Query Params:** `status` (PENDING, APPROVED, REJECTED), `cursor`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
       { "id": "uuid", "employeeId": "uuid2", "status": "PENDING", "employee": { "name": "Jane Smith" } }
    ]
  }
  ```

### Approve Leave
- **Method & Path:** `PATCH /api/v1/leaves/:id/approve`
- **Description:** Approve a pending leave request.
- **Auth Required:** Admin
- **Request Body:** None (or optional `notes`)
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { "id": "uuid", "status": "APPROVED" }
  }
  ```

### Reject Leave
- **Method & Path:** `PATCH /api/v1/leaves/:id/reject`
- **Description:** Reject a pending leave request.
- **Auth Required:** Admin
- **Request Body:**
  ```typescript
  {
    reason: string // z.string().min(5)
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { "id": "uuid", "status": "REJECTED", "rejectionReason": "Insufficient coverage" }
  }
  ```

### Get Leave Balance
- **Method & Path:** `GET /api/v1/leaves/balance/me`
- **Description:** View available leave balance by type.
- **Auth Required:** Employee
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "PAID": { "allocated": 24, "used": 2, "remaining": 22 },
      "SICK": { "allocated": 7, "used": 2, "remaining": 5 },
      "CASUAL": { "allocated": 12, "used": 5, "remaining": 7 }
    }
  }
  ```
  > Balances are tracked for `PAID`, `SICK`, and `CASUAL`. `UNPAID` is unlimited (no balance check). "Annual" ≡ `PAID`.

---

## 5. Payroll

> **Salary model (component-based, INR).** A per-employee salary structure is derived
> from a monthly **wage**. Earning components auto-compute from the wage and update when
> it changes; the total of all earning components equals the wage (Fixed Allowance is
> the balancer). Defaults:
>
> | Component | Rule (default) | Example @ ₹50,000 |
> |-----------|----------------|-------------------|
> | Basic Salary | 50% of wage | ₹25,000 |
> | House Rent Allowance (HRA) | 50% of Basic | ₹12,500 |
> | Standard Allowance | fixed / configured | ₹4,167 |
> | Performance Bonus | 8.33% of Basic | ₹2,082.50 |
> | Leave Travel Allowance (LTA) | 8.33% of Basic | ₹2,082.50 |
> | Fixed Allowance | wage − sum(all above) (balancer) | remainder |
>
> **Deductions:** Provident Fund (PF) — employee 12% of Basic (deducted from take-home)
> and employer 12% of Basic (CTC only, not deducted); Professional Tax — fixed ₹200/month.
> Gross = sum(earning components) = wage. Monthly net = Gross − employee PF −
> Professional Tax. Rates and component %s are configurable per Company settings (see §6).

### Get My Payroll
- **Method & Path:** `GET /api/v1/payroll/me`
- **Description:** View personal salary breakdown and payslip history.
- **Auth Required:** Employee
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "currency": "INR",
      "monthlyWage": 50000,
      "earnings": {
        "basic": 25000,
        "hra": 12500,
        "standardAllowance": 4167,
        "performanceBonus": 2082.50,
        "lta": 2082.50,
        "fixedAllowance": 4168,
        "gross": 50000
      },
      "deductions": {
        "pfEmployee": 3000,
        "professionalTax": 200,
        "total": 3200
      },
      "employerContributions": { "pfEmployer": 3000 },
      "monthlyNet": 46800,
      "history": [
        { "month": "2026-07", "payableDays": 22, "workingDays": 23, "netSalary": 44765, "status": "PAID", "payslipUrl": "..." }
      ]
    }
  }
  ```

### Get All Payroll Records
- **Method & Path:** `GET /api/v1/payroll`
- **Description:** Admin view of company payroll.
- **Auth Required:** Admin
- **Query Params:** `month`, `year`, `cursor`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      { "employeeId": "uuid", "month": "2026-07", "payableDays": 22, "netSalary": 44765, "status": "PAID" }
    ],
    "meta": { "nextCursor": null }
  }
  ```

### Get Salary Structure
- **Method & Path:** `GET /api/v1/payroll/:employeeId/salary-structure`
- **Description:** View an employee's component-based salary structure.
- **Auth Required:** Admin (Admin-only)
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "currency": "INR",
      "monthlyWage": 50000,
      "earnings": {
        "basic": { "computationType": "PERCENTAGE", "value": 50, "amount": 25000 },
        "hra": { "computationType": "PERCENTAGE", "value": 50, "amount": 12500 },
        "standardAllowance": { "computationType": "FIXED", "value": 4167, "amount": 4167 },
        "performanceBonus": { "computationType": "PERCENTAGE", "value": 8.33, "amount": 2082.50 },
        "lta": { "computationType": "PERCENTAGE", "value": 8.33, "amount": 2082.50 },
        "fixedAllowance": { "computationType": "BALANCER", "amount": 4168 }
      },
      "deductions": {
        "pfEmployee": { "value": 12, "amount": 3000 },
        "pfEmployer": { "value": 12, "amount": 3000 },
        "professionalTax": { "amount": 200 }
      },
      "gross": 50000,
      "monthlyNet": 46800
    }
  }
  ```

### Update Salary Structure
- **Method & Path:** `PUT /api/v1/payroll/:employeeId/salary-structure`
- **Description:** Set/update an employee's salary structure. Amounts recompute from `monthlyWage` and the component rules; Fixed Allowance rebalances automatically.
- **Auth Required:** Admin (Admin-only)
- **Request Body:**
  ```typescript
  {
    monthlyWage: number, // z.number().positive() - INR
    // Optional per-employee overrides; omit to use company defaults (§6)
    components?: {
      basicPct?: number,            // default 50 (of wage)
      hraPct?: number,              // default 50 (of basic)
      standardAllowance?: number,   // fixed INR
      performanceBonusPct?: number, // default 8.33 (of basic)
      ltaPct?: number               // default 8.33 (of basic)
    },
    deductions?: {
      pfEmployeePct?: number,  // default 12 (of basic)
      pfEmployerPct?: number,  // default 12 (of basic)
      professionalTax?: number // default 200 INR
    }
  }
  ```
- **Success Response (200 OK):** Same shape as **Get Salary Structure** with recomputed amounts.

### Get Payslip
- **Method & Path:** `GET /api/v1/payroll/:id/payslip`
- **Description:** Generate/retrieve a payslip for a pay month. **Net is computed from payable days:** `payableDays = workingDaysInMonth − unpaidLeaveDays − missingAttendanceDays` (approved PAID/SICK leave still counts as payable; only `UNPAID` leave and unexcused absences reduce it). `netSalary = round(monthlyNet × payableDays / workingDaysInMonth)`.
- **Auth Required:** Employee (self) or Admin
- **Query Params:** `month`, `year`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "employeeId": "uuid",
      "month": "2026-07",
      "currency": "INR",
      "workingDays": 23,
      "unpaidLeaveDays": 1,
      "missingAttendanceDays": 0,
      "payableDays": 22,
      "earnings": { "basic": 25000, "hra": 12500, "standardAllowance": 4167, "performanceBonus": 2082.50, "lta": 2082.50, "fixedAllowance": 4168, "gross": 50000 },
      "deductions": { "pfEmployee": 3000, "professionalTax": 200, "total": 3200 },
      "monthlyNet": 46800,
      "netSalary": 44765,
      "payslipUrl": "https://storage.provider.com/payslips/..."
    }
  }
  ```

---

## 6. Company / Settings

> Single-company MVP: one seeded `Company` row. The company prefix feeds the Login ID
> (see §2). PF/tax rates and salary-component defaults live in `settings` and are read by
> payroll (§5). All amounts INR.

### Get Company
- **Method & Path:** `GET /api/v1/company`
- **Description:** Retrieve company details and settings.
- **Auth Required:** Any authenticated role
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid",
      "name": "Odoo India",
      "logoUrl": "https://storage.provider.com/logos/...",
      "loginIdPrefix": "OI",
      "settings": {
        "pfEmployeePct": 12,
        "pfEmployerPct": 12,
        "professionalTax": 200,
        "componentDefaults": {
          "basicPct": 50,
          "hraPct": 50,
          "standardAllowance": 4167,
          "performanceBonusPct": 8.33,
          "ltaPct": 8.33
        },
        "workingDaysPerWeek": 5
      }
    }
  }
  ```

### Update Company
- **Method & Path:** `PUT /api/v1/company`
- **Description:** Update company name, logo, Login ID prefix, and settings (PF/tax rates, component defaults, working days).
- **Auth Required:** Admin (Admin-only)
- **Request Body:**
  ```typescript
  {
    name?: string, // z.string().min(2)
    logoUrl?: string, // z.string().url()
    loginIdPrefix?: string, // z.string() - default "OI"
    settings?: {
      pfEmployeePct?: number,
      pfEmployerPct?: number,
      professionalTax?: number, // INR
      componentDefaults?: {
        basicPct?: number,
        hraPct?: number,
        standardAllowance?: number, // INR
        performanceBonusPct?: number,
        ltaPct?: number
      },
      workingDaysPerWeek?: number // z.number().int().min(1).max(7)
    }
  }
  ```
- **Success Response (200 OK):** Same shape as **Get Company** with updated values.
