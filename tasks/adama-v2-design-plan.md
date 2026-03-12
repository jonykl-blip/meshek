# Adama v2 Design Implementation Plan

**Goal**: Apply the premium enterprise Adama v2 design from `design-mockups/direction-a-v2/` across the entire Meshek Next.js application.

**Reference mockups**: `design-mockups/direction-a-v2/login.html`, `design-mockups/direction-a-v2/dashboard.html`

**Current state**: Colors already match. Components and pages exist. Main work is styling upgrades.

---

## Phase 1: Design Foundation (Global Tokens & Font)

**Files**: `globals.css`, `tailwind.config.ts`, `app/layout.tsx`

1. **Switch font from Geist to Rubik** (Google Fonts)
   - Update `app/layout.tsx` — replace Geist import with Rubik (weights: 400, 500, 600, 700)
   - Update `tailwind.config.ts` fontFamily to use Rubik
   - Remove Geist font package if unused elsewhere

2. **Extend CSS custom properties in `globals.css`**
   - Add shadow scale: `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl`
   - Add radius scale: `--radius-sm: 8px`, `--radius-md: 12px`, `--radius-lg: 20px`, `--radius-xl: 28px`
   - Add sidebar vars: `--sidebar-top: #3A5420`, `--sidebar-bottom: #2E4318`
   - Add transition easing: `--ease: cubic-bezier(0.4, 0, 0.2, 1)`

3. **Add Tailwind extensions** in `tailwind.config.ts`
   - Map shadow scale to Tailwind utilities
   - Map radius scale
   - Add animation utilities (fadeSlideUp, fadeIn)

**Verification**: Run `npm run build` — no errors. Open any page — Rubik font renders.

---

## Phase 2: Sidebar Redesign

**Files**: `components/sidebar-nav.tsx`, `components/app-sidebar.tsx`

Current sidebar at `components/sidebar-nav.tsx` already has green gradient and KPI pills. Upgrade to match mockup:

1. **Add noise texture overlay** (SVG data URI background)
2. **Add user avatar section** with initials circle, name, role badge ("בעלים")
3. **Polish nav items**: animated active indicator (accent dot + right border transition)
4. **Improve KPI pills**: colored dots instead of text-only
5. **Add footer**: "עזרה ותמיכה" link at bottom
6. **Verify collapsed state** still works after changes

**Verification**: Navigate between admin pages. Sidebar highlights correct item. Collapsed/expanded states work. KPIs render correctly.

---

## Phase 3: Top Bar & Layout Shell

**Files**: `app/[locale]/(admin)/admin/layout.tsx`, `app/[locale]/(dashboard)/dashboard/page.tsx`, new `components/topbar.tsx`

1. **Create `components/topbar.tsx`**
   - Breadcrumbs (dynamic from route)
   - Notification bell with badge count
   - User avatar + dropdown arrow
   - Sticky positioning with backdrop blur

2. **Update admin and dashboard layouts** to include TopBar between sidebar and content

**Verification**: Navigate across pages. Breadcrumbs update. Top bar stays sticky on scroll.

---

## Phase 4: Login Page Redesign

**Files**: `app/[locale]/auth/login/page.tsx`, `components/login-form.tsx`

This is the biggest visual change — from centered card to split-pane layout:

1. **Split layout**: 58% left (landscape) / 42% right (form)
2. **Left panel**: CSS-generated agricultural landscape (sky gradients, hills, field rows, sun glow, mist). Logo in glowing circle. Brand name + subtitle in white.
3. **Right panel**: Glass-morphism card with gradient top accent line
4. **Form fields**: Email, password, remember me checkbox, forgot password link
5. **Buttons**: Primary "התחברות", magic link "שליחת קישור כניסה למייל"
6. **Mobile**: Stack vertically, shorter landscape panel

**Verification**: Open login page desktop + mobile. Logo renders. Form submits to Supabase auth correctly. Magic link flow still works.

---

## Phase 5: Dashboard / Attendance Page

**Files**: `app/[locale]/(dashboard)/dashboard/page.tsx`, `components/attendance/*`

1. **Anomaly panel** (`components/attendance/anomaly-panel.tsx`)
   - Add "התראות" title header
   - Premium card styling with rounded corners, shadow

2. **Filter bar** (`components/attendance/attendance-filters.tsx`)
   - Secondary background, rounded, border
   - Improved input/select styling

3. **Attendance table** (`components/attendance/attendance-table.tsx`)
   - Worker avatar initials circles
   - Sticky header with backdrop blur
   - Slide-in row action buttons on hover
   - Premium card wrapper with shadow
   - Status badges: refined pill styling

**Verification**: Table renders with real data. Filters work. Row actions (approve/reject/edit) still functional. Status badges display correctly for all 4 states.

---

## Phase 6: Admin Pages Styling

**Files**: All `app/[locale]/(admin)/admin/*/page.tsx` (7 pages)

Apply consistent card styling, spacing, and typography across:

1. **Workers page** — table with avatar initials, premium card wrapper
2. **Areas page** — card grid with hover lift
3. **Equipment page** — same card treatment
4. **Crops page** — same card treatment
5. **Payroll page** — table + export button styling
6. **Review page** — pending records with status badges
7. **Admin dashboard** — health metrics cards

Each page: wrap in premium card, apply shadow scale, consistent spacing (8px grid), status badges where applicable.

**Verification**: Navigate all 7 admin pages. Data loads correctly. CRUD operations still work. Responsive on mobile.

---

## Phase 7: Auth Pages & Homepage Polish

**Files**: Auth pages (sign-up, forgot-password, update-password, error), homepage

1. **Auth pages** (sign-up, forgot-password, update-password):
   - Apply same split-pane layout as login OR simpler centered card with gradient top accent
   - Consistent form styling

2. **Homepage** (`app/[locale]/page.tsx`):
   - Nav bar with logo + auth buttons
   - Hero section with field gradient background
   - Feature card grid with hover lift, accent top border
   - Sections: ניהול, כספים, דוחות ותפעול

3. **Error pages**: Consistent card styling

**Verification**: Full user flow: homepage → login → dashboard → admin pages. All transitions smooth. No broken layouts.

---

## Out of Scope

- Dark mode (defer — Adama v2 is light-theme only)
- Thai localization styling (Phase 2 of product)
- New features or functionality — this is styling only
- Component showcase HTML mockup (not needed for production)

---

## Dev Sequence Summary

| # | Phase | Est. Scope | Dependencies |
|---|-------|-----------|-------------|
| 1 | Design Foundation | Small | None |
| 2 | Sidebar Redesign | Medium | Phase 1 |
| 3 | Top Bar & Layout | Medium | Phase 1 |
| 4 | Login Redesign | Large | Phase 1 |
| 5 | Dashboard/Attendance | Medium | Phase 2, 3 |
| 6 | Admin Pages | Medium | Phase 2, 3 |
| 7 | Auth & Homepage | Medium | Phase 1, 4 |

Phases 2, 3, 4 can be parallelized after Phase 1.
Phases 5, 6 can be parallelized after Phases 2+3.
