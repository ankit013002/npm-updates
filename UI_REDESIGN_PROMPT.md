# UI Redesign Prompt — npm Package Update Tracker

## Context

This is a dark-themed web app (Next.js, Tailwind) for tracking npm package version updates. Users subscribe to packages and are notified when new versions are available. They can mark updates as "seen", bulk-import from a `package.json`, export/import their list, and read GitHub release notes with optional AI summaries. The current design is functional but flat and generic — no visual hierarchy, no depth, no motion, no brand identity.

---

## Current Structure

```
Header (sticky) — "npm tracker" title + refresh icon + settings gear
  └── SearchBar — text input to find and add packages
  └── BulkImport — collapsible section, paste/upload package.json
  └── DataPortability — export/import subscription list
  └── Section: "UPDATES AVAILABLE — N" (emerald) + [Mark all seen]
       └── PackageCard × N  (border-emerald, collapsed by default)
  └── Section: "UP TO DATE — N" (gray)
       └── PackageCard × N  (border-gray, collapsed by default)

PackageCard (collapsed):
  chevron | package-name | strikethrough-old-ver → v{new} NEW | "Checked Xm ago" | description
  right: [Mark seen] [✕]

PackageCard (expanded):
  description paragraph
  links: Homepage ↗  GitHub ↗  npm ↗
  "RECENT RELEASES" heading
  ReleaseRow × N:
    tag + date | [View ↗] [Summarize / ✦ AI Summary]
    AI Summary box (violet)
    release body (pre, line-clamp-6)

SettingsPanel — full-screen modal overlay, single password field for Claude API key
BulkImport — textarea + file upload + preview list + progress bar
```

---

## Design Goals

1. **Feel premium, not developer-tool generic.** Think Vercel dashboard, Linear, or Raycast — serious dark UI with purposeful use of color, space, and motion.
2. **Establish a clear visual hierarchy** so "packages with updates" demand attention and "up to date" recedes without disappearing.
3. **Make cards feel alive** — subtle hover states, smooth expand/collapse, version change animation.
4. **Reduce clutter** — current layout stacks SearchBar + BulkImport + DataPortability as three separate UI chunks; consolidate into a clean intake zone.

---

## Specific Design Requests

### Color & Theming

- Base: near-black background (`#0a0a0f` or similar, slightly cooler than pure gray)
- Introduce a **single accent color** for the brand — suggest a vivid indigo or electric blue (not the current emerald which is overused for both "update available" AND success states)
- Reserve **emerald/green** exclusively for "update available" signal
- Use **amber** for "breaking change" callouts in release notes
- Subtle radial gradient bloom behind the "updates available" section — like a soft green glow centered on the section header, very low opacity

### Header

- Add a **thin animated gradient border** on the bottom edge of the sticky header (not a solid line — use a left-to-right shimmer or a gradient from transparent → accent → transparent)
- Package count chip next to the title: `npm tracker  [12 packages]` as a small pill badge
- Replace the text gear/refresh icons with properly sized, stroked SVG icons with hover backgrounds that use the accent color at low opacity

### Search + Add Zone

- Replace the current simple input with a **command-palette–style input bar**: full-width, rounded-xl, prominent shadow, subtle background distinction from the page, with a magnifier icon on the left and a keyboard hint `↵ to add` on the right
- When the user types and results appear, show them as a floating dropdown with package name + npm description + weekly downloads — not a flat list
- BulkImport and DataPortability should collapse into a **secondary row of icon+text action chips** below the search bar: `[↑ Import package.json]  [⬇ Export list]  [⬆ Import list]` — small, ghost-style, no borders

### Package Cards — "Updates Available" Section

- These are the hero UI — give them presence
- Card background: very subtle emerald tint (`emerald-950/30`) with a **left border accent stripe** (3–4px, solid emerald-500) instead of a full border
- **Version change display**: show old → new as `18.2.0 → 18.3.1` with a `→` arrow, not strikethrough. Highlight only the differing segment of the version in emerald (e.g. if minor changed, the `3` is bright green)
- "NEW" badge: replace the uppercase text label with a small dot/pulse animation — a pulsing green dot (like a live indicator)
- "Mark seen" should be a more satisfying interaction — ghost button with emerald text that animates to a checkmark ✓ on click before the card transitions to the "up to date" section
- Hover state on the card: slight lift (`translateY(-1px)`) + shadow increase

### Package Cards — "Up to Date" Section

- These should be visually quieter — lower contrast text, no colored border
- Consider rendering them at ~85% visual weight compared to the update cards
- The "Checked X ago" timestamp should appear as a subtle monospace timestamp on the right, not just text

### Expanded Card

- The expand should animate smoothly with a height transition (not a snap)
- Release notes section: each release gets its own **mini timeline entry** — a vertical line on the left, dot at the top, tag + date inline, body below
- AI Summary box: instead of a flat violet box, use a subtle glassmorphism card — `backdrop-blur-sm`, thin translucent violet border, a small sparkle/star icon prefixing "AI Summary"
- "Summarize" button when Claude key is set should show `✦ AI Summary` with a subtle shimmer animation on hover

### Settings Panel

- Replace the full-screen modal with a **slide-in drawer from the right** (`translateX` transition)
- Sections: "AI Summaries" (API key field with masked input + test button), and a second section "About" with version/source link
- API key field: show a green checkmark indicator when a key is present

### BulkImport (expanded state)

- The progress bar should be thicker and use a **shimmer animation** (moving highlight from left to right) while importing, not just a static filled bar
- The preview list of packages should show them as small chips/tags, not a plain monospace list

### Empty State

- "No packages tracked yet" — redesign this as a centered **hero empty state** with:
  - A large, lightly-stroked npm logo or package box icon (SVG, not emoji)
  - Headline: "Nothing tracked yet"
  - Sub: "Search for a package above, or import your package.json"
  - A subtle dashed border box around the empty area

### Micro-interactions & Motion

- All card expand/collapse: `transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1)`
- Version badge updates: brief scale-up flash (scale 1 → 1.08 → 1 over 300ms) when data loads
- "Mark seen" confirmation: card border transitions from emerald → gray over 600ms as it moves sections
- Refresh button: rotates 360° on click

---

## Typography

- Keep monospace for package names and version strings (`font-mono`)
- Section headers: uppercase, tracked wide, smaller — more like a divider label than a heading
- Release body: use `font-mono text-[11px]` or switch to a sans-serif at `text-xs` — the current monospace pre-wrap on release notes is hard to read at scale

---

## What NOT to Change

- Keep it single-page (no multi-route navigation on web)
- Dark theme only — no light mode toggle needed
- No charts or graphs — this is a list app, keep it focused
- Don't add a sidebar — the max-w-3xl centered layout is good, just needs polish

---

## Deliverable

Produce updated Tailwind JSX for the main layout and the `PackageCard` component first (highest visual impact), then `SearchBar`, then `SettingsPanel`. Use Tailwind utility classes throughout; no external CSS. Assume `tailwindcss-animate` is available for keyframe animations.
