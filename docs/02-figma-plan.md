# Baiolo — Figma File Plan (Etap 2)

## File

**Baiolo Design System & Screens** — Figma Design

## Pages / sections

| Page | Purpose |
|------|---------|
| 00 — Cover & Moodboard | Brand story, mood refs, art direction |
| 01 — Foundations | Color, type, grid, spacing, elevation, icons, motion |
| 02 — Components | Buttons, inputs, cards, nav, pills, reactions, etc. |
| 03 — Screens Desktop | All P0 screens @ 1440 |
| 04 — Screens Mobile | All P0 screens @ 390 |
| 05 — Prototype | Linked flows (Explore, Create, Onboard, React) |
| 06 — Handoff | Tokens, spacing map, component states, impl notes |

---

## 00 — Cover & Moodboard

Frames:
- `Cover` — logo wordmark, tagline, file version
- `Moodboard` — magic playground refs (soft fantasy, Nintendo warmth, Duolingo clarity, Roblox discoverability — Baiolo warmer)
- `Art Direction` — do / don’t, illustration language (clouds, stars, soft glows, islands, portals — orderly, not chaotic)

---

## 01 — Foundations

### Color tokens
| Token | Role | Direction |
|-------|------|-----------|
| `bg/canvas` | Page background | Warm cream |
| `bg/surface` | Cards / panels | Soft white |
| `bg/lilac` | Soft accent surface | Pastel lilac |
| `bg/mint` | Soft accent surface | Soft turquoise |
| `brand/primary` | Primary actions | Lilac / soft violet |
| `brand/secondary` | Secondary accents | Soft turquoise |
| `accent/sun` | Highlights, sparkles | Sunny yellow |
| `accent/coral` | Secondary highlight | Coral pink |
| `text/primary` | Body & titles | Deep navy-violet |
| `text/muted` | Secondary | Soft slate-violet |
| `text/on-brand` | On filled buttons | White / cream |
| `border/subtle` | Dividers | Soft lilac-gray |
| `state/success` | Positive | Soft green |
| `state/warning` | Caution | Soft amber |
| `state/danger` | Errors / report | Soft coral-red |
| `focus/ring` | Focus | High-contrast violet |

### Typography
| Style | Use | Notes |
|-------|-----|-------|
| `display` | Hero / brand | Soft rounded display, fairy-tale hint |
| `h1`–`h3` | Page / section titles | Friendly, large |
| `body/lg` | Key copy | ≥18px |
| `body/md` | Default | ≥16px |
| `label` | Buttons, nav, pills | Medium weight, clear |
| `caption` | Meta, counters | Still readable |

**Fonts (proposed):** Nunito (display/UI) + Source Sans 3 or similar for long body if needed — avoid Inter/Roboto/system.

### Grid & spacing
- Desktop: 12-col, max content 1120–1200, margin 80
- Mobile: 4-col, margin 20
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64
- Touch targets: min 44×44

### Radius & elevation
- `radius/sm` 8 · `md` 16 · `lg` 24 · `xl` 32 · `pill` 999
- Soft toy-like shadows (1–3 levels), no harsh multi-layer cyber glow

### Icon style
- Rounded, filled-outline hybrid, 24/32 sizes
- Always paired with text labels in nav

### Motion rules
- Card hover: gentle lift 4–6px
- Reaction: soft bounce + spark
- Screen transitions: soft fade/slide ≤300ms
- Respect `prefers-reduced-motion`

---

## 02 — Components

| Component | Variants / states |
|-----------|-------------------|
| `Button` | Primary, Secondary, Ghost, Destructive · Default / Hover / Active / Focus / Disabled · sizes L/M |
| `IconButton` | Labeled preferred; icon-only only with aria |
| `Input` | Text, search, textarea · Default / Focus / Error / Disabled |
| `Select / CategoryPill` | Default / Selected |
| `FilterPill` | All, Game, Tool, Experiment, Demo |
| `ProjectCard` | Thumbnail, title, tag, creator, type, Play, reaction teaser |
| `ReactionChip` | Fun / Interesting / Would use again · idle / selected |
| `Nav / BottomNav` | Explore, Create, My Projects, Profile · active |
| `ProgressSteps` | Upload wizard 1–6 |
| `Avatar` | Style options for onboarding |
| `StatTile` | Plays, reactions (dashboard — light, not analytics-heavy) |
| `Toast / Banner` | Success, helper, error (friendly copy) |
| `EmptyState` | Explore empty, no projects yet |
| `ReportControl` | Report project |

---

## 03 / 04 — Screens (Desktop 1440 + Mobile 390)

### Landing
- Hero: brand Baiolo dominant + claim + CTA + full-bleed fantasy world visual
- How it works (3 steps)
- Sample projects
- For creators / for testers
- CTA + footer

Claim: **Baiolo is a playful place to share prototypes, test ideas, and find what people love.**

### Explore
- Search + filter pills
- Project card grid
- Optional featured strip (P1 — light stub ok)

### Project
- Cover, Play, description
- Reactions + short feedback
- Plays / reactions counts
- Report
- More like this

### Upload wizard (v2)
1 Choose type (ZIP / link / starter) → 2 Add files or link (+ packaging helper) → 3 Title + description → 4 Category → 5 Thumbnail → 6 Review → 7 Submit for checking  
Auto-save draft. Submit ≠ publish.

### Dashboard (My Projects)
- Project list with plays + reactions
- **Submission status** per project (friendly lifecycle copy)
- “What’s doing best”
- Soft tip: “Want to show something new?” / **Add your project**

### Moderation / admin queue (v2)
- Queue list, risk filters, AI flags, preview
- Actions: Approve / Reject / Ask for changes / Escalate

### Onboarding
- Create / Explore / Both → avatar → 2–3 interests → enter

### Profile (basic)
- Avatar, name, short bio, projects grid

### Auth (simple)
- Magic link / simple email entry

---

## 05 — Prototype flows

1. Landing → Explore → Project → Play → React
2. Landing → Create → Upload wizard → Success → Dashboard
3. Onboarding path
4. Report project

---

## 06 — Handoff

- Token table (CSS variable names)
- Component inventory + states
- Spacing / type scale
- Copy bank (friendly errors)
- A11y notes (contrast, focus, reduced motion)
- Stack note: Next.js + TS + Tailwind + Supabase (post-approval)

---

## Build gate

**No front-end implementation until this Figma direction is approved.**
