import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/Button";
import { CopyBuildPrompt } from "@/components/make/CopyBuildPrompt";

export const metadata: Metadata = {
  title: "How to make an MVP",
  description:
    "Simple steps and a ready AI prompt to build a Baiolo-ready game or tool.",
};

const steps = [
  {
    n: "1",
    title: "Copy the prompt",
    body: "Use the box below. It tells the AI exactly how to package a Baiolo MVP.",
  },
  {
    n: "2",
    title: "Describe your idea",
    body: "Replace the last line with 2–5 sentences: what the player does and what “fun” means.",
  },
  {
    n: "3",
    title: "Get a static folder",
    body: "You should receive HTML + CSS + JS with index.html at the root — no install, no server.",
  },
  {
    n: "4",
    title: "Zip the files",
    body: "Select the files inside the folder (so index.html is at the ZIP root), then zip them.",
  },
  {
    n: "5",
    title: "Add a screenshot",
    body: "Capture the running game screen. On Baiolo, upload it as the card thumbnail.",
  },
  {
    n: "6",
    title: "Submit on Baiolo",
    body: "Create → Upload ZIP (or Paste link if you host it). Wait for checking, then Play.",
  },
];

export default function MakeGuidePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-5 py-12 md:px-8">
        <p className="text-sm font-bold uppercase tracking-wide text-brand-strong">
          Creator guide
        </p>
        <h1 className="mt-2 text-4xl font-extrabold">How to make a Baiolo MVP</h1>
        <p className="mt-3 text-lg text-ink-muted">
          Keep it tiny, static, and playable in the browser. AI can build it —
          you just package and share.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button href="#prompt" size="l">
            Jump to prompt
          </Button>
          <Button href="/create" variant="secondary" size="l">
            Open Create
          </Button>
        </div>

        {/* Simple flow diagram */}
        <section className="mt-12 overflow-hidden rounded-xl bg-lilac/40 p-6 shadow-[var(--shadow-1)]">
          <h2 className="text-2xl font-extrabold">The whole path</h2>
          <p className="mt-1 text-ink-muted">One glance. Left → right.</p>
          <ol className="mt-6 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-stretch md:gap-2">
            {[
              "Idea",
              "AI + prompt",
              "Folder",
              "ZIP",
              "Screenshot",
              "Baiolo",
              "Play",
            ].map((label, i, arr) => (
              <li key={label} className="flex items-center gap-2 md:flex-1">
                <div className="flex min-h-16 flex-1 items-center justify-center rounded-xl bg-surface px-3 py-3 text-center text-sm font-extrabold shadow-[var(--shadow-1)]">
                  {label}
                </div>
                {i < arr.length - 1 && (
                  <span
                    className="hidden text-xl font-extrabold text-brand-strong md:inline"
                    aria-hidden
                  >
                    →
                  </span>
                )}
                {i < arr.length - 1 && (
                  <span
                    className="text-xl font-extrabold text-brand-strong md:hidden"
                    aria-hidden
                  >
                    ↓
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-extrabold">Steps</h2>
          <ol className="mt-6 space-y-4">
            {steps.map((step) => (
              <li
                key={step.n}
                className="flex gap-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-1)]"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-extrabold text-on-brand">
                  {step.n}
                </span>
                <div>
                  <p className="text-xl font-extrabold">{step.title}</p>
                  <p className="mt-1 text-ink-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-extrabold">Folder shape</h2>
          <p className="mt-2 text-ink-muted">
            This is what “ready for Baiolo” looks like:
          </p>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-ink px-5 py-4 font-mono text-sm leading-relaxed text-on-brand shadow-[var(--shadow-1)]">{`my-fun-game/
  index.html     ← must be here (root)
  style.css
  script.js
  thumb.png      ← card screenshot (4:3)
  cover.png      ← wide screenshot (16:9)
  assets/        ← optional images/sounds
  README.md`}</pre>
          <div className="mt-4 rounded-xl bg-mint/40 p-5">
            <p className="font-extrabold">Zip tip</p>
            <p className="mt-1 text-ink-muted">
              Open the folder → select the files inside → compress. After unzip,
              you should see <code className="font-bold">index.html</code>,{" "}
              <code className="font-bold">thumb.png</code>, and{" "}
              <code className="font-bold">cover.png</code> immediately — not
              another nested folder. Screenshots belong in the package, not only
              in the chat.
            </p>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-extrabold">Two ways to share</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-surface p-5 shadow-[var(--shadow-1)]">
              <p className="text-sm font-bold uppercase tracking-wide text-brand-strong">
                Best for quick share
              </p>
              <p className="mt-2 text-xl font-extrabold">Upload ZIP</p>
              <p className="mt-2 text-ink-muted">
                Baiolo stores it, checks it, and can unpack it for in-browser
                play after approve.
              </p>
            </div>
            <div className="rounded-xl bg-surface p-5 shadow-[var(--shadow-1)]">
              <p className="text-sm font-bold uppercase tracking-wide text-secondary-strong">
                Best for live demos
              </p>
              <p className="mt-2 text-xl font-extrabold">Paste link</p>
              <p className="mt-2 text-ink-muted">
                Host on GitHub Pages / Netlify / similar, then paste the{" "}
                <code className="font-bold">https://</code> URL.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-extrabold">Card screenshot</h2>
          <p className="mt-2 text-ink-muted">
            Explore cards should show a real screen from the game — not only a
            color gradient. Run the MVP, capture the main view, upload it in the
            thumbnail step.
          </p>
          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-lilac via-mint to-sun p-3 shadow-[var(--shadow-1)]">
              <div className="flex h-full items-center justify-center rounded-lg bg-ink/10 text-center text-sm font-bold text-ink">
                Real game screen
              </div>
            </div>
            <span className="text-2xl font-extrabold text-brand-strong" aria-hidden>
              →
            </span>
            <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-1)]">
              <div className="aspect-[4/3] rounded-lg bg-gradient-to-br from-lilac via-mint to-sun" />
              <p className="mt-3 font-extrabold">Your MVP</p>
              <p className="text-sm text-ink-muted">Shown on Explore cards</p>
            </div>
          </div>
        </section>

        <section id="prompt" className="mt-14 scroll-mt-24">
          <h2 className="text-2xl font-extrabold">Ready prompt</h2>
          <p className="mt-2 text-ink-muted">
            Copy once. Reuse for every new idea.
          </p>
          <div className="mt-6">
            <CopyBuildPrompt />
          </div>
        </section>

        <section className="mt-12 rounded-xl bg-lilac/45 p-6 text-center shadow-[var(--shadow-1)]">
          <p className="text-2xl font-extrabold">Ready to share?</p>
          <p className="mt-2 text-ink-muted">
            Upload your ZIP, add a screenshot, submit for checking.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button href="/create" size="l">
              Add your project
            </Button>
            <Button href="/explore" variant="secondary" size="l">
              Explore examples
            </Button>
          </div>
          <p className="mt-4 text-sm text-ink-muted">
            Prefer reading offline? See also{" "}
            <Link href="/safety" className="font-bold text-brand-strong underline">
              Stay safe
            </Link>
            .
          </p>
        </section>
      </main>
    </>
  );
}
