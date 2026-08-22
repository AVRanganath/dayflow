# Handoff: Dayflow HRMS — 10-screen UI

## Overview
Dayflow is an HRMS web app ("Every workday, perfectly aligned.") covering authentication, employee and admin dashboards, profile, employee directory, attendance, leave requests, leave approvals, and payroll. This bundle contains 10 screens plus a shared sidebar, in an Odoo-inspired visual language (plum purple + teal on near-neutral grays, Montserrat/Roboto UI type, Caveat Brush marker headlines).

## About the Design Files
The `.dc.html` files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior. They are not production code to copy directly. Each file is a self-contained streaming design component (a `<x-dc>` template plus a small logic class); the runtime helper `support.js` exists only so the files open in a browser.

The task is to **recreate these designs in the target codebase's existing environment** (React, Vue, SwiftUI, native, etc.) using its established component library, routing, styling, and state patterns. If no frontend environment exists yet, choose the most appropriate framework for the project and implement the designs there. Do not ship the HTML.

Styling in the prototypes is written as inline styles for streaming reasons only — in the real codebase, promote these values to the project's tokens/theme and its component primitives.

## Fidelity
**High-fidelity (hifi).** Colors, typography, spacing, radii, badge treatments, and interaction states are final and should be recreated closely. Copy text is realistic sample content — replace with real data bindings. Sample employee data (names, IDs, amounts) is dummy content.

---

## Screens / Views

### 1. Sign Up — `signup.dc.html` · route `/signup` · public
**Purpose:** Create an employee or HR/Admin account.
**Layout:** Full-viewport centered on a `linear-gradient(135deg,#F4EEF3,#FFFFFF)` background, 32px page padding. Card is 1040px max-width, min-height 720px, `border-radius:6px`, `box-shadow:0 10px 40px rgba(47,31,43,0.12)`, `overflow:hidden`, split into two equal flex columns.
- **Left brand panel (flex:1, 48px padding):** `linear-gradient(160deg,#714B67,#2F1F2B)`, white text, `justify-content:space-between`.
  - Wordmark "Dayflow" — Montserrat 800, 26px, `letter-spacing:-0.5px`; "flow" in `#8FC9CC`.
  - Headline "Every workday, perfectly aligned." — **Caveat Brush 52px**, `line-height:1.08`, max-width 400px, 52px top margin. The phrase "perfectly aligned." sits on a marker highlight: an absolutely positioned span, `left:-6px right:-6px top:22% bottom:12%`, `background:#F0B93F`, `border-radius:3px`, `z-index:-1`.
  - Sub copy 15px `#D6C4D1`, `line-height:1.6`, max-width 340px.
  - Decorative shapes: 340px circle with `border:60px solid rgba(255,255,255,0.07)` at `right:-80px bottom:-80px`; 120px rounded square (`border-radius:24px`, `rgba(255,255,255,0.08)`, `rotate(18deg)`) at `right:60px bottom:120px`.
  - Footnote "Trusted by 148 people at Dayflow" — Caveat Brush 22px, `#8FC9CC`, `rotate(-3deg)`.
- **Right form panel (flex:1, 48px padding, vertically centered):**
  - Heading "Create your account" — Montserrat 700, 26px, `#383E45`. Sub "Start managing your workday efficiently" — 14px `#6C757D`.
  - Fields, 16px gap: Employee ID + Full Name (side-by-side row, 16px gap), Work Email, Password, Confirm Password, Role (select: Employee / HR / Admin).
  - Field anatomy: label 13px/600 `#383E45`; input `padding:10px 12px`, `border:1px solid #DEE2E6`, `border-radius:4px`, 14px Roboto; focus `outline:2px solid #714B67; outline-offset:-1px`.
  - Validation states (both shown in the mock): valid field → border `#10B981`; invalid → border `#EF4444` plus 12px `#EF4444` helper text ("Please enter a valid work email address.").
  - Password: show/hide text button (12px/600 `#6C757D`) inset right; strength meter = four 4px bars, 4px gap, 3 filled `#10B981` + 1 `#DEE2E6`, with "Strong password" in 12px `#10B981`.
  - Primary button "Create Account": full width, `padding:12px`, `background:#714B67`, hover `#5B3C53`, white 15px/600, `border-radius:4px`.
  - "or" divider (1px `#DEE2E6` rules either side of 12px `#6C757D` text), then "Already have an account? Sign in" (link `#714B67`, hover `#5B3C53`), then 12px `#98A0A8` terms line with underlined link.

