/** Shared Baiolo-ready MVP prompt for creators + AI chats. */
export const BAIOLO_BUILD_PROMPT = `Build a small Baiolo-ready MVP package.

Constraints (must follow):
1. Output a single self-contained static web app: HTML + CSS + JS only.
2. No backend, no database, no auth, no npm install, no build step.
3. No React/Next/Vue/Svelte unless you compile everything into plain static files.
4. Entry file MUST be index.html at the project root (not nested in a subfolder).
5. Keep total size small (ideally under 10 MB; no huge assets).
6. Must run by opening index.html locally OR via any static host.
7. Must work in a browser iframe when possible:
   - no X-Frame-Options blockers
   - no “open in new window only” flows
   - avoid requiring microphone/camera/fullscreen unless essential
8. Mobile-friendly, playful UI, English UI copy.
9. One clear interaction loop in under 30 seconds (user understands what to do immediately).
10. Include a short README.md with:
    - title + 1-sentence description
    - how to zip for Baiolo
    - suggested Baiolo category/tags
11. ALSO prepare card graphics (required):
    - Generate actual image files that look like real screenshots of THIS app’s UI
      (not abstract gradients, not logos-only, not generic stock art).
    - Files to include in the package:
        thumb.png  → 4:3 (or ~1200×900), main Explore card image
        cover.png  → 16:9 (or ~1600×900), project page cover
    - The graphics MUST match the finished game/tool visuals (same colors, layout, key UI).
    - Show the app mid-play or on the main screen so people can decide to try it.
    - If you cannot export PNG files in this chat, generate them with your image tool
      and tell me the exact filenames + a one-line description of each frame.
    - Do not ship color gradients as a substitute for screenshots.

Baiolo packaging rules:
- Final deliverable = a folder ready to ZIP like this:
  my-mvp/
    index.html
    style.css (or styles.css)
    script.js
    thumb.png      ← card screenshot
    cover.png      ← wide screenshot
    assets/        ← optional
    README.md
- When zipping: zip the CONTENTS so index.html is at the ZIP root
  (not my-mvp/my-mvp/index.html).
- Pointer input: attach pointermove/pointerup to the canvas/game element
  (and use setPointerCapture), not only window — games must work inside an iframe.

Also provide:
- Suggested Baiolo title (max ~40 chars)
- Tagline (1 sentence)
- Category: Game | Tool | Experiment | Demo
- 2–4 short tags
- Reminder: upload thumb.png as the Baiolo thumbnail when submitting

My idea:
[DESCRIBE YOUR IDEA IN 2–5 SENTENCES]`;
