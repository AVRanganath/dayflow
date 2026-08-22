# Dayflow HRMS — UI Design Spec

> **Status: designed.** These screens are built as high-fidelity prototypes in [`UI/`](../UI/).
> This file is the **design system of record** — tokens, page inventory, and per-page intent.
> For the built anatomy of a single screen (exact paddings, grid tracks, badge tints, state
> model), read [`UI/README.md`](../UI/README.md); it is written from the delivered prototypes
> and wins on any conflict.
>
> The prototypes are **references, not production code.** Recreate them in `apps/web` with the
> project's own components, routing, and Tailwind tokens — do not ship the HTML.

---

## Global Design System

**App Name:** Dayflow
**Tagline:** "Every workday, perfectly aligned."
**Style:** Odoo-inspired business software — plum and teal on near-neutral grays, dense but
calm, with a hand-drawn marker accent that keeps it from reading as corporate. Hairline
borders, flat tints, minimal motion. Only two gradients exist and both are deliberate: the
auth brand panel and the payroll hero.

**Color Palette**

| Role | Token | Value |
|---|---|---|
| Primary (plum) | `primary` | `#714B67` |
| Primary hover / deep | `primary-hover` | `#5B3C53` |
| Sidebar / darkest plum | `sidebar` | `#2F1F2B` |
| Primary tint / surface | `primary-tint` | `#F4EEF3` |
| Primary tint border | `primary-tint-border` | `#D6C4D1` |
| Secondary (teal) | `secondary` | `#017E84` |
| Teal tint | `secondary-tint` | `#E0F0F1` |
| Teal on dark | `secondary-on-dark` | `#8FC9CC` |
| Accent marker | `accent` | `#F0B93F` |
| Success | `success` | `#10B981` · dark `#065F46` · tint `#D1FAE5` · hover `#0DA271` |
| Warning | `warning` | `#F59E0B` · dark `#B45309` · tint `#FEF3C7` |
| Danger | `danger` | `#EF4444` · dark `#B91C1C` · tint `#FEE2E2` · soft `#FEF2F2` · border `#FECACA` |
| Page background | `background` | `#F5F6F7` |
| Card background | `card` | `#FFFFFF` |
| Zebra row | `zebra` | `#FAFAFB` |
| Border | `border` | `#DEE2E6` |
| Hairline / track | `hairline` | `#EDEFF1` |
| Text primary | `text-primary` | `#383E45` |
| Text secondary | `text-secondary` | `#6C757D` |
| Text muted | `text-muted` | `#98A0A8` |
| Disabled text | `text-disabled` | `#CED4DA` |

**Avatar palette** (rotate by index): `#714B67` `#10B981` `#F59E0B` `#8A5B7E` `#EF4444` `#0EA5E9` `#EC4899` `#14B8A6`

**Typography** — three families, Google Fonts:
- **Caveat Brush** — marker display only: hero headlines, dashboard greetings, the payroll hero label.
- **Montserrat** 600/700/800 — titles, stat values, any bold text ≥15px; `letter-spacing:-0.2px`.
- **Roboto** 300/400/500/700 — all other UI text.

Scale (px): 52 hero · 46 index title · 38 hero amount · 34 · 26 stat/heading · 24 · 22 page
value · 20 greeting · 18 page title · 15 card title · 14 body/controls · 13 table + labels ·
12 meta · 11 badges/table headers · 10 micro.

**Spacing** — 2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 24 · 28 · 32 · 36 · 48 · 56 px.
Page padding 32 · card padding 20–24 · grid gap 20–24 · header padding 16/32.

**Border Radius** — `3px` marker highlight and small tracks · `4px` cards, buttons, inputs,
tiles · `6px` large containers, modals, hero · `99px` pills · `50%` avatars.

**Shadows** — card `0 1px 2px rgba(0,0,0,0.04)` · elevated/hero `0 4px 16px rgba(47,31,43,0.25)`
· auth card `0 10px 40px rgba(47,31,43,0.12)` · modal `0 20px 60px rgba(0,0,0,0.25)` · index
card hover `0 4px 12px rgba(47,31,43,0.1)`.

**Focus** — `outline:2px solid #714B67; outline-offset:-1px` on every input, select, textarea.

**Marker highlight** — the signature accent. An absolutely positioned span behind Caveat Brush
text: `background:#F0B93F`, `border-radius:3px`, `z-index:-1`, inset `left:-6px right:-6px
top:22% bottom:12%`. Used on the auth headline and the index title.

**Icons:** Lucide (24×24 viewBox, `stroke-width:2`, round caps/joins).
**Framework:** Tailwind CSS. All pages responsive.

---

## Page Inventory (10 Pages Total)

| # | Page | File Name | Route | Role |
|---|------|-----------|-------|------|
| 1 | Sign Up | `signup.dc.html` | `/signup` | Public |
| 2 | Sign In | `signin.dc.html` | `/signin` | Public |
| 3 | Employee Dashboard | `dashboard-employee.dc.html` | `/dashboard` | Employee |
| 4 | Admin Dashboard | `dashboard-admin.dc.html` | `/dashboard` | Admin |
| 5 | Employee Profile (View/Edit) | `profile.dc.html` | `/profile` | Employee |
| 6 | Employee Directory (Admin) | `employees.dc.html` | `/employees` | Admin |
| 7 | Attendance Page | `attendance.dc.html` | `/attendance` | Both |
| 8 | Leave Management | `leaves.dc.html` | `/leaves` | Both |
| 9 | Leave Approvals (Admin) | `leave-approvals.dc.html` | `/leaves/approvals` | Admin |
| 10 | Payroll / Salary | `payroll.dc.html` | `/payroll` | Both |

---

## Page-by-Page Specifications

### PAGE 1: Sign Up (`signup.dc.html`)