### 2. Sign In — `signin.dc.html` · route `/signin` · public
Same split card (min-height 620px). Right panel: "Welcome back" / "Sign in to your Dayflow account"; Email + Password (show/hide); a row with "Remember me" checkbox (`accent-color:#714B67`) and "Forgot password?" link; full-width "Sign In" button; "Don't have an account? Sign up".
**Error state:** alert banner above the form — `background:#FEF2F2`, `border:1px solid #FECACA`, `border-radius:4px`, `padding:12px 14px`, 13px `#B91C1C`, alert-circle icon 16px, text "Invalid email or password. Please try again." In the prototype this is exposed as a `showError` prop and also fires on submit.

### App shell (used by screens 3–10) — `Sidebar.dc.html`
**Sidebar:** fixed 260px wide, `background:#2F1F2B`, full column height (`min-height:100vh; height:100%; align-self:stretch`), `flex-shrink:0`, page shell is `display:flex; align-items:stretch; min-height:100vh`.
- Wordmark block, 24px 20px 20px padding, Montserrat 800 22px white, "flow" `#8FC9CC`, links to the index.
- Nav items: `display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:4px`, 14px/500, idle color `#D6C4D1`, hover `background:rgba(255,255,255,0.08); color:#fff`, **active** `background:#714B67; color:#fff; font-weight:600`. 18px Lucide-style stroke icons (`stroke-width:2`, round caps).
- Divider: 1px `rgba(255,255,255,0.12)`, `margin:10px 8px`.
- Disabled item (admin "Reports"): color `rgba(255,255,255,0.35)`, `cursor:default`, plus a "Coming Soon" pill (10px/600, `rgba(255,255,255,0.14)`, `#D6C4D1`, `border-radius:99px`).
- Footer user card: `margin:12px; padding:12px; background:rgba(255,255,255,0.06); border-radius:4px`; 36px circular avatar (`#714B67`, white 13px/700 initials); name 13px/600 white truncating; role pill 11px/600 `#8FC9CC` on `rgba(113,75,103,0.55)`.
- Props: `role` ("employee" | "admin"), `active` (nav label), `userName`.
- Employee nav: Dashboard, My Profile, Attendance, Leave Requests, Payroll · divider · Settings, Logout.
- Admin nav: Dashboard, Employees, Attendance, Leave Approvals, Payroll, Reports (disabled) · divider · Settings, Logout.

**Header bar (every shell page):** `background:#FFFFFF`, `border-bottom:1px solid #DEE2E6`, `padding:16px 32px`, space-between. Left: page title Montserrat 700 18px `#383E45`, and on dashboards a handwritten greeting under it (**Caveat Brush 20px `#714B67`** — "Good morning, John!" / "Welcome back, Sarah!"). Right: 38px square notification button (`border:1px solid #DEE2E6`, `border-radius:4px`, bell icon, 8px `#EF4444` dot with 2px white ring), then 36px avatar + chevron.

**Main content:** `padding:32px`, vertical flex, `gap:24px`, page background `#F5F6F7`.
**Card:** `background:#FFFFFF`, `border:1px solid #DEE2E6`, `border-radius:4px`, `padding:20–24px`, `box-shadow:0 1px 2px rgba(0,0,0,0.04)`.

