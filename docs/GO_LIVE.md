# Baiolo go-live checklist

## 1. Supabase SQL

Run in order (skip any already applied):

1. `supabase/schema.sql`
2. `supabase/schema-v2.sql` (profiles, engagement, `play_url`)
3. `supabase/schema-v3.sql`
4. `supabase/schema-v4.sql`
5. `supabase/schema-v5.sql`
6. `supabase/schema-v6.sql` (plans Free/Pro/Studio, `ai_generation_usage`, AI slots)

Also create storage buckets (see §3) via Dashboard or `supabase/storage.sql`.

## 2. Auth

1. Authentication → Providers → **Email** enabled (magic link).
2. Enable each social provider you want under Authentication → Providers (Google, Facebook, Apple, Discord, Slack) and paste client IDs/secrets from that vendor.  
   If a provider stays off, Baiolo shows a friendly message instead of a blank JSON page.
3. **WhatsApp** (phone OTP, not OAuth):
   - Enable **Phone** provider
   - SMS provider = **Twilio** or **Twilio Verify**
   - Configure a WhatsApp sender in Twilio (Meta approval required)
   - Baiolo sends OTP with `channel: "whatsapp"`
4. URL configuration:
   - Site URL: `http://localhost:3001` (or your deploy URL)
   - Redirect URLs: `http://localhost:3001/auth/callback` (+ production URL)
5. Optional magic-link email templates.

## 3. Storage buckets

Create two buckets in Storage (Dashboard **or** run `supabase/storage.sql`):

| Bucket | Public |
|--------|--------|
| `project-private` | no |
| `project-public` | yes |

MIME: allow `application/zip` (and `application/octet-stream` if needed).

**Dashboard path:** Supabase → **Storage** → **New bucket**

1. Name: `project-private` · Public: **off** → Create  
2. Name: `project-public` · Public: **on** → Create  

If ZIP submit says “Create the project-private bucket?”, these buckets are missing.

## 4. Env (`.env.local` / production `.env`)

Minimum:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
BAIOLO_ADMIN_CODE=...
NEXT_PUBLIC_BAIOLO_ADMIN_CODE=...
OPENROUTER_API_KEY=...
```

Recommended for production:

```
NEXT_PUBLIC_SITE_URL=https://baiolo.com
NEXT_PUBLIC_BAIOLO_CONTACT_EMAIL=hello@baiolo.com
OPENROUTER_API_KEY=...          # required for “Build from description”
RESEND_API_KEY=...
NOTIFY_EMAIL_FROM=Baiolo <hello@baiolo.com>
```

Without `OPENROUTER_API_KEY` / `OPENAI_API_KEY` / `BUILDER_API_URL`, AI build returns a friendly “temporarily unavailable” message (no env names in the UI). After changing `.env`, rebuild the image (`docker compose up -d --build`) so the server process picks up the key.

See `.env.example` and `.env.production.example` for the full list.

Restart `npm run dev` (or redeploy) after edits.

## 5. Plans & billing (no Stripe yet)

- Limits live in `src/lib/plans.config.ts` and are enforced via `ai-usage` + `/api/build`.
- Self-serve can only set **Free** (`POST /api/account/plan`).
- **Pro / Studio** are awarded in **Admin → Accounts** (or later by an external billing provider).
- `/pricing` CTAs for paid plans open a mailto to `NEXT_PUBLIC_BAIOLO_CONTACT_EMAIL`.
- Adapter stub: `src/lib/billing/provider.ts` (`BAIOLO_BILLING_PROVIDER=manual` today).

## 6. AI builder (production path)

- **Default production path:** OpenRouter (or OpenAI) keys on the Next app — no separate builder service required.
- Optional **path B:** set `BUILDER_API_URL` (+ `BUILDER_API_SECRET`, prefer `BUILDER_HEALTH_URL`). Health ping strips a trailing `/build` automatically.
- Local stub only: `npm run builder:stub` → `BUILDER_API_URL=http://127.0.0.1:8787/build`.

## 7. Email notifications (Resend)

Used for moderation outcomes, collaborator invites, and public-share requests.

1. Create a Resend account and verify your domain.
2. Set `RESEND_API_KEY` and `NOTIFY_EMAIL_FROM` (must be a verified sender).
3. Without the key, events are logged to the server console (`logged_only`).

Supabase Auth still uses its own email templates for magic links (optional custom sender there).

## 8. Admin user (optional JWT)

```sql
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'you@example.com';
```

Demo fallback: enter admin code on `/admin`. Award Pro/Studio from the accounts panel.

## 9. Smoke test

1. `/api/health` → `"mode":"supabase"` (check `builderConfigured` / AI key presence as needed)
2. Join → magic link
3. Create ZIP / AI / link → Submit
4. Admin → Approve → Explore → Play (`/play/[id]`)
5. `/pricing` → Free works; Pro/Studio open mailto (not an instant upgrade)
6. `/projects/analytics` → basic stats; trends need Pro; CSV export needs Studio
7. Admin → Seed demo projects (optional)

## 10. Hostinger VPS (Docker + Traefik) + baiolo.com

Same path as MarkOS / MyPen: reverse proxy is the existing **traefik** stack; Baiolo is a new Compose project.

Files in repo: `Dockerfile`, `docker-compose.yml`, `.env.production.example`.

### A. DNS

Domains → `baiolo.com` → Zarządzaj → DNS:

- **A** `@` → VPS IP (`srv1464386…` / panel shows the IP)
- **A** or **CNAME** `www` → same VPS (optional but compose already allows `www`)

### B. Deploy on the VPS

1. Put the project on the server (git clone or upload), e.g. `/root/baiolo` or via Docker Manager.
2. Copy `.env.production.example` → `.env` and fill Supabase + admin + OpenRouter (+ Resend if ready).
   Set `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_BAIOLO_CONTACT_EMAIL` — they are baked into the client at **image build** time.
3. Pull latest and rebuild:

```bash
git pull
docker compose up -d --build
```

4. Confirm the container is on network `traefik-net` and Traefik picks up labels for `baiolo.com`.
5. Open `https://baiolo.com` — SSL via Let’s Encrypt (certresolver `letsencrypt`).
6. Smoke: `https://baiolo.com/api/health` → `"mode":"supabase"`.

If the Traefik network name differs on your VPS, set `TRAEFIK_NETWORK=…` in `.env`.

### C. Supabase production URLs

Authentication → URL configuration:

- **Site URL:** `https://baiolo.com`
- **Redirect URLs:** `https://baiolo.com/auth/callback`  
  (keep localhost entries for local dev)

### D. Smoke test on production

1. `https://baiolo.com/api/health` → `"mode":"supabase"`
2. Join → magic link → onboarding
3. Create / admin approve / play

## What still needs ops (not code)

- Wire an external billing provider into `src/lib/billing/provider.ts` when ready
- Custom email sender domain in Supabase Auth (optional)
- Real AI moderation provider (today: heuristics + human queue; Pro/Studio get priority badges)
