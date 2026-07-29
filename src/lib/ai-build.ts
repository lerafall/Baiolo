import type { ProjectCategory } from "@/lib/types";
import type { StarterFiles } from "@/lib/html-starters";
import { cloneStarterFiles } from "@/lib/html-starters";
import {
  briefLooksLikeCatchGame,
  coinCatcherFiles,
} from "@/lib/ai-game-fallbacks";
import { chatCompletionJson, pickBuildTier, type LlmTier } from "@/lib/llm";

export type AiBuildResult = {
  title: string;
  description: string;
  category: ProjectCategory;
  files: StarterFiles;
  provider: "openai" | "openrouter" | "builder";
  model?: string;
  tier?: "fast" | "quality";
  /** Short chat-facing confirmation of what changed */
  message?: string;
};

export type ChatMessage = {
  role: "assistant" | "user";
  content: string;
};

export type ChatTurnResult =
  | { status: "ready"; message: string; categoryHint?: ProjectCategory | null }
  | { status: "chat"; message: string; categoryHint?: ProjectCategory | null };

const ALLOWED_FILES = new Set([
  "index.html",
  "style.css",
  "styles.css",
  "script.js",
  "main.js",
]);

const CATEGORIES: ProjectCategory[] = [
  "game",
  "tool",
  "experiment",
  "demo",
];

export const MAX_CHAT_ASSISTANT_TURNS = 5;

