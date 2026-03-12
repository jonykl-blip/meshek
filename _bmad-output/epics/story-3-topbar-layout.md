# Story 3: Top Bar & Layout Shell

**Story ID**: DESIGN-V2-3
**Epic**: [Adama v2 Design System](./epic-adama-v2-design.md)
**Size**: Medium
**Sprint**: 1
**Dependencies**: Story 1 (Design Foundation)

## Objective

Create a new TopBar component with breadcrumbs, notification bell, and user menu. Integrate it into the admin and dashboard layouts between sidebar and content area.

## Reference

- **Mockup**: `design-mockups/direction-a-v2/dashboard.html` — topbar section (lines 324–413)

## Files to Create / Modify

- **Create**: `components/topbar.tsx`
- **Modify**: `app/[locale]/(admin)/admin/layout.tsx` — add TopBar
- **Modify**: `app/[locale]/(dashboard)/dashboard/page.tsx` — add TopBar (or its layout)

## Tasks

### 1. Create `components/topbar.tsx`

A sticky top bar with:

- **Height**: 56px
- **Background**: `rgba(255,253,249,0.85)` with `backdrop-blur-md` (Tailwind utility handles vendor prefix)
- **Border bottom**: 1px solid border color
- **Sticky**: `position: sticky; top: 0` (no direction-bar in production)
- **z-index**: 40

Contents (right-to-left for RTL):
- **Breadcrumbs**: "ראשי / [current page name]" — derive from route or accept as prop
- **Spacer** (flex-1)
- **Notification bell**: icon button with red badge count (hardcoded or from KPI data)
- **User avatar + dropdown arrow**: initials circle + chevron down

### 2. Breadcrumb Logic

Keep it simple — accept `pageName` as a prop:
```tsx
<TopBar pageName="נוכחות" />
```
Renders: `ראשי / נוכחות` where "ראשי" links to home and current page is bold.

Do NOT over-engineer with route parsing. Simple prop is sufficient for V1.

### 3. Notification Bell

- Use Lucide `Bell` icon (already in project dependencies)
- Red badge: absolute positioned, 16px circle, `#E05C4D` background
- Badge count: accept as prop, default to 0 (hidden when 0)
- Click handler: placeholder (no notification system yet)

### 4. User Menu

- Initials avatar (32px, accent gradient) + dropdown arrow
- Click handler: placeholder (no dropdown menu yet)
- User initials from auth context

### 5. Integrate into Layouts

- Add `<TopBar>` to admin layout and dashboard layout
- Position between sidebar and main content
- Ensure it doesn't conflict with existing sticky elements

## Acceptance Criteria

- [ ] TopBar renders on all admin and dashboard pages
- [ ] Breadcrumbs show current page name correctly
- [ ] Notification bell displays with badge (when count > 0)
- [ ] User avatar shows initials from authenticated user
- [ ] TopBar stays sticky on scroll with backdrop blur effect
- [ ] No conflicts with sidebar z-index or positioning
- [ ] Responsive: on mobile, topbar is full-width above content
- [ ] All cross-cutting ACs from epic (build, lint, RTL, responsive)

## Technical Notes

- `backdrop-filter` needs `-webkit-` prefix for Safari. Tailwind's `backdrop-blur-*` handles this automatically — use it instead of raw CSS.
- The mockup's `top: 52px` accounts for a direction-bar that won't exist in production. Use `top: 0`.
- Breadcrumb could later be enhanced with `usePathname()` for auto-derivation, but a simple prop is fine for now.
