# Dayflow Database Architecture

This document provides a comprehensive overview of the Dayflow Human Resource Management System (HRMS) database schema. The database is modeled in PostgreSQL and managed using Prisma.

## Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o| Employee : "1:1"
    User ||--o{ AuditLog : "1:N"
    Department ||--o{ Employee : "1:N"
    Employee ||--o{ Attendance : "1:N"
    Employee ||--o{ LeaveRequest : "1:N"
    Employee ||--o{ LeaveBalance : "1:N"
    Employee ||--o{ PayrollRecord : "1:N"
    Employee ||--o{ LeaveRequest : "reviewer (1:N)"

    User {
        String id PK
        String email UK
        String passwordHash
        Role role
        Boolean isEmailVerified
        String emailVerificationToken
        String passwordResetToken
        DateTime passwordResetExpiry
        String refreshToken
        Boolean isActive
        DateTime createdAt
        DateTime updatedAt
    }

    Employee {
        String id PK
        String userId FK "UK"
        String employeeId UK
        String firstName
        String lastName
        String email
        String phone
        DateTime dateOfBirth
        Gender gender
        String address
        String city
        String state
        String country
        String zipCode
        String profilePicture
        String departmentId FK
        String designation
        DateTime dateOfJoining
        EmploymentType employmentType
        DateTime createdAt
        DateTime updatedAt
    }

    Department {
        String id PK
        String name UK
        String description
        DateTime createdAt
        DateTime updatedAt
    }

    Attendance {
        String id PK
        String employeeId FK
        DateTime date
        DateTime checkIn
        DateTime checkOut
        AttendanceStatus status
        Decimal hoursWorked
        String notes
        DateTime createdAt
        DateTime updatedAt
    }

    LeaveRequest {
        String id PK
        String employeeId FK
        LeaveType leaveType
        DateTime startDate
        DateTime endDate
        Decimal totalDays
        String reason
        LeaveStatus status
        String reviewedById FK
        String reviewerComment
        DateTime reviewedAt
        DateTime createdAt
        DateTime updatedAt
    }

    LeaveBalance {
        String id PK
        String employeeId FK
        LeaveType leaveType
        Int year
        Decimal totalAllowed
        Decimal used
    }

    PayrollRecord {
        String id PK
        String employeeId FK
        Int month
        Int year
        Decimal basicSalary
        Decimal hra
        Decimal conveyanceAllowance
        Decimal medicalAllowance
        Decimal specialAllowance
        Decimal providentFund
        Decimal professionalTax
        Decimal incomeTax
        Decimal grossSalary
        Decimal totalDeductions
        Decimal netSalary
        PayrollStatus status
        DateTime paidAt
        DateTime createdAt
        DateTime updatedAt
    }

    AuditLog {
        String id PK
        String userId FK
        String action
        String entity
        String entityId
        Json oldValues
        Json newValues
        String ipAddress
        String userAgent
        DateTime createdAt
    }
```

## Schema Details

### `User`
Manages system authentication and authorization.
- **Constraints**: `id` (PK), `email` (Unique).
- **Indexes**: `email` (For fast lookups during login).
- **Relationships**: 1:1 with `Employee`, 1:N with `AuditLog`.

### `Employee`
Contains all HR profile data for a user.
- **Constraints**: `id` (PK), `userId` (Unique), `employeeId` (Unique).
- **Relationships**:
  - `User`: Deletion cascades.
  - `Department`: If a department is deleted, the field is set to NULL.

### `Department`
Organizational groups for employees.
- **Constraints**: `id` (PK), `name` (Unique).

### `Attendance`
Tracks daily employee time logs.
- **Constraints**: Unique constraint on `[employeeId, date]` to prevent duplicate logs per day.
- **Indexes**: `employeeId`, `date`, `[employeeId, date]` composite index for rapid filtering and reporting.

### `LeaveRequest`
Records of leave taken by employees.
- **Indexes**: `employeeId`, `status`, `[employeeId, status]` to quickly query an employee's pending or approved leaves.
- **Relationships**: Reviewer is related via `reviewedById` pointing to another `Employee`.

### `LeaveBalance`
Yearly leave balance allocations per employee.
- **Constraints**: Unique on `[employeeId, leaveType, year]`. `remaining` balance is dynamically calculated as `totalAllowed - used`.

### `PayrollRecord`
Monthly generated payrolls for employees.
- **Constraints**: Unique on `[employeeId, month, year]` to ensure one payslip per month per employee.

### `AuditLog`
Security and auditing entity for tracking major system actions.
- **Indexes**: `userId`, `entity`, `createdAt` to allow querying activity by user, resource, or date.

## Seeding Strategy
- **Base Data**: Seed static enums or standard departments (e.g., HR, Engineering, Sales) on initialization.
- **Admin Setup**: Seed a default admin `User` and `Employee` record if the database is empty in non-production environments to allow initial login.

## Migration Strategy
- Use Prisma `migrate dev` during development.
- For production, build migrations using `prisma migrate deploy` to safely apply structured SQL changes in CI/CD.
- Take particular care when adding enums or renaming columns; favor additive changes where possible.