### 3. Employee Dashboard — `dashboard-employee.dc.html` · route `/dashboard` · employee
2×2 card grid, 24px gap, then a stats strip.
- **Today's Attendance:** title 15px/600 + status pill ("Checked In" `#D1FAE5`/`#065F46`, or "Not Checked In" `#EDEFF1`/`#6C757D`). Two stat pairs (12px `#6C757D` label over 22px/700 `#383E45` value): check-in time `09:02 AM`, hours worked `4h 32m`. Bottom button toggles: Check Out `#EF4444` when checked in, Check In `#10B981` when not — full width, 12px padding, white 15px/600.
- **Leave Balance:** three rows, each a label/value line (13px, name `#383E45` 500, remaining `#6C757D`) over a 6px track (`#EDEFF1`, `border-radius:3px`) with fill: Paid `#714B67` 67% (8/12), Sick `#F59E0B` 60% (3/5), Casual `#10B981` 67% (2/3). Bottom outline CTA "Apply for Leave" (`border:1px solid #714B67`, `color:#714B67`, hover `background:#F4EEF3`).
- **Recent Activity:** 4 rows, 14px gap: 10px colored dot (green/plum/gray/amber), 13px `#383E45` text, right-aligned 12px `#6C757D` timestamp. Items: "Leave request approved · 2 hours ago", "Checked in at 9:02 AM · Today", "Profile updated · Yesterday", "Payslip generated for July · 3 days ago".
- **This Week's Summary:** 5-column grid of day cells (`border:1px solid #DEE2E6`, `border-radius:4px`, `padding:10px 4px`, centered): 11px/600 `#6C757D` day, 12px status dot, 10px `#98A0A8` hours. Statuses: Mon/Tue present, Wed half-day, Thu leave, Fri present. Below: Total hours `38h 15m`, Attendance rate `96%` (in `#10B981`).
- **Stats strip:** single card, `padding:16px 24px`, five equal cells separated by 1px×24px `#DEE2E6` rules: Total Working Days 22, Present 20 (`#10B981`), Absent 1 (`#EF4444`), Leave 1 (`#714B67`).

### 4. Admin Dashboard — `dashboard-admin.dc.html` · route `/dashboard` · admin
- **Row 1 — stats:** `grid-template-columns:repeat(auto-fit,minmax(210px,1fr))`, 20px gap (wraps rather than clipping). Each card: 13px `#6C757D` label + 32px rounded icon tile (`border-radius:4px`), then 26px/700 value with a small colored delta. Cards: Total Employees 148 (`#E0F0F1`/`#017E84` tile, "↑ +3 this month"), Present Today 132 (`#D1FAE5`/`#059669`, "89%"), Pending Leave Requests 7 (`#FEF3C7`/`#B45309`, "needs review"), Total Payroll This Month ₹42,50,000 (`#F2EBF0`/`#8A5B7E`).
- **Row 2 (3fr / 2fr, 24px gap):**
  - *Recent Leave Requests* table. Header/row grid: `minmax(150px,2.4fr) 0.9fr 1.3fr 1fr 84px`, `gap:12px`, `padding:12px 24px`, rows `border-bottom:1px solid #EDEFF1`. Header labels 11px/600 uppercase `#6C757D`, `letter-spacing:0.5px`. Cells: 30px avatar + 13px/600 name; leave-type badge; date range 13px `#6C757D`; status badge; for pending rows two 28px icon buttons — approve (`#ECFDF5` on `#D1FAE5` border, `#10B981` check) and reject (`#FEF2F2` on `#FECACA`, `#EF4444` cross). Footer "View All →" link to `/leaves/approvals`.
  - *Attendance Overview* donut: 180px SVG, `r:70`, `stroke-width:26`, rotated -90°, track `#EDEFF1`, segments via `pathLength="100"` + `stroke-dasharray`/`dashoffset` — Present 88 `#10B981`, Absent 4.5 `#EF4444`, Half-day 2.5 `#F59E0B`, On Leave 2.5 `#714B67`. Center label 26px/700 "89%" over 11px "Present". Subtitle "Today, Aug 22, 2026". Two-column legend with 10px `border-radius:3px` swatches.
- **Row 3 — Department-wise Headcount:** rows of `110px 1fr 40px` grid, 16px gap: name 13px/500, 12px track (`#EDEFF1`, `border-radius:6px`) with `#714B67` fill, right-aligned count. Engineering 45 (100%), Marketing 18 (40%), Design 12 (27%), Finance 10 (22%), HR 8 (18%).

