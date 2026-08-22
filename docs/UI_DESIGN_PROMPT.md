# Dayflow HRMS — UI Design Prompt

> Use this prompt (or individual page sections) with Claude Design, Google Stitch, Vercel v0, or any AI UI generator to produce all HTML/CSS mockups. Place output HTML files in the `UI/` folder.

---

## Global Design System

**App Name:** Dayflow
**Tagline:** "Every workday, perfectly aligned."
**Style:** Clean, modern SaaS dashboard. Think Linear, Notion, or Rippling.
**Color Palette:**
- Primary: `#4F46E5` (Indigo 600)
- Primary Hover: `#4338CA` (Indigo 700)
- Success: `#10B981` (Emerald 500)
- Warning: `#F59E0B` (Amber 500)
- Danger: `#EF4444` (Red 500)
- Background: `#F9FAFB` (Gray 50)
- Card Background: `#FFFFFF`
- Sidebar Background: `#1E1B4B` (Indigo 950) — dark sidebar
- Text Primary: `#111827` (Gray 900)
- Text Secondary: `#6B7280` (Gray 500)
- Border: `#E5E7EB` (Gray 200)

**Typography:** Inter font family. Headings bold, body regular.
**Border Radius:** `8px` for cards, `6px` for buttons/inputs, `12px` for large containers.
**Shadows:** Subtle `shadow-sm` on cards, `shadow-md` on modals/dropdowns.
**Icons:** Lucide icons (heroicons-style).
**Framework:** Tailwind CSS classes. All pages should be responsive.

---

## Page Inventory (10 Pages Total)

| # | Page | File Name | Route | Role |
|---|------|-----------|-------|------|
| 1 | Sign Up | `signup.html` | `/signup` | Public |
| 2 | Sign In | `signin.html` | `/signin` | Public |
| 3 | Employee Dashboard | `dashboard-employee.html` | `/dashboard` | Employee |
| 4 | Admin Dashboard | `dashboard-admin.html` | `/dashboard` | Admin |
| 5 | Employee Profile (View/Edit) | `profile.html` | `/profile` | Employee |
| 6 | Employee Directory (Admin) | `employees.html` | `/employees` | Admin |
| 7 | Attendance Page | `attendance.html` | `/attendance` | Both |
| 8 | Leave Management | `leaves.html` | `/leaves` | Both |
| 9 | Leave Approvals (Admin) | `leave-approvals.html` | `/leaves/approvals` | Admin |
| 10 | Payroll / Salary | `payroll.html` | `/payroll` | Both |

---

## Page-by-Page Specifications

### PAGE 1: Sign Up (`signup.html`)

**Layout:** Centered card on a subtle gradient background (indigo-50 to white). Split layout — left side has branding/illustration, right side has the form.

**Left Side (50% width on desktop, hidden on mobile):**
- Dayflow logo (text logo: "Dayflow" in bold indigo)
- Tagline: "Every workday, perfectly aligned."
- Abstract geometric illustration or a simple SVG pattern
- Background: indigo-600 gradient

**Right Side — Sign Up Form:**
- Heading: "Create your account"
- Subtext: "Start managing your workday efficiently"
- Fields:
  - Employee ID (text input, placeholder: "EMP001")
  - Full Name (text input)
  - Work Email (email input)
  - Password (password input with show/hide toggle, strength indicator bar below)
  - Confirm Password
  - Role (dropdown/select: "Employee" or "HR / Admin")
- Primary button: "Create Account" (full width, indigo)
- Divider: "or"
- Link: "Already have an account? Sign in"
- Footer: Terms of service link

**Validation States:** Show inline error text in red below each field. Green checkmark for valid fields.

---

### PAGE 2: Sign In (`signin.html`)

**Layout:** Same split layout as Sign Up.

**Right Side — Sign In Form:**
- Heading: "Welcome back"
- Subtext: "Sign in to your Dayflow account"
- Fields:
  - Email (email input)
  - Password (password input with show/hide toggle)
- "Remember me" checkbox + "Forgot password?" link (on same row)
- Primary button: "Sign In" (full width)
- Link: "Don't have an account? Sign up"

