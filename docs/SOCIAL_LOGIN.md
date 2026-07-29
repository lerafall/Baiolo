# Social login setup (Supabase)

Baiolo already has the buttons. You only need to turn providers on in Supabase and paste keys from each vendor.

Do this once for production (`https://baiolo.com`) and optionally again for local (`http://localhost:3001`).

## 0. Supabase URL settings (do this first)

1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard) → your Baiolo project.
2. **Authentication** → **URL Configuration**.
3. Set:
   - **Site URL:** `https://baiolo.com` (for local testing you can temporarily use `http://localhost:3001`)
   - **Redirect URLs** (add all that you use):
     - `https://baiolo.com/auth/callback`
     - `http://localhost:3001/auth/callback`
4. Save.

---

## 1. Google (recommended first)

### A. Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create or pick a project.
3. **APIs & Services** → **OAuth consent screen**
   - User type: **External**
   - App name: `Baiolo`
   - Support email: yours
   - Save → continue through scopes (default is fine for login)
   - Add your Google account as a **test user** while the app is in Testing
4. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: `Baiolo web`
   - **Authorized JavaScript origins:**
     - `https://baiolo.com`
     - `http://localhost:3001`
   - **Authorized redirect URIs** (important — use the Supabase callback, not Baiolo):
     - `https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback`
     - Example shape: `https://xurivhcuoxtqlhwabtwv.supabase.co/auth/v1/callback`
5. Copy **Client ID** and **Client secret**.

> Tip: Project ref is in Supabase → **Project Settings** → **General** → **Reference ID**, or in your `NEXT_PUBLIC_SUPABASE_URL`.

### B. Supabase

1. Supabase → **Authentication** → **Providers** → **Google**
2. Enable **Google**
3. Paste **Client ID** and **Client secret**
4. Save

### C. Test

1. Open `https://baiolo.com/auth` (or local `/auth`)
2. Click **Continue with Google**
3. You should see Google’s account picker (not a blank Pretty-print page)

---

## 2. Facebook

1. [Meta for Developers](https://developers.facebook.com/) → Create app → type **Consumer** / login.
2. Add product **Facebook Login** → **Settings**
3. Valid OAuth Redirect URIs:
   - `https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback`
4. Copy **App ID** + **App Secret**
5. Supabase → **Providers** → **Facebook** → enable → paste → save

---

## 3. Discord

1. [Discord Developer Portal](https://discord.com/developers/applications) → New Application
2. **OAuth2** → **Redirects** add:
   - `https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback`
3. Copy **Client ID** + **Client Secret**
4. Supabase → **Providers** → **Discord** → enable → paste → save

---

## 4. Slack

1. [Slack API apps](https://api.slack.com/apps) → Create New App
2. **OAuth & Permissions** → Redirect URLs:
   - `https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback`
3. Copy credentials into Supabase → **Providers** → **Slack**

---

## 5. Apple (harder)

Needs an Apple Developer account ($). Follow Supabase’s Apple guide; redirect is still:

`https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback`

Skip Apple until Google works.

---

## 6. WhatsApp (different — not OAuth)

WhatsApp uses a **phone code**, not a “Continue with …” OAuth app.

1. Supabase → **Providers** → **Phone** → enable
2. Set SMS provider to **Twilio** or **Twilio Verify**
3. In Twilio, set up a **WhatsApp** sender (Meta approval)
4. Then Baiolo’s WhatsApp box on `/auth` can send real codes

Until Twilio is ready, local demo accepts any phone without a real WhatsApp message.

---

## Common mistakes

| Mistake | Result |
|--------|--------|
| Provider toggled off in Supabase | Blank JSON / “provider is not enabled” |
| Redirect URI points to `baiolo.com/auth/callback` in Google | Google login fails |
| Only production URL added, testing on localhost | Redirect error |
| OAuth consent still Testing, your Gmail not a test user | Google blocks sign-in |

Correct vendor redirect is always:

`https://<PROJECT-REF>.supabase.co/auth/v1/callback`

Baiolo’s `https://baiolo.com/auth/callback` belongs only in **Supabase → URL Configuration → Redirect URLs**.