### 5. Employee Profile — `profile.dc.html` · route `/profile` · employee
- **Profile header card** (`border-radius:6px`, `padding:28px 32px`, 28px gap): 120px circular avatar with `linear-gradient(135deg,#714B67,#8A5B7E)` and 38px/700 initials; 34px circular camera button overlaid bottom-right (white, 1px `#DEE2E6` border, `box-shadow:0 2px 6px rgba(0,0,0,0.12)`). Name Montserrat 700 22px; designation 14px `#6C757D`; department badge (`#E0F0F1`/`#017E84`) + "Employee ID: EMP001" 12px `#6C757D`. Right: outline "Edit Profile" button.
- **Tab bar:** buttons `padding:14px 16px`, 14px; active `border-bottom:2px solid #714B67; color:#714B67; font-weight:600`, inactive transparent border + `#6C757D`. Tabs: Personal Details · Job Details · Salary Structure · Documents.
- **Tab 1 Personal Details:** two-column grid, 20px gap — First/Last Name, Email (locked), Phone, Date of Birth (locked), Gender, Address (textarea, full width `grid-column:1/-1`), City, State, Country, Zip. Locked fields: 12px padlock icon beside the label and `background:#F5F6F7; color:#6C757D` input. Primary "Save Changes" button below.
- **Tab 2 Job Details:** two-column read-only grid (all with padlock): Employee ID EMP001, Department Engineering, Designation Senior Software Engineer, Date of Joining 02 Jun 2022, Employment Type (badge "Full-time" `#D1FAE5`/`#065F46`), Reporting Manager Sarah Mitchell (EMP012). Read-only value box: `padding:10px 12px`, `border:1px solid #DEE2E6`, `background:#F5F6F7`, `color:#6C757D`.
- **Tab 3 Salary Structure:** two bordered tables (header `background:#F5F6F7`, 13px/700). Earnings: Basic ₹35,000, HRA ₹14,000, Conveyance ₹3,200, Medical ₹2,500, Special Allowance ₹15,000, **Gross ₹69,700**. Deductions: PF ₹4,200, Professional Tax ₹200, Income Tax ₹2,850, **Total ₹7,250**. Total rows use `background:#F5F6F7`, 700 weight, 800 amounts. Highlight bar below: `background:#F4EEF3`, `border:1px solid #D6C4D1`, label 14px/700 `#2F1F2B`, value 22px/800 `#714B67` — Net Salary ₹62,450.
- **Tab 4 Documents:** drop zone — `border:2px dashed #D6C4D1`, `border-radius:4px`, `padding:36px`, `background:#FAF7F9`, hover `#F4EEF3`, 28px upload icon `#714B67`, "Drag and drop files here" 14px/600 + "or browse — PDF, DOC, PNG up to 10 MB". File rows: 38px type tile (PDF `#FEE2E2`/`#B91C1C`, IMG `#E0F0F1`/`#017E84`, DOC `#F2EBF0`/`#7B4A6E`) + name 13px/600 + meta 12px `#6C757D` + 30px download and delete buttons (delete uses `#FEF2F2`/`#FECACA`/`#EF4444`).