**Error State:** Show a red alert banner above the form: "Invalid email or password. Please try again."

---

### PAGE 3: Employee Dashboard (`dashboard-employee.html`)

**Layout:** Sidebar + Main content area.

**Sidebar (dark indigo, 260px wide, collapsible):**
- Top: Dayflow logo (white text)
- Navigation items (with Lucide icons):
  - 📊 Dashboard (active state — indigo background highlight)
  - 👤 My Profile
  - 📅 Attendance
  - 🏖️ Leave Requests
  - 💰 Payroll
  - ─── divider ───
  - ⚙️ Settings
  - 🚪 Logout
- Bottom: User avatar circle + name + role badge ("Employee")

**Top Header Bar:**
- Left: "Dashboard" page title + greeting "Good morning, John! 👋"
- Right: Notification bell icon (with red dot badge), user avatar dropdown

**Main Content — 4 Quick-Access Cards (2x2 grid):**

1. **Today's Attendance** card:
   - Status badge: "Checked In" (green) or "Not Checked In" (gray)
   - Check-in time: "09:02 AM"
   - Large "Check In" or "Check Out" button
   - Hours worked today: "4h 32m"

2. **Leave Balance** card:
   - Circular progress rings or horizontal bars showing:
     - Paid Leave: 8/12 remaining
     - Sick Leave: 3/5 remaining
     - Casual Leave: 2/3 remaining
   - "Apply for Leave" button

3. **Recent Activity** card:
   - List of 4-5 recent items with timestamps:
     - "Leave request approved" — 2 hours ago
     - "Checked in at 9:02 AM" — Today
     - "Profile updated" — Yesterday
     - "Payslip generated for July" — 3 days ago

4. **This Week's Summary** card:
   - Mon–Fri mini calendar/grid:
     - Green dot = Present, Red dot = Absent, Yellow = Half-day, Blue = Leave
   - Total hours: "38h 15m"
   - Attendance rate: "96%"

**Bottom Section:**
- Quick stats row: "Total Working Days: 22 | Present: 20 | Absent: 1 | Leave: 1"

---

### PAGE 4: Admin Dashboard (`dashboard-admin.html`)

**Layout:** Same sidebar layout but with admin navigation items:
- 📊 Dashboard
- 👥 Employees
- 📅 Attendance
- 🏖️ Leave Approvals
- 💰 Payroll
- 📋 Reports (grayed out, "Coming Soon" badge)
- ─── divider ───
- ⚙️ Settings
- 🚪 Logout

**Top Header Bar:**
- "Admin Dashboard" + "Welcome, Sarah!"
- Right: Notification bell + avatar

**Main Content:**

**Row 1 — Stats Cards (4 across):**
1. Total Employees: "148" with up arrow "+3 this month" (blue icon)
2. Present Today: "132" with percentage "89%" (green icon)
3. Pending Leave Requests: "7" (orange icon, clickable)
4. Total Payroll This Month: "₹42,50,000" (purple icon)

**Row 2 — Two columns:**

Left Column (60%):
- **Recent Leave Requests** table:
  - Columns: Employee Name | Leave Type | Dates | Status | Actions
  - 5 rows with:
    - Name + avatar thumbnail
    - Leave type badge (Paid=blue, Sick=orange, Unpaid=gray)
    - Date range
    - Status badge (Pending=yellow, Approved=green, Rejected=red)
    - Approve/Reject icon buttons (for pending ones)
  - "View All" link at bottom

Right Column (40%):
- **Attendance Overview** - Donut chart / pie chart:
  - Present: 89% (green)
  - Absent: 5% (red)
  - Half-day: 3% (yellow)
  - On Leave: 3% (blue)
  - "Today, Aug 22, 2026" subtitle

**Row 3:**
- **Department-wise Headcount** horizontal bar chart
  - Engineering: 45
  - Design: 12
  - Marketing: 18
  - HR: 8
  - Finance: 10

---

### PAGE 5: Employee Profile (`profile.html`)

**Layout:** Sidebar + Main content.

