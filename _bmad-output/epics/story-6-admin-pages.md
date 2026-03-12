# Story 6: Admin Pages Consistent Styling

**Story ID**: DESIGN-V2-6
**Epic**: [Adama v2 Design System](./epic-adama-v2-design.md)
**Size**: Medium
**Sprint**: 3
**Dependencies**: Stories 2, 3 (Sidebar + TopBar shell in place)

## Objective

Apply consistent Adama v2 premium card styling, spacing, and typography across all 7 admin pages. No new functionality — pure visual consistency pass.

## Files to Modify

All under `app/[locale]/(admin)/admin/`:

1. `page.tsx` — Admin dashboard (health metrics)
2. `workers/page.tsx` — Worker management
3. `areas/page.tsx` — Area management
4. `crops/page.tsx` — Crop management
5. `equipment/page.tsx` — Equipment management
6. `payroll/page.tsx` — Payroll export
7. `review/page.tsx` — Attendance review queue

## Tasks

### 1. Consistent Card Wrapper Pattern

Every admin page's main content should be wrapped in:
```
bg-card rounded-xl shadow-md border border-border/40 overflow-hidden
```

Page headers: title (h1, 1.7rem, weight 700) + description in muted text + action button (if applicable).

### 2. Workers Page

- Table with worker avatar initials (32px circles, secondary bg)
- Premium card wrapper around table
- Status indicators for `is_active`
- Telegram ID binding shown in a monospace badge

### 3. Areas Page

- Card grid with hover lift (`hover:-translate-y-1 hover:shadow-lg transition`)
- Each area card: name, crop, active status
- Photo thumbnails if available

### 4. Equipment Page

- Same card grid treatment as Areas
- Name + active status

### 5. Crops Page

- Same card grid treatment
- Simple name display

### 6. Payroll Page

- Table with premium card wrapper
- Export button: primary gradient styling
- Date range selector matching filter bar style from Story 5

### 7. Review Page (Attendance Review Queue)

- Pending records table with status badges (reuse from Story 5)
- Action buttons for approve/reject
- Same row action pattern as attendance table (hover on desktop, visible on mobile)

### 8. Admin Dashboard (Health Metrics)

- Metrics cards in a grid layout
- Each card: icon, metric value (large bold number), label
- Color-coded: green for healthy, amber for warning, red for critical
- Premium card styling with shadow

## Acceptance Criteria

- [ ] All 7 admin pages use consistent card wrapper styling
- [ ] Tables have premium styling (shadow, rounded corners, sticky headers)
- [ ] Card grids have hover lift animations
- [ ] All CRUD operations still work on every page (create, read, update, delete where applicable)
- [ ] Status badges consistent with attendance table badges
- [ ] Spacing follows 8px grid system
- [ ] Logo visible in sidebar on all pages (cross-cutting AC)
- [ ] All cross-cutting ACs from epic (build, lint, RTL, responsive)

## Technical Notes

- This is the widest-touching story (7 pages). Work through them methodically — one at a time. Test CRUD on each page before moving to the next.
- Consider extracting a shared `<PageCard>` or `<AdminPageWrapper>` component if the pattern repeats identically across all pages. But only if it genuinely reduces duplication — don't abstract prematurely.
- Review page shares patterns with Story 5's attendance table. Reuse status badge and row action components.
