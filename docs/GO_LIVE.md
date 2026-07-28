# Baiolo go-live checklist

## 1. Supabase SQL

1. Run `supabase/schema.sql` (if not already).
2. Run `supabase/schema-v2.sql` (profiles, engagement, `play_url`).

## 2. Auth

1. Authentication → Providers → Email enabled.
2. URL configuration:
   - Site URL: `http://localhost:3001` (or your deploy URL)
   - Redirect URLs: `http://localhost:3001/auth/callback` (+ production URL)
3. Optional magic-link email templates.

## 3. Storage buckets

Create two buckets in Storage:

| Bucket | Public |
|--------|--------|
| `project-private` | no |
| `project-public` | yes |

MIME: allow `application/zip` (and `application/octet-stream` if needed).

## 4. Env (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
BAIOLO_ADMIN_CODE=baiolo-admin
NEXT_PUBLIC_BAIOLO_ADMIN_CODE=baiolo-admin
```

Restart `npm run dev` after edits.

## 5. Admin user (optional JWT)

```sql
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'you@example.com';
```

Demo fallback: enter admin code on `/admin`.

## 6. Smoke test

1. `/api/health` → `"mode":"supabase"`
2. Join → magic link (or demo fallback message)
3. Create ZIP or link → Submit
4. Admin → Approve → Explore → Play (`/play/[id]`)
5. Admin → Seed demo projects (optional)

## 7. Hostinger VPS (Docker + Traefik) + baiolo.com

Same path as MarkOS / MyPen: reverse proxy is the existing **traefik** stack; Baiolo is a new Compose project.

Files in repo: `Dockerfile`, `docker-compose.yml`, `.env.production.example`.

### A. DNS

Domains → `baiolo.com` → Zarządzaj → DNS:

- **A** `@` → VPS IP (`srv1464386…` / panel shows the IP)
- **A** or **CNAME** `www` → same VPS (optional but compose already allows `www`)

### B. Deploy on the VPS

1. Put the project on the server (git clone or upload), e.g. `/root/baiolo` or via Docker Manager.
2. Copy `.env.production.example` → `.env` and fill Supabase + admin keys (same as local `.env.local`).
3. In **Menedżer Docker** → **Skomponuj** (or terminal in that folder):

```bash
docker compose up -d --build
```

4. Confirm the container is on network `traefik-net` and Traefik picks up labels for `baiolo.com`.
5. Open `https://baiolo.com` — SSL via Let’s Encrypt (certresolver `letsencrypt`).

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

- Custom email sender domain in Supabase (optional)
- Real AI moderation provider (today: heuristics + human queue)
