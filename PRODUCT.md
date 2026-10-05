# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: no-code creators building with AI.** People with an idea for a small game, tool or experiment who cannot (or do not want to) code it. They describe the idea, the AI builder turns it into a playable web prototype, and they want to know quickly whether anyone cares. Success for them: "I know if this idea is worth another weekend."

**Second side of the loop: explorers / testers.** People browsing for something fun or useful to try in seconds, without installs or long forms. They play and leave a quick reaction. Their signal is what creators come for.

**Also served:** creators who upload their own builds (ZIP or link); Pro/Studio users who build more and want faster review and richer analytics; admins who moderate every public project.

Minimum age is **13**. Stage-1 docs (`docs/01-product-understanding.md`) target 10–35; that age range is superseded.

## Product Purpose

Baiolo turns a rough idea into honest feedback fast: **describe or upload → it becomes playable → people try it → they react → the creator decides what to build next.** It exists because tiny ideas rarely get real reactions: existing places feel either corporate (SaaS, launch sites) or chaotic (generic game hubs).

Success means creators get a clear signal (plays, reactions, short notes) on an idea within days, and explorers can play and react without thinking about the UI.

## Positioning

The **idea → signal loop**. Baiolo is not a store, a portfolio or a launch leaderboard; it is the place where a half-formed idea gets tried by real people and comes back with a verdict. The AI builder lowers the cost of getting to "playable", and moderation keeps the space safe enough to share. Both serve the loop, not the other way round.

## Operating Context

- **Creating:** `/create` wizard with three paths (Upload ZIP · Paste link · simple starter template) plus the AI builder (`/make`, `/create` AI build): a short clarification chat, then a generated `index.html` / `style.css` / `script.js` app that can be repaired with follow-up prompts in the in-browser workshop (Monaco editor, live preview). Drafts auto-save.
- **Lifecycle:** `draft → submitted → checking → (needs_changes | in_review) → (approved → published | rejected)`. Private play is available to the creator immediately; public Explore requires admin approval. Status copy is calm and non-technical.
- **Moderation:** private storage → technical validation → AI risk precheck (low / medium / high; TypeSafe Jev in shadow mode, keyword fallback) → admin queue (approve / reject / ask for changes / escalate) → publish. Admin code review of uploaded ZIPs uses static checks plus an LLM.
- **Exploring:** `/explore` feed with filters, `/project/[id]` with one-tap Play and reactions, `/this-week` soft ranking, favorites, report button on every project, `/safety` guide.
- **Creator side:** `/projects` dashboard with submission status, plays and reactions per project.
- **Accounts:** magic link, social and WhatsApp sign-in; onboarding picks role (Create / Explore / Both), avatar and interests.

## Capabilities and Constraints

- **Stack:** Next.js 16 (App Router) + TypeScript + Tailwind CSS v4, Supabase (local mock store when unconfigured), Docker + Traefik on a Hostinger VPS at baiolo.com. LLM calls go through OpenRouter (fast and quality tiers).
- **Languages:** English (default) and Polish, chosen from `Accept-Language` or the user's toggle. Every UI string exists in both.
- **Plans** (`src/lib/plans.config.ts`): Free (1 active AI project, 3 AI generations / month, basic analytics, standard review queue), Pro (10 / 100, trends, priority queue), Studio (unlimited / 500, export + API, dedicated SLA). Billing is manual for now; upgrades go through a contact email.
- **Safety rules (non-negotiable):** nothing goes public without admin approval; report on every project; no chat or DMs; minimum age 13.
- **Interaction rules from stage 1:** large targets (≥44px), labeled icons, immediate feedback, no multi-level menus, no double-tap primary actions, no jargon. Primary nav: Explore · Create · My Projects · Profile; mobile uses a bottom nav with 4 labeled icons.
- **Generated projects** are static HTML/CSS/JS served in a sandboxed play frame.
- **Open decisions:** how the age minimum is enforced (no age gate found in onboarding or auth); paid billing provider.

## Brand Commitments

- **Name:** Baiolo.
- **Tagline:** "Share little ideas. See which ones grow." / "Dziel się małymi pomysłami. Zobacz, które rosną."
- **Personality:** a magical playground. Not a preschool app, not enterprise SaaS.
- **Voice:** friendly, calm and plain. Status and error copy never sounds technical and never blames the user.
- **Design source:** Figma file `vOcNHgWoViFwrkUUeHnahx` (semantic tokens `Baiolo/Semantic`) and the shipped implementation.

## Evidence on Hand

- **Demo projects** in `public/demos/`: cloud-hopper, color-splash, crimson-path, fairy-blocks, foxfire-duel, foxfire-hollow, lantern-munch, moonlight-bakery, petal-puzzle, spark-nest.
- **Product docs:** `docs/01-product-understanding.md` (stage-1 personas, flows, IA), `docs/03-spec-v2-delta.md` (moderation and upload spec), `docs/GO_LIVE.md`.
- **Absent, do not fabricate:** testimonials, user or play counts, press, case studies, partner logos, published benchmarks.

## Product Principles

1. **The loop is the product.** Every surface should shorten the path from idea to playable to reaction to decision.
2. **Playable beats described.** Show the thing running; one tap to play, no installs or forms in the way.
3. **Signal over vanity.** Reactions and short notes that help a creator decide outrank follower counts, rankings and streaks.
4. **Safe enough to share.** Moderation before publishing, reporting everywhere, no private messaging.
5. **No-code first.** Never require code knowledge or jargon to create, fix or publish.

## Accessibility & Inclusion

- Users from age 13, many on phones: touch targets ≥44px, labeled icons, immediate feedback.
- Full parity between English and Polish, including longer Polish strings.
- No formal WCAG level has been committed to yet.