**Profile Header Section:**
- Large profile picture (circle, 120px) with camera icon overlay (upload button)
- Name: "John Doe"
- Designation: "Senior Software Engineer"
- Department badge: "Engineering"
- Employee ID: "EMP001"
- "Edit Profile" button (outline style)

**Tabbed Content Below:**

**Tab 1: Personal Details**
- Two-column form grid:
  - First Name | Last Name
  - Email | Phone
  - Date of Birth | Gender (dropdown)
  - Address (full width, textarea)
  - City | State
  - Country | Zip Code
- "Save Changes" button (only for editable fields)
- Non-editable fields have a lock icon and gray background

**Tab 2: Job Details**
- Employee ID (read-only)
- Department (read-only for employee, dropdown for admin)
- Designation (read-only for employee)
- Date of Joining (read-only)
- Employment Type badge (Full-time / Part-time / Contract / Intern)
- Reporting Manager

**Tab 3: Salary Structure**
- Clean table/card showing:
  - **Earnings:** Basic Salary, HRA, Conveyance, Medical, Special Allowance
  - **Deductions:** Provident Fund, Professional Tax, Income Tax
  - **Gross Salary / Total Deductions / Net Salary** (highlighted, bold)
- All read-only for employees
- Monthly breakdown

**Tab 4: Documents** (simple)
- Upload area (drag and drop zone)
- List of uploaded documents with download/delete icons
- File types shown with icons (PDF, DOC, IMG)

---

### PAGE 6: Employee Directory — Admin (`employees.html`)

**Layout:** Sidebar + Main content.

**Top Bar:**
- "Employees" heading + employee count badge "(148)"
- Search bar (with search icon, placeholder: "Search by name, ID, or department...")
- Filter dropdowns: Department | Employment Type | Status (Active/Inactive)
- "Add Employee" primary button

**Table:**
- Columns: Employee (avatar + name + email) | ID | Department | Designation | Join Date | Status | Actions
- Each row:
  - Avatar circle + name (bold) + email (gray, smaller)
  - Employee ID
  - Department badge
  - Designation text
  - Date
  - Active (green badge) / Inactive (red badge)
  - Actions: View, Edit, three-dot menu (Deactivate)
- Pagination at bottom: "Showing 1-10 of 148" + page numbers

---

### PAGE 7: Attendance (`attendance.html`)

**Layout:** Sidebar + Main content.

**For Employee View:**

**Top Section:**
- Today's date prominently displayed
- Large Check-In / Check-Out button (green for check-in, red for check-out)
- Current status: "Checked in at 09:02 AM" or "Not checked in"
- Hours worked today progress bar

**View Toggle:** Daily | Weekly | Monthly tabs

**Calendar/Table View (Monthly - default):**
- Calendar grid for current month
- Each day cell shows:
  - Day number
  - Color-coded status dot (Green=Present, Red=Absent, Yellow=Half-day, Blue=Leave)
  - Check-in/out times in small text
- Legend at bottom: Present / Absent / Half-day / Leave

**Weekly View:**
- Table with columns: Day | Date | Check In | Check Out | Hours Worked | Status
- 7 rows for current week
- Totals row at bottom

**Summary Stats Bar:**
- Present Days: 20 | Absent: 1 | Half-days: 1 | Leaves: 1 | Total Hours: 168h

**For Admin View (additional):**
- Employee selector dropdown at top
- "All Employees" table view:
  - Columns: Employee | Today Status | Check In | Check Out | Hours | Actions
  - Export button (CSV)

---

### PAGE 8: Leave Management (`leaves.html`)

**Layout:** Sidebar + Main content.

**Top Section — Leave Balance Cards (horizontal row):**
- Paid Leave: 8/12 (progress bar, blue)
- Sick Leave: 3/5 (progress bar, orange)
- Casual Leave: 2/3 (progress bar, green)
- Unpaid Leave: "Unlimited" (gray)

**"Apply for Leave" Button** → Opens a modal/slide-over panel:
- **Apply Leave Form:**
  - Leave Type (dropdown: Paid, Sick, Casual, Unpaid)
  - Start Date (date picker)
  - End Date (date picker)
  - Total Days (auto-calculated, read-only)
  - Reason (textarea)
  - "Submit Request" button + "Cancel"

