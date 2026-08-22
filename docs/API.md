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

### Signup
- **Method & Path:** `POST /api/v1/auth/signup`
- **Description:** Register a new user account. Typically used for initial admin setup.
- **Auth Required:** None (or Admin, depending on setup)
- **Request Body:**
  ```typescript
  {
    email: string, // z.string().email()
    password: string, // z.string().min(8)
    firstName: string, // z.string().min(2)
    lastName: string // z.string().min(2)
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": "uuid", "email": "admin@dayflow.com", "role": "ADMIN" },
      "accessToken": "ey...",
      "refreshToken": "ey..."
    }
  }
  ```

### Signin
- **Method & Path:** `POST /api/v1/auth/signin`
- **Description:** Authenticate a user and receive tokens.
- **Auth Required:** None
- **Request Body:**
  ```typescript
  {
    email: string, // z.string().email()
    password: string // z.string()
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": "uuid", "email": "employee@dayflow.com", "role": "EMPLOYEE" },
      "accessToken": "ey...",
      "refreshToken": "ey..."
    }
  }
  ```
- **Error Response (401 Unauthorized):**
  ```json
  {
    "success": false,
    "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid email or password" }
  }
  ```

### Refresh Token
- **Method & Path:** `POST /api/v1/auth/refresh`
- **Description:** Get a new access token using a refresh token.
- **Auth Required:** None
- **Request Body:**
  ```typescript
  {
    refreshToken: string // z.string()
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { "accessToken": "ey...", "refreshToken": "ey..." }
  }
  ```

### Logout
- **Method & Path:** `POST /api/v1/auth/logout`
- **Description:** Invalidate the current refresh token.
- **Auth Required:** Any authenticated role
- **Request Body:**
  ```typescript
  {
    refreshToken: string // z.string()
  }
  ```
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
      { "id": "uuid1", "firstName": "John", "lastName": "Doe", "email": "john@dayflow.com", "departmentId": "uuid2" }
    ],
    "meta": { "nextCursor": "cursor_string", "limit": 20 }
  }
  ```

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
      "role": "EMPLOYEE",
      "departmentId": "uuid2",
      "joinDate": "2023-01-15T00:00:00Z"
    }
  }
  ```

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

### Update Employee
- **Method & Path:** `PUT /api/v1/employees/:id`
- **Description:** Update employee details (Admin only).
- **Auth Required:** Admin
- **Request Body:**
  ```typescript
  {
    firstName?: string,
    lastName?: string,
    departmentId?: string,
    designation?: string
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { "id": "uuid", "firstName": "Updated Name", "departmentId": "uuid3" }
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
- **Description:** Record end time for the day.
- **Auth Required:** Employee
- **Request Body:** None
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { "id": "uuid", "checkOutTime": "2023-10-25T17:30:00Z", "totalHours": 8.4 }
  }
  ```

### Get My Attendance
- **Method & Path:** `GET /api/v1/attendance/me`
- **Description:** View personal attendance records.
- **Auth Required:** Employee
- **Query Params:**
  - `range`: `daily` | `weekly` | `monthly`
  - `cursor`: optional
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      { "date": "2023-10-25", "checkInTime": "09:05:00Z", "checkOutTime": "17:30:00Z", "status": "PRESENT" }
    ],
    "meta": { "nextCursor": "cursor_string" }
  }
  ```

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
- **Description:** Submit a new leave request.
- **Auth Required:** Employee
- **Request Body:**
  ```typescript
  {
    type: "SICK" | "CASUAL" | "ANNUAL", // z.enum([...])
    startDate: string, // z.string().datetime()
    endDate: string, // z.string().datetime()
    reason: string // z.string().min(10)
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": { "id": "uuid", "status": "PENDING", "type": "SICK", "days": 2 }
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
      "SICK": { "allocated": 10, "used": 2, "remaining": 8 },
      "CASUAL": { "allocated": 12, "used": 5, "remaining": 7 },
      "ANNUAL": { "allocated": 15, "used": 0, "remaining": 15 }
    }
  }
  ```

---

## 5. Payroll

### Get My Payroll
- **Method & Path:** `GET /api/v1/payroll/me`
- **Description:** View personal salary details and history.
- **Auth Required:** Employee
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "currentSalary": { "base": 5000, "allowances": 1000, "currency": "USD" },
      "history": [
        { "month": "2023-09", "netPay": 5500, "status": "PAID", "payslipUrl": "..." }
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
      { "employeeId": "uuid", "netPay": 5500, "status": "PAID" }
    ]
  }
  ```

### Get Employee Payroll
- **Method & Path:** `GET /api/v1/payroll/:employeeId`
- **Description:** View specific employee's salary structure.
- **Auth Required:** Admin
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "base": 5000,
      "allowances": 1000,
      "deductions": 500,
      "bankDetails": { "accountNumber": "****1234", "bankName": "Chase" }
    }
  }
  ```

### Update Employee Payroll
- **Method & Path:** `PUT /api/v1/payroll/:employeeId`
- **Description:** Update specific employee's salary structure.
- **Auth Required:** Admin
- **Request Body:**
  ```typescript
  {
    base: number, // z.number().positive()
    allowances?: number, // z.number().nonnegative()
    deductions?: number // z.number().nonnegative()
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { "base": 6000, "allowances": 1000, "deductions": 500 }
  }
  ```
