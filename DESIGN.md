---
name: Baiolo
description: Share little ideas. See which ones grow.
colors:
  wonder-purple: "#8b5cf6"
  wonder-purple-deep: "#6d28d9"
  fresh-mint: "#2dd4bf"
  fresh-mint-deep: "#0f766e"
  sun-gold: "#fbbf24"
  coral-pop: "#ff6b4a"
  warm-cream: "#fff8ef"
  paper-white: "#ffffff"
  apricot-wash: "#ffe6c2"
  lilac-wash: "#e0cfff"
  mint-wash: "#b8fff3"
  sun-wash: "#ffe14d"
  midnight-ink: "#1e1b4b"
  dusk-ink: "#5b53a0"
  haze-ink: "#7c75a8"
  lilac-line: "#ddd6fe"
  lilac-line-strong: "#c4a1ff"
  focus-lilac: "#a78bfa"
  success-green: "#22c55e"
  warning-amber: "#f59e0b"
  danger-red: "#ef4444"
typography:
  display:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1.25
  title:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.25
  body:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.5
  body-large:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.55
  label:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    letterSpacing: "0.025em"
rounded:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  3xl: "48px"
  4xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.wonder-purple}"
    textColor: "{colors.paper-white}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.wonder-purple-deep}"
    textColor: "{colors.paper-white}"
  button-primary-large:
    backgroundColor: "{colors.wonder-purple}"
    textColor: "{colors.paper-white}"
    typography: "{typography.body-large}"
    rounded: "{rounded.pill}"
    padding: "0 28px"
    height: "56px"
  button-secondary:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.wonder-purple-deep}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.lilac-wash}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.dusk-ink}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  button-destructive:
    backgroundColor: "{colors.danger-red}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  filter-pill:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.dusk-ink}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "44px"
  filter-pill-active:
    backgroundColor: "{colors.wonder-purple}"
    textColor: "{colors.paper-white}"
  reaction-chip:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.midnight-ink}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  tag:
    backgroundColor: "{colors.lilac-wash}"
    textColor: "{colors.wonder-purple-deep}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  status-badge:
    backgroundColor: "{colors.lilac-wash}"
    textColor: "{colors.wonder-purple-deep}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "32px"
  card-project:
    backgroundColor: "{colors.paper-white}"
    rounded: "{rounded.xl}"
    padding: "20px"
  input-field:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.midnight-ink}"
    rounded: "{rounded.pill}"
    padding: "0 20px"
    height: "48px"
  textarea:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.midnight-ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
  nav-bottom-item-active:
    backgroundColor: "{colors.lilac-wash}"
    textColor: "{colors.wonder-purple-deep}"
    rounded: "{rounded.lg}"
    height: "56px"
---

# Design System: Baiolo

## Overview

**Creative North Star: "The Sunlit Sandbox"**

Baiolo looks like a warm, sunlit playground made of soft shapes. The page itself is warm cream, never white or grey, and everything placed on it — cards, buttons, chips — is a rounded white or tinted object that seems to float a few millimetres above the sand on a soft violet-tinted shadow. Colour arrives in bright, friendly accents (Wonder Purple for action, Fresh Mint, Sun Gold and Coral Pop for moments of delight) against large calm areas of cream and pastel washes.

Interaction is soft and springy. Buttons are full pills, cards lift a few pixels when you reach for them, reactions do a small bounce when tapped, and hero objects drift gently. Motion confirms that something is alive and touchable; it never performs for its own sake, and it switches off entirely under reduced motion.

It is a magical playground, not a preschool app and not enterprise SaaS. One rounded sans (Nunito) in heavy weights carries the whole voice; there are no hairline UI chrome, dense tables or corporate greys in the creator- and explorer-facing surfaces.

**Key Characteristics:**
- Warm cream canvas with white, floating, generously rounded surfaces.
- Wonder Purple as the single action colour; Fresh Mint, Sun Gold and Coral Pop as supporting accents.
- Nunito at 700–800 for anything that should be read at a glance.
- Pills everywhere you tap; large radii (24–32px) on containers.
- Diffuse violet-tinted shadows; hover lifts by 2–4px.
- Large touch targets (44px minimum, 56px for primary and nav).

## Colors

Bright, sunny accents over warm cream and pastel washes, held together by deep indigo ink.

