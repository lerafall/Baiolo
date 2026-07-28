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
11. Include a real screenshot image of the running UI for the Baiolo card thumbnail
    (or describe exact frame so I can capture one).

Baiolo packaging rules:
- Final deliverable = a folder ready to ZIP like this:
  my-mvp/
    index.html
    style.css (or styles.css)
    script.js
    assets/ (optional)
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

My idea:
[DESCRIBE YOUR IDEA IN 2–5 SENTENCES]`;