const FIX_INTENT =
  /\b(fix|repair|broken|bug|debug|nie\s*dzia[łl]a|nie\s*wida[cć]|bez\s*zmian|pust(y|a|e)|blank|podgl[aą]d|popraw|napraw|nadal|still\s*not|doesn'?t\s*work|not\s*working|zepsut)/i;

export function isFixIntent(text: string): boolean {
  return FIX_INTENT.test(text);
}

export function normalizeAiBuildFiles(
  raw: Record<string, unknown> | null | undefined,
): StarterFiles | null {
  if (!raw || typeof raw !== "object") return null;
  const files: StarterFiles = {};
  for (const [key, value] of Object.entries(raw)) {
    const name = key.replace(/^\.\//, "").split("/").pop() || key;
    if (!ALLOWED_FILES.has(name)) continue;
    if (typeof value !== "string" || !value.trim()) continue;
    files[name] = value;
  }
  if (!files["index.html"]?.trim()) return null;
  if (!files["style.css"] && files["styles.css"]) {
    files["style.css"] = files["styles.css"];
    delete files["styles.css"];
  }
  if (!files["script.js"] && files["main.js"]) {
    files["script.js"] = files["main.js"];
    delete files["main.js"];
  }
  return files;
}

/** Cap existing code so the LLM request stays within context limits. */
export function truncateExistingFiles(
  files: StarterFiles,
  maxTotal = 28_000,
): StarterFiles {
  const keys = ["index.html", "style.css", "script.js"] as const;
  const out: StarterFiles = {};
  let used = 0;
  for (const key of keys) {
    const raw = files[key];
    if (!raw) continue;
    const room = Math.max(0, maxTotal - used);
    if (room < 80) break;
    const slice =
      raw.length > room
        ? `${raw.slice(0, room)}\n/* …truncated… */`
        : raw;
    out[key] = slice;
    used += slice.length;
  }
  return out;
}

export function parseAiBuildPayload(
  raw: string,
): Omit<AiBuildResult, "provider"> | null {
  let parsed: {
    title?: unknown;
    description?: unknown;
    category?: unknown;
    message?: unknown;
    files?: Record<string, unknown>;
  };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    return null;
  }

  const files = normalizeAiBuildFiles(parsed.files);
  if (!files) return null;

  const category =
    typeof parsed.category === "string" &&
    CATEGORIES.includes(parsed.category as ProjectCategory)
      ? (parsed.category as ProjectCategory)
      : "experiment";

  const title =
    typeof parsed.title === "string" && parsed.title.trim()
      ? parsed.title.trim().slice(0, 60)
      : "AI project";
  const description =
    typeof parsed.description === "string" && parsed.description.trim()
      ? parsed.description.trim().slice(0, 280)
      : "Built from a description in Baiolo.";
  const message =
    typeof parsed.message === "string" && parsed.message.trim()
      ? parsed.message.trim().slice(0, 220)
      : undefined;

  return { title, description, category, files, message };
}

/**
 * Friendly chat line after a build/edit — never a single static “I’m fixing it” string.
 * Exported for tests and API fallbacks.
 */
export function composeBuildAck(options: {
  locale?: string;
  userText: string;
  repairing?: boolean;
}): string {
  const pl = options.locale === "pl";
  const text = options.userText.replace(/\s+/g, " ").trim();
  const short = text.slice(0, 72);
  const quote = short ? (pl ? `„${short}”` : `"${short}"`) : "";

  if (/tł[oa]|background|kolor|color|zielon|green|niebies|blue|czerwon|red/i.test(text)) {
    return pl
      ? "Zrobione — aktualizuję kolory i tło w podglądzie."
      : "Done — updating the colors and background in the preview.";
  }
  if (/monet|coin|więcej|more\s+coin|spawn/i.test(text)) {
    return pl
      ? "Zrobione — dokładam więcej monet do gry."
      : "Done — adding more coins to the game.";
  }
  if (/bonus|punkt|score|points/i.test(text)) {
    return pl
      ? "Zrobione — dopisuję punkty / bonusy."
      : "Done — adding score / bonus points.";
  }
  if (/szybciej|slower|faster|speed|trudniej|łatwiej|harder|easier/i.test(text)) {
    return pl
      ? "Zrobione — zmieniam tempo / trudność."
      : "Done — tweaking speed / difficulty.";
  }
  if (options.repairing && isFixIntent(text)) {
    return pl
      ? `OK — naprawiam to, o czym napisałeś${quote ? `: ${quote}` : ""}.`
      : `OK — fixing what you described${quote ? `: ${quote}` : ""}.`;
  }
  if (options.repairing) {
    return pl
      ? `Jasne — wprowadzam zmianę${quote ? `: ${quote}` : ""} i odświeżam podgląd.`
      : `Got it — applying${quote ? `: ${quote}` : " your edit"} and refreshing the preview.`;
  }
  return pl
    ? `Super — buduję to${quote ? ` z briefu: ${quote}` : ""}.`
    : `Great — building that${quote ? ` from: ${quote}` : ""} now.`;
}

export function latestUserText(
  prompt: string,
  messages?: ChatMessage[],
): string {
  const last = [...(messages ?? [])]
    .reverse()
    .find((m) => m.role === "user" && m.content.trim());
  return (last?.content || prompt).trim();
}

export function parseChatTurnPayload(raw: string): ChatTurnResult {
  let parsed: {
    ready?: unknown;
    message?: unknown;
    category?: unknown;
    categoryHint?: unknown;
  };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    return {
      status: "ready",
      message: "Sounds good — I’ll build it now.",
    };
  }

  const message =
    typeof parsed.message === "string" && parsed.message.trim()
      ? parsed.message.trim().slice(0, 400)
      : "";

  const catRaw =
    (typeof parsed.categoryHint === "string" && parsed.categoryHint) ||
    (typeof parsed.category === "string" && parsed.category) ||
    "";
  const categoryHint = CATEGORIES.includes(catRaw as ProjectCategory)
    ? (catRaw as ProjectCategory)
    : null;

  if (parsed.ready === true) {
    return {
      status: "ready",
      message: message || "Perfect — I’ll build that now.",
      categoryHint,
    };
  }

  if (!message) {
    return {
      status: "ready",
      message: "Got it — building now.",
      categoryHint,
    };
  }

  return { status: "chat", message, categoryHint };
}

export function normalizeChatMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as ChatMessage;
    if (row.role !== "assistant" && row.role !== "user") continue;
    const content = typeof row.content === "string" ? row.content.trim() : "";
    if (!content) continue;
    out.push({ role: row.role, content: content.slice(0, 800) });
    if (out.length >= 12) break;
  }
  return out;
}

