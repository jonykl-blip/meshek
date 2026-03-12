# Story 1: Design Foundation (Global Tokens & Font)

**Story ID**: DESIGN-V2-1
**Epic**: [Adama v2 Design System](./epic-adama-v2-design.md)
**Size**: Small
**Sprint**: 1
**Dependencies**: None

## Objective

Replace the default shadcn/ui design tokens and Geist font with the Adama v2 design system: Rubik font, earthy color palette, shadow/radius scales, and Tailwind extensions. This is the foundation everything else builds on.

## Files to Modify

- `app/layout.tsx` — font swap (Geist → Rubik)
- `globals.css` — CSS custom properties migration
- `tailwind.config.ts` — extend with new scales and animations

## Tasks

### 1. Font Swap: Geist → Rubik

In `app/layout.tsx`:
- Replace `Geist` import with `Rubik` from `next/font/google`
- Weights: 400, 500, 600, 700
- Subsets: `latin`, `latin-ext`
- CSS variable: `--font-rubik`
- Apply to `<body>` className

### 2. CSS Variable Migration in `globals.css`

Replace the current HSL-based `:root` block with Adama v2 hex values. **Critical**: shadcn/ui components consume these via `hsl(var(--primary))` etc. Two options:

**Option A (recommended)**: Keep HSL format but with Adama v2 colors converted to HSL:
- `--primary: 91 45% 33%` (≈ #5B7A2F)
- `--primary-foreground: 0 0% 100%`
- `--background: 33 27% 95%` (≈ #F8F5F0)
- `--foreground: 24 25% 12%` (≈ #251F19)
- `--card: 40 100% 98%` (≈ #FFFDF9)
- `--secondary: 33 22% 90%` (≈ #EDE8E0)
- `--muted: 24 8% 44%` (≈ #7A7168) — for muted-foreground
- `--accent: 24 67% 54%` (≈ #D9793A)
- `--border: 30 18% 84%` (≈ #DDD6CC)
- `--destructive: 4 70% 46%` (≈ #C0392B)

**Option B**: Switch to hex and update Tailwind config to not wrap in `hsl()`. More invasive.

Add new custom properties (not consumed by shadcn, used directly):
```css
--shadow-sm: 0 1px 3px rgba(37,31,25,0.04);
--shadow-md: 0 4px 16px rgba(37,31,25,0.06), 0 1px 3px rgba(37,31,25,0.04);
--shadow-lg: 0 8px 40px rgba(37,31,25,0.08), 0 2px 6px rgba(37,31,25,0.04);
--shadow-xl: 0 16px 56px rgba(37,31,25,0.12), 0 4px 12px rgba(37,31,25,0.06);
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 20px;
--radius-xl: 28px;
--sidebar-top: #3A5420;
--sidebar-bottom: #2E4318;
--ease: cubic-bezier(0.4, 0, 0.2, 1);
```

Status color tokens:
```css
--status-approved-bg: rgba(91,122,47,0.12);
--status-approved-text: #4A6526;
--status-pending-bg: rgba(196,155,48,0.12);
--status-pending-text: #9A7B25;
--status-rejected-bg: rgba(192,57,43,0.10);
--status-rejected-text: #A0312A;
--status-imported-bg: rgba(41,128,185,0.10);
--status-imported-text: #2471A3;
```

**Do NOT delete the `.dark` block** — update its values to roughly match or leave as-is.

### 3. Tailwind Config Extensions

In `tailwind.config.ts`, extend:

```ts
boxShadow: {
  sm: 'var(--shadow-sm)',
  md: 'var(--shadow-md)',
  lg: 'var(--shadow-lg)',
  xl: 'var(--shadow-xl)',
},
borderRadius: {
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  xl: 'var(--radius-xl)',
},
keyframes: {
  fadeSlideUp: {
    from: { opacity: '0', transform: 'translateY(20px)' },
    to: { opacity: '1', transform: 'translateY(0)' },
  },
  fadeIn: {
    from: { opacity: '0' },
    to: { opacity: '1' },
  },
},
animation: {
  'fade-slide-up': 'fadeSlideUp 0.5s var(--ease) both',
  'fade-in': 'fadeIn 0.3s var(--ease) both',
},
```

## Acceptance Criteria

- [ ] Rubik font renders on all pages (check via browser DevTools computed style)
- [ ] Rubik loads via `next/font/google` — no external `<link>` tags to Google Fonts
- [ ] All existing shadcn/ui components (Button, Input, Card, Badge, etc.) render with the new color palette — no broken styles
- [ ] Shadow utilities (`shadow-sm`, `shadow-md`, etc.) work in Tailwind classes
- [ ] Radius utilities (`rounded-sm`, `rounded-md`, etc.) work in Tailwind classes
- [ ] Animation utilities (`animate-fade-slide-up`, `animate-fade-in`) work
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] No visual regressions on existing pages (spot-check login, dashboard, admin)

## Technical Notes

- The HSL migration is the riskiest part. Test every shadcn component after the change.
- Keep `--radius: 0.5rem` as a fallback since some shadcn components reference it directly.
- Geist font package can remain in `package.json` — no need to uninstall unless doing cleanup.
