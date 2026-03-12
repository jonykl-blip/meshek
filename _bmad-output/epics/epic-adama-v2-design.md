# Epic: Adama v2 Design System Implementation

**Epic ID**: DESIGN-V2
**Status**: Ready for Development
**Type**: Styling / Visual Refresh (no new functionality)

## Goal

Apply the premium enterprise "Adama v2" design from `design-mockups/direction-a-v2/` across the entire Meshek Next.js application. This is a pure styling pass — zero feature changes, zero schema changes.

## Reference Artifacts

- **Dashboard mockup**: `design-mockups/direction-a-v2/dashboard.html`
- **Login mockup**: `design-mockups/direction-a-v2/login.html`
- **Implementation plan**: `tasks/adama-v2-design-plan.md`
- **Logo**: `public/images/meshek-logo.jpeg` (must appear on every page)

## Design System Summary

| Token | Value |
|-------|-------|
| Font | Rubik (400, 500, 600, 700) via `next/font/google` |
| Background | `#F8F5F0` |
| Foreground | `#251F19` |
| Primary | `#5B7A2F` (dark: `#4A6526`, light: `#6B8C3E`) |
| Accent | `#D9793A` |
| Secondary | `#EDE8E0` |
| Muted | `#7A7168` |
| Border | `#DDD6CC` |
| Card | `#FFFDF9` |
| Sidebar gradient | `#3A5420` → `#2E4318` |
| Radius scale | sm: 8px, md: 12px, lg: 20px, xl: 28px |
| Shadow scale | sm/md/lg/xl (see mockup `:root`) |
| Easing | `cubic-bezier(0.4, 0, 0.2, 1)` |

## Cross-Cutting Acceptance Criteria

These apply to **every story** in this epic:

- **AC-LOGO**: `meshek-logo.jpeg` is visible and properly positioned on every page. Uses `next/image` from `/images/meshek-logo.jpeg`. Displayed on a light/cream background container for contrast against dark backgrounds. Never cropped or distorted. Uses `object-fit: contain`.
- **AC-RTL**: All layouts maintain correct RTL behavior for Hebrew. No direction inheritance bugs.
- **AC-BUILD**: `npm run build` passes with zero errors after each story.
- **AC-LINT**: `npm run lint` passes after each story.
- **AC-RESPONSIVE**: Pages render correctly on mobile (375px), tablet (768px), and desktop (1280px+).
- **AC-FONT**: Rubik font loads via `next/font/google` (self-hosted, not external `<link>`).
- **AC-NO-FEATURE-CREEP**: No new features, no functionality changes. Styling only.

## Stories

| # | Story | Size | Dependencies | Sprint |
|---|-------|------|-------------|--------|
| 1 | [Design Foundation](./story-1-design-foundation.md) | Small | None | 1 |
| 2 | [Sidebar Redesign](./story-2-sidebar-redesign.md) | Medium | Story 1 | 1 |
| 3 | [Top Bar & Layout Shell](./story-3-topbar-layout.md) | Medium | Story 1 | 1 |
| 4 | [Login Page Redesign](./story-4-login-redesign.md) | Large | Story 1 | 2 |
| 5 | [Dashboard & Attendance](./story-5-dashboard-attendance.md) | Medium | Stories 2, 3 | 2 |
| 6 | [Admin Pages Styling](./story-6-admin-pages.md) | Medium | Stories 2, 3 | 3 |
| 7 | [Auth Pages & Homepage](./story-7-auth-homepage.md) | Medium | Stories 1, 4 | 3 |

## Sprint Plan

- **Sprint 1**: Stories 1 + 2 + 3 — Foundation + shell (sidebar + topbar)
- **Sprint 2**: Stories 4 + 5 — Login + dashboard (highest-impact pages)
- **Sprint 3**: Stories 6 + 7 — Admin pages + remaining auth/homepage

## Key Technical Decisions (from team review)

1. **HSL → Hex migration**: Current shadcn/ui variables use HSL format. Must migrate to hex-based values while keeping shadcn component compatibility.
2. **Don't delete `.dark` block** in `globals.css` — update values or leave as-is. Dark mode is out of scope but don't break the infrastructure.
3. **Mobile touch support**: Hover-reveal patterns (row actions) must have `@media (hover: none)` fallbacks showing actions by default on touch devices.
4. **`backdrop-filter` performance**: Use Tailwind's `backdrop-blur-*` utilities (handles vendor prefixes). Test on mid-range devices.
5. **Logo via `next/image`**: Always use the static file, never base64 inline. Always on cream/light background for contrast.

## Out of Scope

- Dark mode
- Thai localization styling
- New features or functionality
- Component showcase / design system documentation
