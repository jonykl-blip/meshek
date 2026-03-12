# Story 2: Sidebar Redesign

**Story ID**: DESIGN-V2-2
**Epic**: [Adama v2 Design System](./epic-adama-v2-design.md)
**Size**: Medium
**Sprint**: 1
**Dependencies**: Story 1 (Design Foundation)

## Objective

Upgrade the existing sidebar (`components/sidebar-nav.tsx` + `components/app-sidebar.tsx`) to match the Adama v2 dashboard mockup: noise texture overlay, user avatar section, polished nav items with animated active states, improved KPI pills, and footer link.

## Reference

- **Mockup**: `design-mockups/direction-a-v2/dashboard.html` — sidebar section (lines 92–314)
- **Current**: `components/sidebar-nav.tsx` — already has green gradient + KPI pills

## Files to Modify

- `components/sidebar-nav.tsx` — main styling changes
- `components/app-sidebar.tsx` — may need to pass user info for avatar

## Tasks

### 1. Logo in Sidebar Header

- Display `meshek-logo.jpeg` via `next/image` in a 52-56px circle
- **Cream/white background ring** around the logo for contrast against green gradient
- Style: `border: 2.5px solid rgba(107,140,62,0.6)`, `box-shadow: 0 3px 16px rgba(0,0,0,0.2)`
- Brand name "משק פילצביץ'" below logo in white
- Divider line below

### 2. Noise Texture Overlay

- Add `::after` pseudo-element with SVG `feTurbulence` noise texture (from mockup)
- `opacity: 0.035`, `pointer-events: none`
- Implementation: use Tailwind `after:` utilities or a separate CSS class

### 3. User Avatar Section

- Display user initials in a 40px accent-gradient circle
- Show user name (bold) and role badge (e.g., "בעלים") with gold-on-amber pill styling
- Data comes from authenticated user profile (already available via Supabase auth)

### 4. KPI Pills Polish

- Add colored dots (7px circles) before each KPI text
- Amber dot for pending, green for approved, red for anomalies
- Subtle hover background transition on each pill

### 5. Nav Items: Active State Animation

- Active item: `background: rgba(255,255,255,0.13)`, `border-right: 3px solid var(--accent)`
- Active indicator dot: 6px accent circle with `box-shadow: 0 0 8px rgba(217,121,58,0.5)` glow
- Hover: `background: rgba(255,255,255,0.08)`, text turns white
- Smooth transitions: `transition: all 0.2s var(--ease)`

### 6. Footer Link

- Add "עזרה ותמיכה" link at sidebar bottom
- Styled with `border-top: 1px solid rgba(255,255,255,0.08)`
- Subtle text color with hover brightening

### 7. Verify Collapsed State

- If sidebar has a collapsed/mobile state, ensure it still works after all changes
- Mobile breakpoint (< 900px): sidebar stacks horizontally or hides behind a toggle

## Acceptance Criteria

- [ ] Logo displays clearly in sidebar header with cream background ring — not lost against green
- [ ] User name and role badge render correctly from auth data
- [ ] KPI pills show colored dots and correct counts
- [ ] Active nav item has accent border + glowing dot indicator
- [ ] Nav hover transitions are smooth (no jank)
- [ ] Footer "עזרה ותמיכה" link renders at bottom
- [ ] Sidebar looks correct on mobile breakpoint
- [ ] Noise texture is subtle and doesn't cause GPU compositing issues
- [ ] All cross-cutting ACs from epic (build, lint, responsive, RTL)

## Technical Notes

- The noise texture SVG may need testing on mid-range Android devices. If it causes performance issues, reduce opacity or remove.
- User info for avatar: check what's available from Supabase auth session vs. profiles table. May need a lightweight server-side fetch.
- `z-index: 1` on content elements is needed to render above the noise `::after` overlay.
