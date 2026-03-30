

## Plan: Apply Two-Line Brand Lockup to Navigation.tsx

### Change
Replace line 83 in `src/components/Navigation.tsx`:

```tsx
<span className="text-xl font-bold text-foreground">Dream Alchemist</span>
```

With a stacked two-line lockup:

```tsx
<div className="flex flex-col items-start leading-tight">
  <span className="text-lg sm:text-xl font-bodoni-heading uppercase tracking-[0.15em] text-foreground">
    Dream Alchemist
  </span>
  <span className="text-[10px] sm:text-xs text-muted-foreground/60 tracking-[0.3em] w-full text-center select-none">
    ───── ☾ ─────
  </span>
</div>
```

### Details
- **Line 1**: `font-bodoni-heading`, uppercase, wide letter-spacing (`tracking-[0.15em]`), responsive text size
- **Line 2**: Small decorative crescent line, muted color at 60% opacity, extra-wide tracking, centered
- **Container**: `flex-col` with `items-start` and `leading-tight` for compact vertical stacking
- Logo icon unchanged, parent `flex items-center` keeps vertical alignment
- Only `src/components/Navigation.tsx` modified (line 83 replacement)

