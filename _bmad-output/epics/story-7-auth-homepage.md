# Story 7: Auth Pages & Homepage Polish

**Story ID**: DESIGN-V2-7
**Epic**: [Adama v2 Design System](./epic-adama-v2-design.md)
**Size**: Medium
**Sprint**: 3
**Dependencies**: Stories 1, 4 (Foundation + Login for shared auth patterns)

## Objective

Apply Adama v2 styling to the remaining auth pages (sign-up, forgot-password, update-password, error) and polish the homepage with premium card styling and field gradient hero.

## Files to Modify

### Auth pages (under `app/[locale]/auth/`):
- `sign-up/page.tsx` (+ related form component)
- `forgot-password/page.tsx` (+ related form component)
- `update-password/page.tsx` (+ related form component)
- `error/page.tsx` (if exists)

### Homepage:
- `app/[locale]/page.tsx`

## Tasks

### 1. Auth Pages: Consistent Styling

Two options (choose based on complexity):

**Option A (simpler, recommended)**: Centered card with gradient top accent
- Cream background page
- Card: `max-width: 400px`, centered, `backdrop-filter: blur(20px)`, `rounded-xl`, `shadow-xl`
- Gradient accent line at top (matching login card)
- Logo above card: 80-100px `meshek-logo.jpeg` in cream circle
- Form inputs: same styling as login (50px height, focus rings)

**Option B (premium)**: Full split-pane layout matching login
- Reuses the landscape panel from Story 4
- More visually consistent but more code

For each auth page:
- **Sign-up**: email + password + confirm password fields, submit button, link to login
- **Forgot password**: email field, submit button, back to login link
- **Update password**: new password + confirm fields, submit button
- **Error**: error message display, back to login button

### 2. Preserve Auth Functionality

All auth flows must still work:
- Sign-up → creates account via Supabase
- Forgot password → sends reset email
- Update password → updates via Supabase
- Error display → shows appropriate messages
- Redirects work correctly

### 3. Homepage Redesign

Current homepage shows card grids for management, finance, and ops sections. Upgrade:

**Nav bar** (if not already present):
- Logo (36-40px) + brand name inline
- Auth buttons: "התחברות" (login) + "הרשמה" (sign-up)
- Transparent over hero, solid on scroll (if hero exists)

**Hero section** (optional, if adding):
- Earthy gradient background (using sidebar gradient colors)
- Large title + subtitle
- CTA button

**Feature card grid**:
- 3 sections: ניהול, כספים, דוחות ותפעול (existing structure)
- Cards: `var(--card)` bg, `rounded-xl`, `shadow-md`
- Hover: lift animation (`hover:-translate-y-1 hover:shadow-lg`)
- Accent top border on cards (3px gradient line)
- Icons for each card item

**Logo**:
- Must be visible on homepage — in nav bar and/or hero section
- Use `next/image` from `/images/meshek-logo.jpeg`

### 4. Authenticated vs Unauthenticated States

Homepage already shows different UI based on auth state. Ensure both states look polished:
- **Unauthenticated**: hero/welcome + login CTA
- **Authenticated**: feature card grid with navigation to admin/dashboard pages

## Acceptance Criteria

- [ ] Sign-up page styled with Adama v2 card pattern, form works
- [ ] Forgot-password page styled, reset email sends correctly
- [ ] Update-password page styled, password update works
- [ ] Error page styled with consistent card
- [ ] Homepage shows logo in nav/hero area
- [ ] Feature cards have premium styling with hover lift
- [ ] Auth buttons in homepage nav are styled per Adama v2
- [ ] Full user flow works: homepage → login → dashboard → admin → logout → homepage
- [ ] Mobile responsive for all pages
- [ ] All cross-cutting ACs from epic (build, lint, RTL, logo)

## Technical Notes

- Auth pages share a lot of styling. Consider a shared `<AuthCard>` wrapper component that provides the card shell + logo + gradient accent line. Each page just provides form content as children.
- Homepage card grid: the existing structure with 3 sections is good. This is primarily a CSS/class upgrade, not a restructure.
- If Option A is chosen for auth pages, it's much simpler than the login's split-pane. Reserve the split-pane for login only — it's the first impression page.