### 6. Employee Directory — `employees.dc.html` · route `/employees` · admin
- Header shows "Employees" + count pill "148" (`#F4EEF3`/`#714B67`).
- **Toolbar:** search input (flex:1, min 260px, 38px left padding for the 16px magnifier at `left:12px top:12px`), three selects (Department / Type / Status), and a primary "Add Employee" button with a plus icon.
- **Table:** grid `2.4fr 0.9fr 1.2fr 1.6fr 1fr 0.9fr 1fr`, `padding:12px 24px`. Header row `background:#F5F6F7`, 11px/600 uppercase `#6C757D`. Rows: zebra striping (`#FFFFFF` / `#FAFAFB`), hover `#F5F6F7`, `border-bottom:1px solid #EDEFF1`. Employee cell = 34px avatar (rotating palette `#714B67 #10B981 #F59E0B #8A5B7E #EF4444 #0EA5E9 #EC4899 #14B8A6`) + name 13px/600 + email 12px `#6C757D`, both truncating. Department badges: Engineering `#E0F0F1`/`#017E84`, Design `#F2EBF0`/`#7B4A6E`, Marketing `#FEF3C7`/`#B45309`, HR `#FCE7F3`/`#BE185D`, Finance `#D1FAE5`/`#065F46`. Status: Active `#D1FAE5`/`#065F46`, Inactive `#FEE2E2`/`#B91C1C`. Actions: 28px view (eye), edit (pencil), and three-dot menu buttons.
- **Pagination footer:** "Showing 1–10 of 148" 13px `#6C757D`; page buttons `padding:6px 12px`, current = `#714B67` fill + white, others white with `#DEE2E6` border, ellipsis, Prev (disabled `#98A0A8`) / Next.

### 7. Attendance — `attendance.dc.html` · route `/attendance` · both
- **Today bar (card, 24px padding, 32px gap):** left — "Today" 13px `#6C757D`, "Saturday, Aug 22, 2026" Montserrat 700 22px, "✓ Checked in at 09:02 AM" 13px/600 `#10B981`. Middle — "Hours worked today" with `4h 32m / 8h` and an 8px progress track (`#EDEFF1`) filled 57% `#714B67`. Right — "Check Out" button `#EF4444` (hover `#DC2626`), `padding:14px 32px`.
- **View toggle:** segmented control in a white 3px-padded shell with `border:1px solid #DEE2E6`; active segment `#714B67` + white 600, inactive transparent `#6C757D`. Tabs Daily | Weekly | Monthly (Monthly default). Right side: month stepper "‹ August 2026 ›" with 28px square buttons.
- **Monthly calendar:** 7-column grid; weekday header row 11px/600 uppercase `#6C757D`. Cells `min-height:72px`, `padding:8px 10px`, hairline `#EDEFF1` borders; out-of-month cells `background:#FAFAFB` with `#CED4DA` numerals. Day number 12px/600; **today (22)** is a 22px `#714B67` circle with white text. Status dot 9px top-right — Present `#10B981`, Absent `#EF4444`, Half-day `#F59E0B`, Leave `#714B67`. Optional 10px `#98A0A8` time text ("9:05–6:12", "Paid leave", "9:02 – now"). Legend strip at the bottom repeats the four dot colors.
- **Weekly table:** columns Day | Date | Check In | Check Out | Hours | Status (grid `1fr 1.2fr 1fr 1fr 1fr 1fr`), 7 rows (Sun weekend, Wed leave), status badges, and a totals row (`background:#F5F6F7`, 700) showing `38h 15m`.
- **Daily view:** "Today's Timeline" card — three rows with 10px dots: Checked in 09:02 AM (`#10B981`), Lunch break 01:00–01:35 PM (`#F59E0B`), Currently working — 4h 32m elapsed / "now" (`#714B67`).
- **Summary strip:** Present Days 20, Absent 1, Half-days 1, Leaves 1, Total Hours 168h — same divided-strip pattern as the employee dashboard.
- **Admin variant (not yet built):** add an employee selector at the top, an all-employees table (Employee | Today Status | Check In | Check Out | Hours | Actions), and a CSV export button.