### Primary
- **Wonder Purple** (#8b5cf6): the action colour. Primary buttons, active filter pills, step numbers, the "would use again" reaction, focus accents. If it is purple and filled, it is tappable.
- **Wonder Purple Deep** (#6d28d9): hover state of primary buttons, the wordmark, active navigation labels, text on lilac washes (tags, status badges, secondary buttons).

### Secondary
- **Fresh Mint** (#2dd4bf): the "interesting" reaction accent and secondary highlights.
- **Fresh Mint Deep** (#0f766e): text on Mint Wash (the in-review status, plan labels in the header).

### Tertiary
- **Sun Gold** (#fbbf24): the "fun" reaction accent and warm highlights.
- **Coral Pop** (#ff6b4a): saved/favourite state (filled heart and border) and small decorative sparks.

### Neutral
- **Warm Cream** (#fff8ef): the page canvas everywhere. Also the fill of cards that sit on a white band.
- **Paper White** (#ffffff): cards, buttons, inputs, chips, header and bottom nav surfaces.
- **Apricot Wash** (#ffe6c2): muted fills such as the draft status.
- **Lilac Wash** (#e0cfff): the most common tint. Hover fills, active bottom-nav item, tags, hero panel backdrop, landing gradient.
- **Mint Wash** (#b8fff3): landing gradient and in-review status fill.
- **Sun Wash** (#ffe14d): the floating sun motif and the selected "fun" reaction fill.
- **Midnight Ink** (#1e1b4b): primary text and headings (15:1 on Warm Cream).
- **Dusk Ink** (#5b53a0): secondary text, captions, inactive nav, card metadata.
- **Haze Ink** (#7c75a8): placeholder text only.
- **Lilac Line** (#ddd6fe): default borders and dividers, inactive chip and input outlines.
- **Lilac Line Strong** (#c4a1ff): secondary-button border and hover outlines.
- **Focus Lilac** (#a78bfa): the 3px focus ring.
- **Success Green** (#22c55e), **Warning Amber** (#f59e0b), **Danger Red** (#ef4444): status fills at 15–25% opacity behind Midnight Ink text, and the destructive button.

**The Cream, Never Grey Rule.** The canvas is Warm Cream and surfaces are Paper White or a pastel wash. Neutral greys do not appear; every "neutral" is tinted violet or warm.

**The One Action Colour Rule.** Filled Wonder Purple means "tap me". Do not use it for decoration, large backgrounds or non-interactive emphasis.

**The Wash Behind Ink Rule.** Pastel washes carry Midnight Ink or a Deep accent, never white text.

## Typography

**Display Font:** Nunito (with system-ui, sans-serif), loaded at 500, 600, 700 and 800 with Latin Extended for Polish.

**Character:** A single rounded sans used heavily. Its round terminals echo the pill shapes; extra-bold weights make headings feel chunky and friendly rather than editorial.

### Hierarchy
- **Display** (800, 3rem / 2.25rem on mobile, line-height 1, tight tracking): the landing wordmark-scale claim only. Set in Wonder Purple Deep.
- **Headline** (800, 2.25rem / 1.875rem, line-height 1.25): page titles (h1) and section titles (h2 at 1.875rem).
- **Title** (800, 1.25rem, line-height 1.25): card titles, step titles, panel headings.
- **Body Large** (500, 1.125rem): lead paragraphs under headlines, in Dusk Ink, max ~32rem wide.
- **Body** (500, 1rem, line-height 1.5): default reading text; buttons use the same size at 700.
- **Label** (700, 0.75rem, uppercase, 0.025em tracking): category eyebrows on cards, plan labels, tags.

**The Heavy Means Readable Rule.** Anything a user must catch at a glance (titles, buttons, chips, nav labels) is 700–800. Regular body copy stays at 500; there are no light or thin weights.

## Layout

Content sits in a centred column of up to 1152px (`max-w-6xl`) with 20px side padding on mobile and 32px from the `md` breakpoint (768px). Sections breathe with 56–80px vertical padding on the landing page and 64px for banded sections.

Grids collapse to one column on mobile: the landing hero becomes two columns at `md`, and "how it works" and project grids use three columns at `md` and up. Spacing follows a 4px base scale (4, 8, 12, 16, 24, 32, 48, 64px); gaps between cards are 24px and card interiors use 20px.

Navigation changes by width. Desktop has a sticky translucent cream header (64–72px tall) with text links. Below `md` a fixed bottom nav with four labelled icons appears, respecting the safe-area inset. Page content must leave room for it.

## Elevation & Depth

Depth comes from soft, diffuse shadows tinted with the Midnight Ink hue, never black, combined with translucency on sticky bars. Surfaces rest slightly lifted by default and rise further on hover.

### Shadow Vocabulary
- **Soft** (`box-shadow: 0 6px 28px -6px rgba(42, 31, 89, 0.12)`): default resting state for cards, buttons, chips and inputs that need presence.
- **Lift** (`box-shadow: 0 10px 40px -8px rgba(42, 31, 89, 0.14)`): hero panels and the bottom nav.
- **Float** (`box-shadow: 0 14px 56px -10px rgba(42, 31, 89, 0.16)`): overlays and dialogs.
- **Hover** (`box-shadow: 0 12px 48px -8px rgba(42, 31, 89, 0.18)`): any interactive surface on hover, paired with a 2–4px upward translate.

**The Lift On Reach Rule.** Interactive surfaces answer hover with both a stronger shadow and a small upward move (buttons and chips 2px, cards 4px). Static surfaces do not move.

**The Violet Shadow Rule.** Shadows use rgba(42, 31, 89, …), never neutral black, so they read as warm light on cream.

## Shapes

Everything is round. Tappable controls (buttons, filter pills, chips, tags, status badges, single-line inputs) are full pills (999px). Containers use large radii: 32px for project cards and hero panels, 24px for nav items and textareas, 16px for inner thumbnails, 8px only for tiny inner elements. Circles are used for icon buttons (the favourite heart) and step numbers.

Borders are 2px on interactive outlines (chips, pills, secondary buttons, inputs) and 1px only for hairline dividers and sticky-bar edges. Decoration uses simple circles (the floating sun, coral dots) and soft radial gradients of Lilac and Mint Wash.

**The No Sharp Corners Rule.** No element the user touches has a radius under 8px.

## Components

### Buttons
Soft, springy pills that lift when you reach for them.
- **Shape:** full pill (999px).
- **Primary:** Wonder Purple fill, white bold text, Soft shadow. Medium is 44px tall with 20px horizontal padding; Large is 56px with 28px padding and 1.125rem text.
- **Hover / Focus:** fill deepens to Wonder Purple Deep, Hover shadow, 2px upward move, 200ms ease-out. Focus shows the 3px Focus Lilac ring with a 3px offset.
- **Secondary:** Paper White fill, Wonder Purple Deep text, 2px Lilac Line Strong border; hover fills with Lilac Wash.
- **Ghost:** transparent with Dusk Ink text; hover gets a Lilac Wash tint and Midnight Ink text.
- **Destructive:** Danger Red fill with white text.
- **Disabled:** 50% opacity, no pointer events.

### Chips
- **Filter pills:** 44px pills with a 2px Lilac Line border on Paper White and Dusk Ink text. Active: Wonder Purple fill and border, white text, Soft shadow.
- **Reaction chips:** 44px pills, 2px border. Each reaction owns an accent on hover and selection: Fun (Sun Gold border, Sun Wash fill), Interesting (Fresh Mint border, Mint Wash fill), Would use again (Wonder Purple border, Lilac Wash fill). Selecting plays a quick 350ms scale bounce. Counts sit in a small Lilac Wash pill.
- **Tags:** small Lilac Wash pills with Wonder Purple Deep bold label text.
- **Status badges:** 32px pills; each status maps to a wash plus ink (for example checking uses Lilac Wash with Wonder Purple Deep, in review uses Mint Wash with Fresh Mint Deep, rejected uses Danger Red at 15% with Danger Red text).

### Cards / Containers
- **Corner Style:** 32px.
- **Background:** Paper White on Warm Cream (Warm Cream on white bands).
- **Shadow Strategy:** Soft at rest, Hover plus a 4px lift on hover; the 4:3 thumbnail scales to 102% inside its clipped top.
- **Border:** none.
- **Internal Padding:** 20px, with 12px gaps between text groups.

### Inputs / Fields
- **Style:** Paper White, 2px Lilac Line border, Midnight Ink text, Haze Ink placeholder. Single-line inputs are 48px pills (56px with a Soft shadow for the hero search); textareas use a 24px radius with 16px padding.
- **Focus:** border switches to Wonder Purple; no default outline.
- **Disabled:** 60% opacity.

### Navigation
- **Header:** sticky, Warm Cream at 90% with backdrop blur and a faint Lilac Line bottom edge. The wordmark is extra-bold Wonder Purple Deep. Links are bold Dusk Ink, Midnight Ink on hover and Wonder Purple Deep when active.
- **Bottom nav (mobile):** fixed Paper White at 95% with blur and the Lift shadow. Four equal 56px items, each an emoji icon above a bold 0.75rem label. The active item gets a Lilac Wash pill and Wonder Purple Deep text.

### Project Card (signature)
The core unit of Baiolo: a 4:3 cover image on top, then the category eyebrow, an extra-bold title, a one-line tagline in Dusk Ink, up to four tags, the creator, a plays and reactions line, and a medium primary "Play" button. A circular 44px heart button floats in the top-right corner over the cover; it turns Coral Pop when saved.

## Do's and Don'ts

### Do:
- **Do** keep the canvas Warm Cream (#fff8ef) and put content on Paper White or pastel-wash surfaces.
- **Do** make every tappable control a pill or circle at least 44px tall (56px for primary landing actions and bottom-nav items).
- **Do** pair hover with a violet-tinted shadow and a 2–4px lift, and respect `prefers-reduced-motion`.
- **Do** use Nunito 800 for titles and 700 for buttons, chips and labels.
- **Do** use Wonder Purple Deep (#6d28d9) for text on Lilac Wash and Fresh Mint Deep (#0f766e) for text on Mint Wash; both pass 4.5:1.
- **Do** give every icon a visible text label.

### Don't:
- **Don't** look like a preschool app or like enterprise SaaS: no cartoon clutter, no dense grey dashboards.
- **Don't** use neutral greys or pure black, for surfaces, text or shadows.
- **Don't** use Wonder Purple as decoration or as a large background fill; it means "tap me".
- **Don't** put white text on pastel washes, or use Haze Ink for anything except placeholders (4.2:1).
- **Don't** set small body-size white text on Wonder Purple (#8b5cf6) or Danger Red (#ef4444): they only reach 4.2:1 and 3.8:1. Keep text on them bold and at button size or larger.
- **Don't** introduce sharp corners (under 8px) on anything interactive, or hairline 1px outlines on controls.