export function composeBuildBrief(
  prompt: string,
  messages?: ChatMessage[],
): string {
  const base = prompt.trim().slice(0, 2000);
  const chat = (messages ?? []).filter((m) => m.content.trim());
  if (chat.length === 0) return base;
  const lines = chat
    .map((m) =>
      m.role === "assistant"
        ? `Baiolo: ${m.content.trim()}`
        : `Creator: ${m.content.trim()}`,
    )
    .join("\n");
  return `${base}\n\nFriendly chat with the creator:\n${lines}`.slice(0, 4500);
}

function chatSystemPrompt(locale: string, repairing: boolean) {
  const language =
    locale === "pl"
      ? "Write every message in natural, warm Polish (like texting a friend)."
      : "Write every message in natural, warm English (like texting a friend).";

  const repairExtra = repairing
    ? `
You are helping FIX an existing project that already has code in the editor.
- Ask at most ONE short question about what is broken (e.g. nothing moves, no score, blank screen).
- If they already said it does not work / fix it / still broken, set ready:true and confirm you will repair the code.
- Prefer ready:true quickly — do not invent new features unless they ask.`
    : `
- If the idea is already clear enough for a small MVP, set ready:true with a warm confirmation.
- After a few replies, prefer ready:true instead of more questions.`;

  return `You are Baiolo’s friendly helper. You chat with creators before building a tiny HTML game or tool.

${language}

Reply with JSON only:
{"ready":true,"message":"...","category":"game|tool|experiment|demo"}
or
{"ready":false,"message":"...","category":"game|tool|experiment|demo"}

How to talk:
- Sound human, kind, and simple — not like a form or a survey.
- Ask at most ONE easy thing at a time.
- Prefer choices people can answer in a few words (“pastel or neon?”, “tap or swipe?”, “catch 5 or 10?”, “more game or more tool?”).
- You may gently learn the category (game/tool/experiment/demo) and include it in JSON when clear.
- Short messages (1–2 sentences). No jargon, no tech talk.
- Never ask about accounts, money, hosting, frameworks, or code.${repairExtra}`;
}

const BUILD_SYSTEM_PROMPT = `You build tiny playable static web apps for Baiolo (kids/creators showcase).
Reply with JSON only:
{"title":"...","description":"...","category":"game|tool|experiment|demo","message":"...","files":{"index.html":"...","style.css":"...","script.js":"..."}}

Hard rules:
- Self-contained HTML+CSS+JS only. No frameworks, no npm, no CDNs, no fetch to unknown APIs.
- index.html must link ./style.css and ./script.js (relative paths). Put visible content in <body>.
- Mobile-friendly, large tap targets, works in an iframe sandbox.
- English UI copy inside the generated app.
- "message" = one short friendly sentence confirming what you built/changed (match the creator’s language when clear: Polish→Polish, else English). Never repeat a generic “I’m fixing the code” line.
- No violence, hate, adult content, phishing, malware, or collecting personal data.
- Honor the friendly chat with the creator when provided.

Quality bar (games / interactive demos MUST meet all):
1. Something visible moves or appears within 1 second (not a blank colored screen with only a score label).
2. Player has clear controls (keyboard AND pointer/touch when it makes sense).
3. A game loop via requestAnimationFrame (or setInterval for simple tools).
4. Collision / win / lose / score logic actually updates the DOM or canvas.
5. Entities spawn and stay on-screen; draw them every frame (canvas) or keep DOM nodes in sync.
6. CSS sizes the play area (min-height ~70vh or fixed canvas). Canvas must have width/height attributes AND CSS size.
7. script.js must run without thrown errors on load — define variables before use; wait for DOM if needed.
8. Prefer ~80–250 lines of clear JS over tiny stubs. Incomplete “Score: 0” shells are failures.
9. Score / points may increase ONLY from a real player action (click, key, touch) or a real collision / collect / win event AFTER the player has interacted at least once. NEVER auto-increment score in the background (no setInterval/setTimeout that only does score += n; no requestAnimationFrame that increments score every frame). Leaving the game idle for 10+ seconds with no input MUST leave Score at 0. Falling objects must NOT award points if they hit a stationary default player position without prior input — spawn collectibles away from the start position, or gate scoring behind a playerMoved / hasInteracted flag.

For catch / collect games specifically:
- Draw the player (basket/paddle) every frame near the bottom.
- Spawn falling items on a timer; move them down; remove off-screen.
- On overlap, increase score and remove the item.
- Show live score text that changes.`;

