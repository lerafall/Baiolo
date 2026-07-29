import JSZip from "jszip";
import type { RiskLevel } from "@/lib/moderation";
import { chatCompletionJson, resolveLlmChatConfig } from "@/lib/llm";

export type CodeReviewFinding = {
  severity: "info" | "warn" | "block";
  message: string;
};

export type CodeReviewResult = {
  ok: boolean;
  risk: RiskLevel;
  flags: string[];
  findings: CodeReviewFinding[];
  summary: string;
  fileCount: number;
  hasIndexHtml: boolean;
  source: "static" | "static+ai";
};

const TEXT_EXT = /\.(html?|css|js|mjs|cjs|json|txt|md|svg)$/i;
const MAX_FILES = 80;
const MAX_CHARS_PER_FILE = 40_000;
const MAX_TOTAL_CHARS = 180_000;

function shouldSkip(name: string) {
  const base = name.split("/").pop() || "";
  return (
    name.includes("__MACOSX/") ||
    base.startsWith(".") ||
    base === "Thumbs.db" ||
    base === "desktop.ini"
  );
}

function sharedRootPrefix(paths: string[]) {
  if (paths.length === 0) return "";
  const first = paths[0];
  const slash = first.indexOf("/");
  if (slash <= 0) return "";
  const prefix = first.slice(0, slash + 1);
  return paths.every((p) => p.startsWith(prefix)) ? prefix : "";
}