**Layout:** Centered card on `linear-gradient(135deg,#F4EEF3,#FFFFFF)`, 32px page padding. Card max-width 1040px, `border-radius:6px`, auth shadow, split into two equal columns — left brand panel, right form.

**Left Side (50% width on desktop, hidden on mobile):**
- Wordmark "Dayflow" — Montserrat 800 26px white, "flow" in teal `#8FC9CC`
- Headline "Every workday, perfectly aligned." — **Caveat Brush 52px**, with the marker highlight behind "perfectly aligned."
- Decorative shapes: a 340px ring (`border:60px solid rgba(255,255,255,0.07)`) bottom-right, and a 120px rounded square rotated 18°
- Footnote "Trusted by 148 people at Dayflow" — Caveat Brush 22px `#8FC9CC`, rotated -3°
- Background: `linear-gradient(160deg,#714B67,#2F1F2B)`

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
- Primary button: "Create Account" (full width, plum `#714B67`, hover `#5B3C53`)
- Divider: "or"
- Link: "Already have an account? Sign in"
- Footer: Terms of service link

**Validation States:** Valid field → border `#10B981`. Invalid → border `#EF4444` + 12px `#EF4444` helper text. Password strength meter: four 4px bars, filled `#10B981`, unfilled `#DEE2E6`.

---

### PAGE 2: Sign In (`signin.dc.html`)

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

### PAGE 3: Employee Dashboard (`dashboard-employee.dc.html`)

**Layout:** Sidebar + Main content area.

**Sidebar (dark plum `#2F1F2B`, 260px wide, collapsible):**
- Top: Dayflow logo (white text)
- Navigation items (with Lucide icons):
  - 📊 Dashboard (active state — plum `#714B67` background, white, 600 weight)
  - 👤 My Profile
  - 📅 Attendance
  - 🏖️ Leave Requests
  - 💰 Payroll
  - ─── divider ───
  - ⚙️ Settings
  - 🚪 Logout
- Bottom: User avatar circle + name + role badge ("Employee")

**Top Header Bar:**
- Left: "Dashboard" page title (Montserrat 700 18px) + greeting "Good morning, John!" in **Caveat Brush 20px `#714B67`**
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
     - Green `#10B981` = Present, Red `#EF4444` = Absent, Amber `#F59E0B` = Half-day, Plum `#714B67` = Leave
   - Total hours: "38h 15m"
   - Attendance rate: "96%"

**Bottom Section:**
- Quick stats row: "Total Working Days: 22 | Present: 20 | Absent: 1 | Leave: 1"

---

### PAGE 4: Admin Dashboard (`dashboard-admin.dc.html`)

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
1. Total Employees: "148" with up arrow "+3 this month" (teal tile `#E0F0F1`/`#017E84`)
2. Present Today: "132" with percentage "89%" (green tile `#D1FAE5`/`#059669`)
3. Pending Leave Requests: "7" (amber tile `#FEF3C7`/`#B45309`, clickable)
4. Total Payroll This Month: "₹42,50,000" (plum tile `#F2EBF0`/`#8A5B7E`)

**Row 2 — Two columns:**

Left Column (60%):
- **Recent Leave Requests** table:
  - Columns: Employee Name | Leave Type | Dates | Status | Actions
  - 5 rows with:
    - Name + avatar thumbnail
    - Leave type badge (Paid `#E0F0F1`/`#017E84`, Sick `#FEF3C7`/`#B45309`, Casual `#D1FAE5`/`#065F46`, Unpaid `#EDEFF1`/`#6C757D`)
    - Date range
    - Status badge (Pending=yellow, Approved=green, Rejected=red)
    - Approve/Reject icon buttons (for pending ones)
  - "View All" link at bottom

Right Column (40%):
- **Attendance Overview** - Donut chart / pie chart:
  - Present: 89% (green)
  - Absent: 5% (red)
  - Half-day: 3% (yellow)
  - On Leave: 3% (plum `#714B67`)
  - "Today, Aug 22, 2026" subtitle

**Row 3:**
- **Department-wise Headcount** horizontal bar chart
  - Engineering: 45
  - Design: 12
  - Marketing: 18
  - HR: 8
  - Finance: 10

---

### PAGE 5: Employee Profile (`profile.dc.html`)

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

### PAGE 6: Employee Directory — Admin (`employees.dc.html`)

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

### PAGE 7: Attendance (`attendance.dc.html`)

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
  - Color-coded status dot (Present `#10B981`, Absent `#EF4444`, Half-day `#F59E0B`, Leave `#714B67`)
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

### PAGE 8: Leave Management (`leaves.dc.html`)

**Layout:** Sidebar + Main content.

**Top Section — Leave Balance Cards (horizontal row):**
- Paid Leave: 8/12 (progress bar, plum `#714B67`)
- Sick Leave: 3/5 (progress bar, amber `#F59E0B`)
- Casual Leave: 2/3 (progress bar, green `#10B981`)
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

### PAGE 9: Leave Approvals — Admin (`leave-approvals.dc.html`)

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

### PAGE 10: Payroll / Salary (`payroll.dc.html`)

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

1. **Sidebar** — Dark plum `#2F1F2B`, navigation items, user info at bottom
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

- The prototypes already exist in `UI/` as `.dc.html` — read them before rebuilding a screen
- Recreate in `apps/web` with the project's Tailwind tokens; do not port the inline styles or `support.js`
- Sample data in the prototypes is dummy — replace with real bindings
- Make interactive elements look clickable (hover states)
- Use consistent spacing (20–24px card padding, 20–24px grid gaps, 32px page padding)
- Dark plum sidebar contrasts with the `#F5F6F7` main content area
- Tables should have zebra striping (alternate row colors)
- All forms should show both normal and error states