### 8. Leave Management — `leaves.dc.html` · route `/leaves` · both
- Header carries the primary "Apply for Leave" button (plus icon) which opens the modal.
- **Balance cards:** wrapping grid (`minmax(210px,1fr)`, 20px gap): Paid 8 / 12 (`#714B67` 67%), Sick 3 / 5 (`#F59E0B` 60%), Casual 2 / 3 (`#10B981` 67%), Unpaid "Unlimited" (no bar). Each: 13px `#6C757D` label, 22px/700 value, 6px track.
- **Leave History table:** card header with "Leave History" + Status and Year selects. Grid `1fr 1fr 1fr 0.6fr 1.8fr 1.1fr 1fr`, `padding:13px 24px`, rows clickable (`cursor:pointer`, hover `#F5F6F7`). Columns Type (badge: Paid `#E0F0F1`/`#017E84`, Sick `#FEF3C7`/`#B45309`, Casual `#D1FAE5`/`#065F46`, Unpaid `#EDEFF1`/`#6C757D`) | From | To | Days | Reason (truncating) | Status (Pending `#FEF3C7`/`#B45309`, Approved `#D1FAE5`/`#065F46`, Rejected `#FEE2E2`/`#B91C1C`) | Applied On. Clicking a row expands a `#F5F6F7` panel: "Reviewer comment:" 600 `#6C757D` + the comment. Footer: "Showing 1–6 of 14 · Click a row to see the reviewer comment" + pagination.
- **Apply Leave modal:** overlay `rgba(56,62,69,0.5)`, `z-index:50`, centered. Panel 480px (`max-width:calc(100vw - 48px)`), `border-radius:6px`, `box-shadow:0 20px 60px rgba(0,0,0,0.25)`. Header row with title 16px/700 and a 30px `#EDEFF1` close button. Body 24px padding, 16px gap: Leave Type select; Start Date + End Date row (native date inputs); Total Days read-only box ("3 days (auto-calculated)", `background:#F5F6F7`); Reason textarea (3 rows); right-aligned Cancel (outline) + Submit Request (primary) buttons. Overlay click and Cancel both dismiss; the panel stops propagation.

### 9. Leave Approvals — `leave-approvals.dc.html` · route `/leaves/approvals` · admin
- **Stats bar:** three cards with a 4px left accent border — Pending 7 (`#F59E0B`), Approved this month 23 (`#10B981`), Rejected this month 3 (`#EF4444`); 13px label over 26px/700 value.
- **Filter/sort bar:** "Filter by" + Status / Department / Leave Type selects; right side "Sort by" + Date Applied | Employee Name.
- **Request cards:** grid `repeat(auto-fit,minmax(360px,1fr))`, 24px gap. Each card (20px padding, 14px gap): 40px avatar + name 14px/700 + department 12px `#6C757D` + leave-type badge; date line with a 15px calendar icon and 14px/600 text ("Aug 25 – Aug 27, 2026 (3 days)"); reason 13px `#6C757D` `line-height:1.55` with a "more" link when truncated; meta row 12px `#98A0A8` — "Applied on …" and "Balance: 8 paid days left".
- **Action states:** *idle* → two buttons, Approve (`#10B981` fill, hover `#0DA271`) and Reject (white, `#EF4444` text, `#FECACA` border, hover `#FEF2F2`). *Commenting* (after clicking either) → "Add a comment (optional)" textarea plus "Confirm Approve" (green) / "Confirm Reject" (red) and a Cancel button. *Decided* → a filled banner, "✓ Approved" (`#D1FAE5`/`#065F46`) or "✕ Rejected" (`#FEE2E2`/`#B91C1C`).
- **Empty state** (all requests decided): card with 64px padding, 72px `#D1FAE5` circle holding a `#10B981` check, "All caught up!" 16px/700, "No pending leave requests." 14px `#6C757D`.

### 10. Payroll — `payroll.dc.html` · route `/payroll` · both
- **Hero card:** `linear-gradient(135deg,#714B67,#2F1F2B)`, `border-radius:6px`, `padding:28px 32px`, `box-shadow:0 4px 16px rgba(47,31,43,0.25)`. Label "Net Salary · August 2026" in **Caveat Brush 24px `#F0B93F`**; amount ₹62,450 Montserrat 800 38px `letter-spacing:-1px`; status pill "✓ Processed on Aug 01" (`rgba(16,185,129,0.25)` / `#8FE3C4`). Right: white "Download Payslip" button (`#714B67` text, 700, download icon, hover `#F4EEF3`).
- **Breakdown:** two bordered tables, same anatomy as the profile Salary tab (Earnings totalling ₹69,700; Deductions totalling ₹7,250).
- **Net bar:** `background:#F4EEF3`, `border:1px solid #D6C4D1`, label "Net Salary (Gross ₹69,700 − Deductions ₹7,250)" 14px/700 `#2F1F2B`, value ₹62,450 24px/800 `#714B67`.
- **Salary History table:** grid `1.4fr 1fr 1fr 1fr 1fr 0.8fr` — Month | Gross | Deductions | Net | Status | Payslip; 12 rows (Sep 2025 → Aug 2026), all "Processed" badges, 30px download button per row.
- **Admin variant (not yet built):** employee selector/search, bulk payroll table (Employee | Department | Gross | Deductions | Net | Status | Actions), "Process Payroll" button for the current month, and an edit-salary-structure modal.

