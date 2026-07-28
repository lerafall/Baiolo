# Baiolo — Handoff notes (spec v2)

## Routes (implemented)

| Route | Purpose |
|-------|---------|
| `/create` | Add project wizard (ZIP / link / template), draft auto-save |
| `/create/submitted` | Post-submit status |
| `/projects` | Dashboard + Submission status |
| `/admin` | Moderation queue (demo / mock AI) |

## Upload wizard steps

1. Choose type  
2. Add content (+ packaging helper for ZIP)  
3. Title & description  
4. Category  
5. Thumbnail  
6. Review  
7. Submit for checking  

## Status lifecycle

`draft` → `submitted` → `checking` → `needs_changes` | `in_review` → `approved` → `published`  
or → `rejected`

## Moderation pipeline (MVP mock)

1. Private draft in `localStorage`  
2. Mock AI keyword precheck → `low` / `medium` / `high`  
3. Admin queue at `/admin`  
4. Approve publishes; Ask for changes / Reject updates status + note  

## Figma frames (v2)

Desktop (`03 — Screens Desktop`):
- `Upload v2 / 1 Type` … `Upload v2 / 7 Submit`
- `Upload v2 / Submitted`
- `Admin / Moderation queue`
- `Dashboard / Desktop` — Submission status section

Mobile (`04 — Screens Mobile & Tablet`):
- `Upload v2 / Type / Mobile`
- `Upload v2 / Submit / Mobile`
- `Admin / Queue / Mobile`

Prototype flows: **Upload v2**, **Admin moderation**

## Next build step

1. Create Supabase project and run `supabase/schema.sql`
2. Add env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Replace `localStorage` in `src/lib/submissions.ts` with Supabase client
4. Wire real Storage buckets + AI edge function behind `src/lib/pipeline.ts`