const REPAIR_SYSTEM_PROMPT = `You are repairing or editing an existing Baiolo HTML+CSS+JS project.
Reply with JSON only:
{"title":"...","description":"...","category":"game|tool|experiment|demo","message":"...","files":{"index.html":"...","style.css":"...","script.js":"..."}}

Hard rules:
- Return a COMPLETE fixed set of files (index.html, style.css, script.js) — not a patch/diff.
- Keep the same game idea and title when possible; apply the creator’s latest request.
- "message" = one short friendly sentence naming the change you made (e.g. “Zmieniłem tło na zielone.” / “Added more coins.”). Match the creator’s language. Never use a generic static “I’m fixing the code so the game works.”
- Self-contained only: no frameworks, npm, CDNs, or external APIs.
- index.html must link ./style.css and ./script.js.
- English UI copy in the app.
- Common failure modes to fix:
  • Blank / empty playfield (only score or background) → draw player + entities every frame
  • Missing game loop → add requestAnimationFrame
  • Canvas never sized / never getContext → set width/height and draw
  • Variables used before declaration / null querySelector → guard and fix order
  • Coins/enemies never spawn or never move → spawn timer + velocity
  • No input wiring → keyboard + pointer/touch
  • Score never changes → collision checks that update DOM text
  • Score climbs by itself with no input → remove background score timers; award points only on collision/click/key
- Prefer repairing the provided code over rewriting from scratch, unless the code is an empty stub.
- If a live preview observation or JPEG is provided, treat it as ground truth for what is broken.
- If the creator clearly wants a different idea, rebuild to match the new brief (still fully playable).
- Output must be a working MVP someone can try in under a minute.`;