**Leave History Table:**
- Columns: Leave Type (colored badge) | From | To | Days | Reason | Status | Applied On
- Status badges: Pending (yellow), Approved (green with check), Rejected (red with X)
- Clicking a row expands to show reviewer comment
- Filters: Status (All/Pending/Approved/Rejected) | Year dropdown
- Pagination

---

### PAGE 9: Leave Approvals — Admin (`leave-approvals.html`)

**Layout:** Sidebar + Main content.

**Stats Bar at Top:**
- Pending: 7 (yellow) | Approved this month: 23 (green) | Rejected this month: 3 (red)

**Filter/Sort Bar:**
- Filter by: Status | Department | Leave Type
- Sort by: Date Applied | Employee Name

**Leave Request Cards (card-based layout, not table):**
Each card shows:
- Employee avatar + name + department
- Leave type badge
- Date range: "Aug 25 – Aug 27, 2026 (3 days)"
- Reason text (truncated, expandable)
- Applied on: "Aug 22, 2026"
- **Action buttons:** "Approve" (green) | "Reject" (red)
- Comment text area (appears when clicking approve/reject): "Add a comment (optional)"
- Current leave balance of the employee shown as small text

**Empty state** (when no pending requests): Illustration + "All caught up! No pending leave requests."

---

### PAGE 10: Payroll / Salary (`payroll.html`)

**Layout:** Sidebar + Main content.

**For Employee View:**

**Current Month Salary Card (large, prominent):**
- Month/Year: "August 2026"
- Net Salary: "₹62,450" (large, bold)
- Status badge: "Processed" (green) / "Pending" (yellow)
- "Download Payslip" button

**Salary Breakdown (two columns):**

Left — Earnings:
| Component | Amount |
|-----------|--------|
| Basic Salary | ₹35,000 |
| HRA | ₹14,000 |
| Conveyance Allowance | ₹3,200 |
| Medical Allowance | ₹2,500 |
| Special Allowance | ₹15,000 |
| **Gross Salary** | **₹69,700** |

Right — Deductions:
| Component | Amount |
|-----------|--------|
| Provident Fund | ₹4,200 |
| Professional Tax | ₹200 |
| Income Tax | ₹2,850 |
| **Total Deductions** | **₹7,250** |

**Net Salary** highlighted bar: ₹62,450

**Salary History Table (below):**
- Columns: Month | Gross | Deductions | Net | Status | Payslip
- Last 12 months
- Download icon in payslip column

**For Admin View (additional):**
- Employee selector/search at top
- Bulk payroll table:
  - Columns: Employee | Department | Gross | Deductions | Net | Status | Actions
- "Process Payroll" button for current month
- Edit salary structure modal (when clicking an employee)

---

## Responsive Behavior

- **Desktop (1280px+):** Full sidebar + content layout
- **Tablet (768px–1279px):** Collapsible sidebar (hamburger menu), content takes full width
- **Mobile (< 768px):** Bottom navigation bar instead of sidebar, stacked cards, simplified tables become cards

---

## Reusable Components Needed

1. **Sidebar** — Dark indigo, navigation items, user info at bottom
2. **Header Bar** — Page title, notifications, user avatar dropdown
3. **Stats Card** — Icon, number, label, trend indicator
4. **Data Table** — Sortable, paginated, with row actions
5. **Status Badge** — Color-coded pill badges
6. **Modal/Dialog** — For forms and confirmations
7. **Date Picker** — For leave and attendance date selection
8. **Avatar** — Circle with fallback initials
9. **Empty State** — Illustration + text + action button
10. **Toast/Notification** — Success/error/warning notifications
11. **Form Fields** — Input, select, textarea with label, error state, helper text
12. **Progress Bar** — For leave balance and attendance

---

## Design Generation Tips

- Generate each page as a separate HTML file
- Use Tailwind CSS via CDN for styling
- Include sample/dummy data in the HTML
- Make interactive elements look clickable (hover states)
- Use consistent spacing (p-6 for card padding, gap-6 for grids)
- Dark sidebar should contrast with light main content area
- Tables should have zebra striping (alternate row colors)
- All forms should show both normal and error states