### Index — `index.dc.html`
Non-product navigation page listing all screens grouped Public / Employee / Admin as linked cards. Title is Caveat Brush 46px with the yellow marker highlight. Not part of the product — drop it or keep it as a storybook-style entry point.

---

## Interactions & Behavior
- **Navigation:** sidebar items route to their pages; active item derives from the current route. Logout → `/signin`. "Reports" is disabled with a "Coming Soon" badge.
- **Check in / out** (employee dashboard, attendance): toggles status pill, check-in time, hours worked, and the button's label/color.
- **Profile tabs:** local tab state; no route change in the prototype (a query param or nested route is fine in the real app).
- **Attendance view toggle:** Daily / Weekly / Monthly swap the panel below; month stepper is visual only.
- **Apply for Leave:** button opens the modal; overlay click, Cancel, and Submit all close it. Total Days is derived from the date range (recompute on change). Validate end ≥ start, non-empty reason, and available balance.
- **Leave history rows:** click toggles the reviewer-comment panel (accordion, one open at a time in the prototype).
- **Leave approvals:** Approve/Reject → comment step → Confirm commits the decision and swaps the card footer for a result banner; Cancel returns to idle. When every request is decided the list is replaced by the empty state.
- **Hover states:** all buttons and links darken (`#714B67` → `#5B3C53`); table rows hover `#F5F6F7`; icon buttons fill with their tint; index cards get `border-color:#714B67` and `box-shadow:0 4px 12px rgba(47,31,43,0.1)`.
- **Focus:** inputs/selects/textareas `outline:2px solid #714B67; outline-offset:-1px`.
- **Form validation** (sign up): required Employee ID / Name / Email / Password / Confirm / Role; email format; password ≥ 8 chars with a strength meter; confirm must match. Invalid → red border + 12px red helper text; valid → green border.
- **Transitions:** nav background `0.15s`. No other animation — keep motion minimal.
- **Responsive:** the prototypes target desktop (1280px+) and use `auto-fit` grids so cards wrap. Per the original spec, tablet (768–1279px) should collapse the sidebar behind a hamburger and mobile (<768px) should replace it with a bottom nav, stack cards, and turn tables into card lists. That breakpoint work is **not** in these prototypes — implement it with the codebase's own responsive utilities.

## State Management
Per screen, local UI state is enough; server data should come from the app's data layer.
- Auth: `email`, `password`, `showPassword`, `remember`, `role`, field errors, `submitError`.
- Employee dashboard / attendance: `checkedIn`, `checkInTime`, `hoursWorkedToday`; attendance also `view` ("Daily"|"Weekly"|"Monthly") and `month`.
- Profile: `activeTab`, editable form model, `isEditing`.
- Directory: `query`, `filters {department, employmentType, status}`, `page`, `pageSize`, `sort`.
- Leaves: `balances`, `history`, `expandedRowId`, `modalOpen`, `form {type, startDate, endDate, days, reason}`, filters.
- Approvals: per-request `mode` (null | "approve" | "reject"), `decision`, `comment`; derived `allDecided` for the empty state.
- Payroll: `currentPayslip`, `history`, `selectedEmployee` (admin).
- Data needed: current user + role, attendance records by month, leave balances and requests, payslips, employee list with pagination/filters, and org stats for the admin dashboard.

