# Story 4: Login Page Redesign

**Story ID**: DESIGN-V2-4
**Epic**: [Adama v2 Design System](./epic-adama-v2-design.md)
**Size**: Large
**Sprint**: 2
**Dependencies**: Story 1 (Design Foundation)

## Objective

Transform the login page from a simple centered card to a premium split-pane layout with a CSS-generated agricultural landscape on the left and a glass-morphism form card on the right.

## Reference

- **Mockup**: `design-mockups/direction-a-v2/login.html` (full file)
- **Current**: `app/[locale]/auth/login/page.tsx` + `components/login-form.tsx`

## Files to Modify

- `app/[locale]/auth/login/page.tsx` — new split-pane layout
- `components/login-form.tsx` — updated form styling

## Tasks

### 1. Split-Pane Layout

- Container: `min-height: 100vh`, flexbox, `direction: ltr` (panels are LTR, content is RTL)
- **Left panel** (58%): CSS agricultural landscape
- **Right panel** (42%): Login form on `var(--bg)` background

### 2. Left Panel: Agricultural Landscape

CSS-only illustration using layered pseudo-elements and divs:

- **Sky gradient**: `linear-gradient(180deg, #87CEEB 0% ... #1F2E10 100%)`
- **Sun glow**: `radial-gradient` circle, positioned top-right
- **Field rows**: repeating `linear-gradient(175deg, ...)` for plowed field texture
- **Hills silhouette**: two `radial-gradient` ellipses via `::before`/`::after`
- **Mist layer**: subtle horizontal gradient band
- **Vignette**: radial gradient darkening edges

**Logo placement**:
- `meshek-logo.jpeg` in a 160-180px cream circle with `next/image`
- Subtle glow animation: `box-shadow` pulse (4s ease-in-out infinite)
- Float animation: `translateY` oscillation (6s ease-in-out infinite)
- Brand name "משק פילצביץ'" below in white, 3rem, weight 800
- Subtitle "ניהול חקלאי חכם" below in lighter weight

### 3. Right Panel: Glass-Morphism Form Card

- Card: `max-width: 400px`, `backdrop-filter: blur(20px)`, `border-radius: var(--radius-xl)`
- Gradient accent line at top: `linear-gradient(90deg, primary, accent, accent-brown)`, 3px height
- Entry animation: `fadeSlideUp 0.8s` with 0.3s delay
- Shadow: `var(--shadow-xl)`

Form elements:
- **Title**: "כניסה למערכת" (h2, RTL)
- **Subtitle**: "הזינו את פרטי החשבון שלכם"
- **Email input**: 50px height, `var(--radius-md)`, focus ring with primary color
- **Password input**: same styling
- **Options row**: "זכור אותי" checkbox + "שכחת סיסמה?" link
- **Submit button**: full-width primary gradient, 50px height
- **Divider**: "או" with horizontal lines
- **Magic link button**: outlined style, full-width, mail icon
- **Register link**: "אין לך חשבון? הרשמה"

### 4. Preserve Auth Functionality

**Critical** — do NOT break any auth flows:
- Form submission → Supabase auth (email/password)
- Magic link flow → Supabase magic link
- Forgot password link → navigates to forgot-password page
- Sign-up link → navigates to sign-up page
- Error states (wrong password, network error) display correctly
- Redirect after successful login works

### 5. Mobile Responsive

- Below 900px: stack vertically (landscape on top, form below)
- Landscape panel: **max 180-200px height** on mobile (not 340px — don't push form below fold)
- Logo shrinks to 120-140px
- Card padding reduces
- Form must be visible without scrolling on standard mobile viewport (375x667)

## Status: done

## Acceptance Criteria

- [x] Split-pane layout renders correctly on desktop (1280px+)
- [x] Agricultural landscape displays with sky, hills, fields, mist, sun glow
- [x] Logo displays in glowing cream circle with float animation
- [x] Brand name and subtitle render below logo in white
- [x] Form card has glass-morphism effect with gradient top accent
- [x] All form inputs styled per mockup (50px height, focus rings)
- [x] Email/password login still works end-to-end
- [x] Magic link login still works end-to-end
- [x] Forgot password and sign-up links navigate correctly
- [x] Error states display correctly (wrong password, expired link)
- [x] Mobile: stacks vertically, landscape ≤ 200px, form visible without scroll
- [x] All cross-cutting ACs from epic (build, lint, RTL, logo)

## Code Review Notes (2026-03-12)

**Issues found and fixed:**
- H1: Added missing `@keyframes fadeSlideUp` and `@keyframes fadeIn` (card entry and brand animations were silently broken)
- H2: Fixed magic link error showing field label instead of error message — added `enterEmailFirst` i18n key
- M2: Removed non-functional "Remember me" checkbox (no backing implementation)
- M4: Hidden brand subtitle on mobile to prevent overflow in 200px max-height panel
- L1: Replaced hardcoded hex colors with CSS custom properties in card accent gradient

## Technical Notes

- **Performance**: The CSS landscape is paint-heavy. Test on Chrome DevTools paint profiler. If > 16ms per frame, simplify layers.
- **`backdrop-filter: blur(20px)`**: Test on Safari and mid-range Android. Consider fallback to `blur(8px)` if laggy.
- **Logo animations** (glow + float): use `will-change: transform, box-shadow` to hint GPU acceleration, but remove after animation settles to free memory.
- **RTL in LTR container**: The outer split-pane is LTR (left landscape, right form). Inner form elements must be explicitly `direction: rtl`. Test Hebrew text flow carefully.
- Don't base64-encode the logo — use `next/image` with static import or public path.
