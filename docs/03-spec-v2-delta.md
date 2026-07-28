# Baiolo — Spec delta v2

Źródło: `baiolo-cursor-spec-v2.md`

## Co się zmienia względem v1

### Upload
- Jeden CTA: **Add your project**
- Tylko 3 ścieżki: **Upload ZIP** · **Paste link** · **Use simple starter template**
- Auto-save **draft**; użytkownik wraca później
- **Auto-packaging helper** (pliki → paczka, bez żargonu)
- Wizard: type → files/link → title+description → category → thumbnail → review → **Submit for checking**
- Submit ≠ publish. Publiczne dopiero po approve

### Lifecycle projektu
`draft` → `submitted` → `checking` → (`needs_changes` | `in_review`) → (`approved` → `published` | `rejected`)

Friendly copy per status (spokojny ton, nie techniczny).

### Moderacja (P0)
1. Private temporary storage  
2. Technical validation  
3. AI moderation (tekst, obrazy, nazwy plików, thumbs) → low / medium / high risk  
4. Admin queue (human-in-the-loop)  
5. Approve / Reject / Ask for changes / Escalate  
6. Dopiero potem publiczne

### Nowe ekrany
- Creator dashboard: **Submission status** na każdym projekcie  
- **Moderation / admin queue**

### P0 dodane
auto-save draft, packaging helper, statusy, AI precheck, admin approval queue, brak publikacji bez approve