/** Heuristic scan of ZIP text sources for common play/safety problems. */
export async function reviewZipBytes(
  bytes: Uint8Array,
  meta?: { title?: string; description?: string },
): Promise<CodeReviewResult> {
  const findings: CodeReviewFinding[] = [];
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    return {
      ok: false,
      risk: "high",
      flags: ["ZIP could not be opened"],
      findings: [
        { severity: "block", message: "The uploaded ZIP is damaged or not a ZIP." },
      ],
      summary: "Could not open the package.",
      fileCount: 0,
      hasIndexHtml: false,
      source: "static",
    };
  }

  const entryNames = Object.keys(zip.files).filter(
    (name) => !zip.files[name].dir && !shouldSkip(name),
  );
  const prefix = sharedRootPrefix(entryNames);
  const relatives = entryNames.map((n) => (prefix ? n.slice(prefix.length) : n));
  const hasIndexHtml = relatives.some(
    (r) =>
      r.toLowerCase() === "index.html" || r.toLowerCase() === "index.htm",
  );

  if (!hasIndexHtml) {
    findings.push({
      severity: "block",
      message: "Missing index.html at the package root (after unzip).",
    });
  }

  if (entryNames.length === 0) {
    findings.push({
      severity: "block",
      message: "The ZIP is empty.",
    });
  }

  let totalChars = 0;
  let scanned = 0;
  const snippets: string[] = [];

  for (const name of entryNames) {
    if (scanned >= MAX_FILES) break;
    const relative = prefix ? name.slice(prefix.length) : name;
    if (!TEXT_EXT.test(relative)) continue;
    scanned += 1;
    const text = await zip.files[name].async("string");
    const clipped = text.slice(0, MAX_CHARS_PER_FILE);
    totalChars += clipped.length;
    if (totalChars > MAX_TOTAL_CHARS) break;
    snippets.push(`--- ${relative} ---\n${clipped}`);

    const lower = clipped.toLowerCase();
    if (/eval\s*\(|new\s+function\s*\(|document\.write\s*\(/i.test(clipped)) {
      findings.push({
        severity: "warn",
        message: `${relative}: uses eval/Function/document.write — check carefully.`,
      });
    }
    if (/<script[^>]+src=["']https?:\/\//i.test(clipped)) {
      findings.push({
        severity: "warn",
        message: `${relative}: loads an external script — confirm it is safe.`,
      });
    }
    if (/localstorage|indexeddb|document\.cookie/i.test(lower)) {
      findings.push({
        severity: "info",
        message: `${relative}: stores data in the browser.`,
      });
    }
    if (/getusermedia|microphone|webcam|geolocation/i.test(lower)) {
      findings.push({
        severity: "warn",
        message: `${relative}: may ask for camera, mic, or location.`,
      });
    }
    if (
      /window\.addEventListener\(\s*['"]pointer(move|up)/i.test(clipped) &&
      !/setPointerCapture/i.test(clipped)
    ) {
      findings.push({
        severity: "warn",
        message: `${relative}: pointer listeners on window may break drag inside Baiolo iframe.`,
      });
    }
    if (/object-fit\s*:\s*contain/i.test(clipped)) {
      findings.push({
        severity: "info",
        message: `${relative}: object-fit:contain on canvas can break mouse hit-testing (Baiolo can patch this).`,
      });
    }
    if (/(kill|blood|gore|nsfw|hate)/i.test(clipped)) {
      findings.push({
        severity: "warn",
        message: `${relative}: possible unsafe wording in code/copy.`,
      });
    }
  }

  const blob = `${meta?.title ?? ""} ${meta?.description ?? ""}`.toLowerCase();
  if (/(kill|blood|gore|hate|nsfw|sex)/.test(blob)) {
    findings.push({
      severity: "warn",
      message: "Title/description may contain unsafe words.",
    });
  }

  let source: CodeReviewResult["source"] = "static";
  if (resolveLlmChatConfig() && snippets.length > 0) {
    try {
      const aiFindings = await askLlmReview(snippets.slice(0, 12).join("\n\n"));
      findings.push(...aiFindings);
      source = "static+ai";
    } catch {
      findings.push({
        severity: "info",
        message: "AI model was unavailable — used static checks only.",
      });
    }
  }

  const hasBlock = findings.some((f) => f.severity === "block");
  const warnCount = findings.filter((f) => f.severity === "warn").length;
  const risk: RiskLevel = hasBlock
    ? "high"
    : warnCount >= 2
      ? "high"
      : warnCount === 1
        ? "medium"
        : "low";

  const flags = findings
    .filter((f) => f.severity !== "info")
    .map((f) => f.message)
    .slice(0, 12);

  const ok = !hasBlock;
  const summary = ok
    ? source === "static+ai"
      ? "Static + AI check finished. Review the notes, then play the game."
      : "Static check finished. AI review is optional when a model provider is configured on the server."
    : "Blocking issues found — ask for changes before publish.";

  return {
    ok,
    risk,
    flags: flags.length ? flags : ok ? [] : ["Package needs fixes"],
    findings,
    summary,
    fileCount: entryNames.length,
    hasIndexHtml,
    source,
  };
}

async function askLlmReview(
  codeBundle: string,
): Promise<CodeReviewFinding[]> {
  const { content } = await chatCompletionJson({
    system:
      "You review small static HTML/CSS/JS MVPs for Baiolo. Reply with JSON only: {\"findings\":[{\"severity\":\"info|warn|block\",\"message\":\"...\"}]}. Focus on malware, phishing, extreme content, broken play controls, and iframe issues. Max 8 findings. Be concise.",
    user: codeBundle.slice(0, 100_000),
    temperature: 0.2,
    tier: "fast",
  });
  const parsed = JSON.parse(content || "{}") as {
    findings?: Array<{ severity?: string; message?: string }>;
  };
  return (parsed.findings ?? [])
    .filter((f) => f.message)
    .map((f) => ({
      severity:
        f.severity === "block" || f.severity === "warn" || f.severity === "info"
          ? f.severity
          : "warn",
      message: String(f.message),
    }));
}

export function reviewLinkPackage(url: string): CodeReviewResult {
  const findings: CodeReviewFinding[] = [
    {
      severity: "warn",
      message:
        "External link — open the URL yourself and confirm it is safe and playable.",
    },
  ];
  if (!/^https:\/\//i.test(url)) {
    findings.push({
      severity: "block",
      message: "Play links must use https://",
    });
  }
  const hasBlock = findings.some((f) => f.severity === "block");
  return {
    ok: !hasBlock,
    risk: hasBlock ? "high" : "medium",
    flags: findings.map((f) => f.message),
    findings,
    summary: "Link packages need a manual open + play check.",
    fileCount: 0,
    hasIndexHtml: false,
    source: "static",
  };
}
