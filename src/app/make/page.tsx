import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/Button";
import { CopyBuildPrompt } from "@/components/make/CopyBuildPrompt";

export const metadata: Metadata = {
  title: "How to make an MVP",
  description: "Copy a prompt, add your idea, upload a ZIP. That simple.",
};

const steps = [
  {
    n: "1",
    title: "Copy the prompt",
    body: "One tap. It already knows how Baiolo likes things packaged.",
  },
  {
    n: "2",
    title: "Write your idea in the [brackets]",
    body: "Paste into any AI chat. Replace [your idea here] with a few fun sentences.",
  },
  {
    n: "3",
    title: "Upload the package",
    body: "Zip what the AI gives you, then drop it on Create. You’re done.",
  },
];

export default function MakeGuidePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl px-5 py-12 md:px-8">
        <p className="text-sm font-bold uppercase tracking-wide text-brand-strong">
          Super simple
        </p>
        <h1 className="mt-2 text-4xl font-extrabold leading-tight">
          Make something in 3 steps
        </h1>
        <p className="mt-3 text-lg text-ink-muted">
          You don’t need to be a developer. Copy → idea → upload. That’s the whole
          recipe.
        </p>

        <ol className="mt-10 space-y-4">
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

        <section id="prompt" className="mt-12 scroll-mt-24">
          <h2 className="text-2xl font-extrabold">Your prompt</h2>
          <p className="mt-2 text-ink-muted">
            Copy it, fill the brackets, send. The AI does the building.
          </p>
          <div className="mt-5">
            <CopyBuildPrompt />
          </div>
        </section>

        <section className="mt-12 rounded-xl bg-lilac/45 p-6 text-center shadow-[var(--shadow-1)]">
          <p className="text-2xl font-extrabold">Got a ZIP?</p>
          <p className="mt-2 text-ink-muted">Drop it in Create and share the fun.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button href="/create" size="l">
              Open Create
            </Button>
            <Button href="/explore" variant="secondary" size="l">
              Peek at examples
            </Button>
          </div>
        </section>
      </main>
    </>
  );
}