/** Fix truncated AI HTML so packaged ZIPs and previews stay consistent. */
export function sanitizeAiFiles(files: StarterFiles): StarterFiles {
  let html = files["index.html"] || "";
  html = html.replace(/href=["']style\.["']/gi, 'href="style.css"');
  html = html.replace(/href=["']\.\/style\.css["']/gi, 'href="style.css"');
  html = html.replace(/src=["']\.\/script\.js["']/gi, 'src="script.js"');
  html = html.replace(/src=["']script\.["']/gi, 'src="script.js"');

  if (
    files["style.css"]?.trim() &&
    !/href=["']style\.css["']/i.test(html) &&
    /<\/head>/i.test(html)
  ) {
    html = html.replace(
      /<\/head>/i,
      '<link rel="stylesheet" href="style.css" />\n</head>',
    );
  }
  if (
    files["script.js"]?.trim() &&
    !/<script[^>]+src=["']script\.js["']/i.test(html)
  ) {
    if (/<\/body>/i.test(html)) {
      html = html.replace(
        /<\/body>/i,
        '<script src="script.js"></script>\n</body>',
      );
    } else {
      html = `${html}\n<script src="script.js"></script>`;
    }
  }

  return {
    ...files,
    "index.html": html,
  };
}

/** Detect background score timers / per-frame score bumps without clear collision gating. */
export function hasSuspiciousAutoScore(js: string): boolean {
  // setInterval/setTimeout whose nearby body bumps score
  const timerRe = /set(?:Interval|Timeout)\s*\(/gi;
  let match: RegExpExecArray | null;
  while ((match = timerRe.exec(js))) {
    const slice = js.slice(match.index, match.index + 320);
    if (/score\s*(\+\+|\+=\s*[1-9]\d*)/i.test(slice)) {
      return true;
    }
  }

  // score++ / score += n in an rAF loop without collision/input keywords
  if (
    /requestAnimationFrame\s*\(/i.test(js) &&
    /score\s*(\+\+|\+=\s*[1-9]\d*)/i.test(js) &&
    !/\b(hit|collid|overlap|intersect|catch|collect|onClick|keydown|pointerdown|playerReady|hasInteract)/i.test(
      js,
    )
  ) {
    return true;
  }
  return false;
}
export function looksIncompletePlayable(
  files: StarterFiles,
  category: ProjectCategory = "game",
): boolean {
  if (category !== "game" && category !== "demo" && category !== "experiment") {
    return false;
  }
  const js = files["script.js"] || "";
  const html = files["index.html"] || "";
  if (js.trim().length < 120) return true;

  // Classic Baiolo failure: score label in HTML, no canvas, JS may still look "full".
  if (!/<canvas\b/i.test(html)) {
    if (
      /score\s*:\s*0/i.test(html) ||
      /getElementById\s*\(\s*['"]game['"]\s*\)/.test(js)
    ) {
      return true;
    }
  }

  const hasLoop = /requestAnimationFrame|setInterval\s*\(/.test(js);
  const hasInput =
    /addEventListener\s*\(\s*['"](?:key|pointer|touch|click|mouse)/.test(js) ||
    /\bon(?:keydown|keyup|pointer|touch|click)\b/.test(js + html);
  const drawsSomething =
    /\.(?:fillRect|arc|drawImage|fillText)\s*\(/.test(js) ||
    /createElement\s*\(/.test(js) ||
    /innerHTML\s*=/.test(js);
  return !hasLoop || !hasInput || !drawsSomething;
}

/**
 * Last-resort self-heal: replace Score:0 shells with a known-good playable game.
 * Safe to call from the browser after a build response.
 */
export function ensurePlayableFiles(
  files: StarterFiles,
  options?: { title?: string; brief?: string; category?: ProjectCategory },
): StarterFiles {
  const category = options?.category ?? "game";
  const sanitized = sanitizeAiFiles(files);
  const js = sanitized["script.js"] || "";

  // Replace idle auto-score games with a known-good catcher that gates on input.
  if (
    (category === "game" || category === "demo" || category === "experiment") &&
    hasSuspiciousAutoScore(js)
  ) {
    const title =
      (options?.title || "").trim().slice(0, 40) || "Coin Catcher";
    return sanitizeAiFiles(coinCatcherFiles(title));
  }

  if (!looksIncompletePlayable(sanitized, category)) return sanitized;

  const brief = options?.brief ?? "";
  const title =
    (options?.title || "").trim().slice(0, 40) ||
    (briefLooksLikeCatchGame(brief) ? "Coin Catcher" : "Baiolo Game");
  const blob = `${brief}\n${title}\n${sanitized["index.html"] || ""}`;

  if (
    briefLooksLikeCatchGame(blob) ||
    /catcher|coin|monet|koszyk/i.test(blob) ||
    !/<canvas\b/i.test(sanitized["index.html"] || "")
  ) {
    return sanitizeAiFiles(coinCatcherFiles(title));
  }

  const base = cloneStarterFiles("game");
  return sanitizeAiFiles({
    "index.html": base["index.html"]!.replace(/Cloud Tap/g, title),
    "style.css": base["style.css"]!,
    "script.js": base["script.js"]!,
  });
}

function formatFilesForPrompt(files: StarterFiles): string {
  const capped = truncateExistingFiles(files);
  return (["index.html", "style.css", "script.js"] as const)
    .filter((k) => capped[k])
    .map((k) => `--- ${k} ---\n${capped[k]}`)
    .join("\n\n");
}

function chatSystemPromptLocale(locale: string, repairing: boolean) {
  return chatSystemPrompt(locale, repairing);
}

export async function continueBuildChat(options: {
  prompt: string;
  messages: ChatMessage[];
  locale?: string;
  existingFiles?: StarterFiles | null;
}): Promise<ChatTurnResult> {
  const repairing = Boolean(options.existingFiles?.["index.html"]);
  const assistantTurns = options.messages.filter(
    (m) => m.role === "assistant",
  ).length;
  if (assistantTurns >= MAX_CHAT_ASSISTANT_TURNS) {
    return {
      status: "ready",
      message:
        options.locale === "pl"
          ? "Super, mam już wystarczająco — buduję."
          : "Great, that’s enough — I’ll build it now.",
    };
  }

  // Vague “fix it” with existing code → skip more chat and repair,
  // but acknowledge the *latest* user ask (never one static sentence forever).
  if (
    repairing &&
    (isFixIntent(options.prompt) ||
      options.messages.some((m) => isFixIntent(m.content)))
  ) {
    const userSaidBug = options.messages.some(
      (m) => m.role === "user" && isFixIntent(m.content),
    );
    if (userSaidBug || isFixIntent(options.prompt)) {
      if (assistantTurns >= 1 || isFixIntent(options.prompt)) {
        return {
          status: "ready",
          message: composeBuildAck({
            locale: options.locale,
            userText: latestUserText(options.prompt, options.messages),
            repairing: true,
          }),
        };
      }
    }
  }

  try {
    const history =
      options.messages.length === 0
        ? "(no chat yet — this is your first reply)"
        : options.messages
            .map(
              (m) =>
                `${m.role === "assistant" ? "Baiolo" : "Creator"}: ${m.content}`,
            )
            .join("\n");

    const { content } = await chatCompletionJson({
      system: chatSystemPromptLocale(options.locale || "en", repairing),
      user: `Creator’s idea:\n${options.prompt.slice(0, 2000)}\n\n${
        repairing
          ? "There is already code in the editor that needs improvement or fixing.\n\n"
          : ""
      }Chat so far:\n${history}\n\nDecide: ask one easy follow-up, or say you’re ready to build.`,
      temperature: 0.4,
      tier: "fast",
    });
    return parseChatTurnPayload(content);
  } catch {
    return {
      status: "ready",
      message:
        options.locale === "pl"
          ? "Dobra, buduję z tego co mam."
          : "Alright — I’ll build from what we have.",
    };
  }
}

export type BuildOptions = {
  categoryHint?: ProjectCategory | null;
  locale?: string;
  existingFiles?: StarterFiles | null;
  /** What the creator currently sees in the live preview. */
  previewInsight?: { summary: string; imageDataUrl?: string } | null;
};

export async function buildFromDescription(
  prompt: string,
  messages?: ChatMessage[],
  options?: BuildOptions,
): Promise<AiBuildResult> {
  const brief = composeBuildBrief(prompt, messages);
  const withCategory = options?.categoryHint
    ? `${brief}\n\nPreferred category: ${options.categoryHint}`
    : brief;
  const builderUrl = process.env.BUILDER_API_URL?.trim();
  if (builderUrl) {
    return buildViaExternal(builderUrl, withCategory, messages, options);
  }
  return buildViaLlm(withCategory, options?.existingFiles ?? null, options);
}

async function buildViaExternal(
  url: string,
  prompt: string,
  messages?: ChatMessage[],
  options?: BuildOptions,
): Promise<AiBuildResult> {
  const { callExternalBuilder } = await import("@/lib/builder-client");
  const secret = process.env.BUILDER_API_SECRET?.trim();
  const data = await callExternalBuilder(
    url,
    {
      prompt,
      messages,
      locale: options?.locale,
      categoryHint: options?.categoryHint ?? null,
      existingFiles: options?.existingFiles ?? null,
    },
    secret,
  );
  const parsed = parseAiBuildPayload(JSON.stringify(data));
  if (!parsed) throw new Error("builder_bad_payload");
  return { ...parsed, provider: "builder" };
}

async function buildViaLlm(
  brief: string,
  existingFiles: StarterFiles | null,
  options?: BuildOptions,
): Promise<AiBuildResult> {
  const repairing = Boolean(existingFiles?.["index.html"]);
  const preview = options?.previewInsight;
  const previewBlock = preview?.summary
    ? `\n\nLive preview observation (what the creator sees right now):\n${preview.summary}\n`
    : "";

  // Fast path: broken Score:0 / no-canvas shells → ship a working catcher immediately.
  if (
    repairing &&
    existingFiles &&
    looksIncompletePlayable(existingFiles, "game") &&
    (isFixIntent(brief) ||
      preview?.summary?.toLowerCase().includes("no canvas") ||
      preview?.summary?.toLowerCase().includes("blank") ||
      briefLooksLikeCatchGame(brief) ||
      /catcher|coin|monet/i.test(brief + (existingFiles["index.html"] || "")))
  ) {
    const titleMatch = existingFiles["index.html"]?.match(
      /<title>([^<]*)<\/title>/i,
    );
    const title = (titleMatch?.[1] || "Coin Catcher").trim().slice(0, 40);
    return {
      title,
      description:
        "Catch falling coins with a basket. Move with arrows or drag.",
      category: "game",
      files: sanitizeAiFiles(coinCatcherFiles(title)),
      provider: "openrouter",
      model: "baiolo-playable-fallback",
      tier: "quality",
      message: composeBuildAck({
        locale: options?.locale,
        userText: brief,
        repairing: true,
      }),
    };
  }

  const forceQuality =
    repairing || isFixIntent(brief) || Boolean(preview?.imageDataUrl);
  const tier: LlmTier = forceQuality ? "quality" : pickBuildTier(brief);
  const system = repairing ? REPAIR_SYSTEM_PROMPT : BUILD_SYSTEM_PROMPT;
  const filesBlock =
    repairing && existingFiles
      ? `\n\nCurrent project files to repair:\n${formatFilesForPrompt(existingFiles)}\n`
      : "";

  const visionHint = preview?.imageDataUrl
    ? "\nA JPEG of the live preview is attached — use it to see what is broken (blank screen, missing sprites, etc.).\n"
    : "";

  const userPrompt = repairing
    ? `Repair this Baiolo project so it is fully playable. Fix blank screens, missing sprites, broken loops, and dead controls.\n\nCreator request / brief:\n${brief}${previewBlock}${visionHint}${filesBlock}\nReturn complete fixed JSON files.`
    : `Build this Baiolo project as a complete playable MVP (not a stub):\n${brief}${previewBlock}`;

  const run = async (temperature: number, extraReminder?: string) => {
    const { content, provider, model } = await chatCompletionJson({
      system,
      user: extraReminder ? `${extraReminder}\n\n${userPrompt}` : userPrompt,
      temperature,
      tier,
      maxTokens: 12_000,
      imageDataUrl: preview?.imageDataUrl,
    });
    return { content, provider, model };
  };

  let last = await run(repairing ? 0.25 : 0.45);
  let parsed = parseAiBuildPayload(last.content);
  if (!parsed) {
    last = await run(
      0.2,
      "Your previous reply was invalid. Reply with valid JSON only and include working index.html, style.css, script.js.",
    );
    parsed = parseAiBuildPayload(last.content);
  }
  if (!parsed) throw new Error("llm_bad_payload");

  parsed = {
    ...parsed,
    files: ensurePlayableFiles(parsed.files, {
      title: parsed.title,
      brief,
      category: parsed.category,
    }),
  };

  if (looksIncompletePlayable(parsed.files, parsed.category)) {
    last = await run(
      0.2,
      "The previous build looked incomplete (blank playfield / no loop / no input / nothing drawn). Rebuild a COMPLETE playable version with visible entities, a game loop, and working controls. Include a <canvas> and draw every frame.",
    );
    const retry = parseAiBuildPayload(last.content);
    if (retry) {
      parsed = {
        ...retry,
        files: ensurePlayableFiles(retry.files, {
          title: retry.title,
          brief,
          category: retry.category,
        }),
      };
    }
  }

  parsed = {
    ...parsed,
    files: ensurePlayableFiles(parsed.files, {
      title: parsed.title,
      brief,
      category: parsed.category,
    }),
  };

  return {
    ...parsed,
    message:
      parsed.message ||
      composeBuildAck({
        locale: options?.locale,
        userText: brief,
        repairing,
      }),
    provider: last.provider,
    model: last.model,
    tier,
  };
}