## Design Tokens
**Color**
| Token | Value |
|---|---|
| Primary (plum) | `#714B67` |
| Primary hover / deep | `#5B3C53` |
| Sidebar / darkest plum | `#2F1F2B` |
| Primary tint / surface | `#F4EEF3` |
| Primary tint border | `#D6C4D1` |
| Secondary (teal) | `#017E84` |
| Teal tint | `#E0F0F1` |
| Teal on dark | `#8FC9CC` |
| Accent marker (highlight) | `#F0B93F` |
| Success | `#10B981` (dark `#065F46`, tint `#D1FAE5`, hover `#0DA271`) |
| Warning | `#F59E0B` (dark `#B45309`, tint `#FEF3C7`) |
| Danger | `#EF4444` (dark `#B91C1C`, tint `#FEE2E2`, soft `#FEF2F2`, border `#FECACA`) |
| Page background | `#F5F6F7` |
| Card background | `#FFFFFF` |
| Zebra row | `#FAFAFB` |
| Border | `#DEE2E6` |
| Hairline / track | `#EDEFF1` |
| Text primary | `#383E45` |
| Text secondary | `#6C757D` |
| Text muted | `#98A0A8` |
| Disabled text | `#CED4DA` |
| Avatar palette | `#714B67 #10B981 #F59E0B #8A5B7E #EF4444 #0EA5E9 #EC4899 #14B8A6` |

**Typography** — Caveat Brush (marker display: hero headlines, greetings, payroll hero label) · Montserrat 600/700/800 (titles, stat values, ≥15px bold text, `letter-spacing:-0.2px`) · Roboto 300/400/500/700 (all UI text). Scale: 52 hero · 46 index title · 38 hero amount · 34 · 26 stat/heading · 24 · 22 page value · 20 greeting · 18 page title · 15 card title · 14 body/controls · 13 table + labels · 12 meta · 11 badges/table headers · 10 micro.

**Spacing** — 2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 24 · 28 · 32 · 36 · 48 · 56 px. Page padding 32; card padding 20–24; grid gap 20–24; header padding 16/32.

**Radius** — 3 (marker highlight, small tracks) · 4 (cards, buttons, inputs, tiles) · 6 (large containers, modal, hero) · 99 (pills) · 50% (avatars).

**Shadow** — card `0 1px 2px rgba(0,0,0,0.04)` · elevated/hero `0 4px 16px rgba(47,31,43,0.25)` · auth card `0 10px 40px rgba(47,31,43,0.12)` · modal `0 20px 60px rgba(0,0,0,0.25)` · index card hover `0 4px 12px rgba(47,31,43,0.1)`.

## Assets
No image or font files ship with this bundle.
- Fonts: Google Fonts — Caveat Brush, Montserrat (600/700/800), Roboto (300/400/500/700). Self-host or use the codebase's existing font pipeline.
- Icons: hand-inlined SVG paths in the Lucide style (24×24 viewBox, `stroke-width:2`, round caps/joins) — bell, chevron, calendar, users, check, cross, eye, pencil, kebab, download, trash, camera, upload, search, plus, lock, sliders, log-out. Replace with the codebase's Lucide (or equivalent) icon components.
- Avatars are initials on flat color — no photography. Charts (donut, bars, progress) are plain SVG/CSS, no chart library.

## Files
All screens live in the project's `UI/` folder and are copied into this bundle:
`index.dc.html` · `signup.dc.html` · `signin.dc.html` · `dashboard-employee.dc.html` · `dashboard-admin.dc.html` · `profile.dc.html` · `employees.dc.html` · `attendance.dc.html` · `leaves.dc.html` · `leave-approvals.dc.html` · `payroll.dc.html` · `Sidebar.dc.html` (shared shell, imported by every signed-in screen) · `support.js` (prototype runtime only — do not port).

Each file's markup sits between `<x-dc>` and `</x-dc>`; the `class Component extends DCLogic` block at the bottom holds the derived values, sample data, and handlers, which is the clearest place to read the intended state model.

## Not yet designed
Admin variants of Attendance and Payroll, Settings, Reports, forgot-password, add/edit-employee forms, toast notifications, and the tablet/mobile breakpoints listed above.
