# Story 5: Dashboard & Attendance Page

**Story ID**: DESIGN-V2-5
**Epic**: [Adama v2 Design System](./epic-adama-v2-design.md)
**Size**: Medium
**Sprint**: 2
**Dependencies**: Stories 2, 3 (Sidebar + TopBar must be in place)

## Objective

Restyle the manager dashboard / attendance page to match the Adama v2 mockup: premium anomaly panel, polished filter bar, and attendance table with avatars, sticky header, status badges, and hover row actions (with mobile touch fallback).

## Reference

- **Mockup**: `design-mockups/direction-a-v2/dashboard.html` — main content section (lines 415–1030)
- **Current**: `app/[locale]/(dashboard)/dashboard/page.tsx` + `components/attendance/*`

## Files to Modify

- `app/[locale]/(dashboard)/dashboard/page.tsx`
- `components/attendance/anomaly-panel.tsx`
- `components/attendance/attendance-filters.tsx`
- `components/attendance/attendance-table.tsx`

## Tasks

### 1. Page Header

- Title "נוכחות" (h1, 1.7rem, weight 700)
- Date label below in muted color
- "+ הוספת רשומה" button: accent gradient, right-aligned
- Entry animation: `animate-fade-slide-up`

### 2. Anomaly Panel

- Premium card: `var(--card)` bg, `rounded-xl` (20px), `shadow-md`, subtle border
- Title: "התראות" in uppercase small text
- Anomaly items: colored background pills
  - Red: excessive hours (`var(--status-rejected-bg/text)`)
  - Amber: stale pending records (`var(--status-pending-bg/text)`)
- Icon + label + description per item

### 3. Filter Bar

- Background: `var(--secondary)`, `rounded-xl`, border
- Inputs and selects: 38px height, `rounded-sm`, focus ring with primary color
- Labels in muted small text
- "נקה" ghost button to clear filters
- Flex-wrap for responsive stacking

### 4. Attendance Table

**Card wrapper**: `var(--card)` bg, `rounded-xl`, `shadow-md`, `overflow: hidden`

**Table header (thead)**:
- Sticky with `backdrop-blur-sm`
- Small uppercase muted text
- Border-bottom 2px

**Table rows (tbody)**:
- Worker cell: 32px initials avatar circle + bold name
- Hours cell: tabular-nums font, anomaly hours in red bold
- Status badges: rounded pill (50px border-radius), 4 variants:
  - Approved: green bg/text with ✓
  - Pending: amber bg/text with ⏰
  - Rejected: red bg/text with ✗
  - Imported: blue bg/text with ⇩
- Alternating row backgrounds (subtle)
- Hover: slightly darker bg + accent right border

**Row actions**:
- Desktop (`@media (hover: hover)`): hidden by default, slide-in on row hover
  - Approve button (✓), Reject button (✗), Edit button (✎)
  - 30px icon buttons, primary color on hover
- **Mobile (`@media (hover: none)`)**: always visible, compact layout
  - This is critical — field workers use touch devices with gloves

**Table footer (tfoot)**:
- "סה״כ" label + total hours
- Subtle green background tint

### 5. Preserve All Functionality

- Date range filtering still works
- Worker/area dropdown filtering still works
- Approve/reject/edit actions still trigger correct server actions
- Add record modal still opens and submits
- Anomaly detection logic unchanged

## Acceptance Criteria

- [ ] Anomaly panel renders with correct colored items for active anomalies
- [ ] Filter bar allows date range, worker, and area filtering — all functional
- [ ] Table displays worker avatars with initials
- [ ] Status badges render correctly for all 4 status ENUM values
- [ ] Hours anomalies (> 12h) highlighted in red
- [ ] Row actions visible on hover (desktop) and always visible (mobile/touch)
- [ ] Approve/reject/edit actions still work correctly
- [ ] Table header sticks on scroll
- [ ] "סה״כ" footer shows correct total
- [ ] Entry animations play on page load
- [ ] All cross-cutting ACs from epic (build, lint, RTL, responsive, logo)

## Technical Notes

- Sticky thead `top` value: should match TopBar height (56px). Use a CSS variable or Tailwind's `top-14` (56px).
- Status badge component should map to the `attendance_status` ENUM values (`pending`, `approved`, `rejected`, `imported`), not display strings.
- Row action visibility: use `group-hover:opacity-100` in Tailwind with a `@media (hover: none)` override in CSS.
- Worker avatar initials: extract first letter of first + last name from Hebrew text. Handle single-name workers gracefully.
