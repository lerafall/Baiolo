# Baiolo

Playful platform to share MVPs, mini-games, and prototypes — try, react, decide what to build next.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- Design tokens from Figma (`Baiolo/Semantic`)
- Mock data (Supabase later)

## Develop

```bash
cp .env.example .env.local   # optional — works in mock mode without it
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without Supabase env vars the app uses a local mock store + AI/admin pipeline.  
Admin demo code: `baiolo-admin` at `/admin`.

## Routes

| Path | Screen |
|------|--------|
| `/` | Landing |
| `/explore` | Explore feed |
| `/project/[id]` | Project + Play + reactions |
| `/create` | Add project wizard (ZIP / link / template, draft auto-save) |
| `/create/submitted` | Sent for checking |
| `/projects` | Creator dashboard + submission statuses |
| `/favorites` | Saved projects |
| `/this-week` | Soft weekly ranking |
| `/safety` | Stay safe guide |
| `/admin` | Moderation queue + user reports (demo) |
| `/auth` | Magic link (demo) |
| `/onboarding` | Role → avatar → interests |
| `/profile` | Basic profile |

Spec v2 notes: nothing goes public without AI precheck + admin approve. See `docs/03-spec-v2-delta.md`.

## Design

Figma: https://www.figma.com/design/vOcNHgWoViFwrkUUeHnahx
