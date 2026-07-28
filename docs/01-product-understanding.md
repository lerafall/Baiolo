# Baiolo — Product Understanding (Etap 1)

## One-liner

Baiolo is a playful digital playground where people share mini games, MVPs, and experiments so others can try them, react quickly, and help creators decide what to build next.

## Problem

Creators ship tiny ideas but struggle to get fast, honest reactions. Testers want fun things to try without heavy apps or long forms. Existing platforms feel either too corporate (SaaS dashboards) or too chaotic (generic game hubs).

## Solution loop

**Upload → Show → Try → React → Decide**

Keep the loop light: no complex social graph, economy, or analytics in MVP.

## Personas

### 1. Creator — “Maya”, 14–28
- Builds small games, demos, and experiments
- Wants a friendly place to publish in minutes
- Needs simple signals: plays, reactions, short feedback
- Success: “I know if this idea is worth another weekend”

### 2. Explorer / Tester — “Leo”, 10–35
- Browses for fun things to try
- Prefers big cards, clear Play buttons, zero jargon
- Leaves quick reactions (fun / interesting / would use again)
- Success: “I can play and react without thinking about the UI”

### 3. Parent / guardian (secondary)
- Wants a safe, moderated space
- Trusts short paths, report buttons, no open chat/DMs in MVP

## Core use cases

| # | Actor | Goal | Outcome |
|---|--------|------|---------|
| UC1 | Anyone | Understand Baiolo in ~5s | Lands, reads claim, sees CTA |
| UC2 | Explorer | Browse projects | Explore feed with filters |
| UC3 | Explorer | Try a project | One-tap Play on project page |
| UC4 | Explorer | React | Fun / Interesting / Would use again |
| UC5 | Explorer | Leave short feedback | Optional short text note |
| UC6 | Creator | Publish MVP | 6-step upload wizard → live |
| UC7 | Creator | See results | My Projects dashboard (plays, reactions) |
| UC8 | New user | Onboard | Create / Explore / Both → avatar → interests |
| UC9 | Anyone | Report unsafe content | Report project |

## User flows (MVP)

### A. First visit → Explore
Landing → CTA “Start exploring” → (optional auth) → Onboarding role → Explore feed → Project → Play → React

### B. First visit → Create
Landing → CTA “Share an idea” → Auth → Onboarding → Create wizard (file/link → title → category → description → thumbnail → Publish) → Project live → Dashboard

### C. Returning creator
Login → My Projects → open project stats → iterate or upload new

### D. Safety
Any project → Report → confirmation → content flagged for review

## Information architecture

**Primary nav (always labeled):**
- Explore
- Create
- My Projects
- Profile

Mobile: bottom nav, 4 icons + text labels.

## Scope reminder (spec v2)

- **P0:** landing, auth, onboarding, explore, project, upload (ZIP / link / template + draft auto-save + packaging helper), reactions, short feedback, creator dashboard with submission statuses, AI precheck + admin approval queue, no public publish without approve, responsive
- **P1:** profiles depth, favorites, featured, tags, weekly ranking, similar projects
- **P2:** friends, threaded comments, challenges, badges, team accounts

## Moderation loop (v2)

**Upload → private storage → technical check → AI risk (low/medium/high) → admin review → publish**

Statuses: draft · submitted · checking · needs_changes · in_review · approved · published · rejected

## Brand & UX principles (non-negotiable)

- Magical playground, not preschool app or enterprise SaaS
- Extremely simple: large targets (≥44px), labeled icons, immediate feedback
- No multi-level menus, no double-tap primary actions, no jargon
- Safe by default: report, hide, no DMs/chat in MVP
