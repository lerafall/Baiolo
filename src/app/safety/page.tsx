import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/Button";
import { reportReasons } from "@/lib/report-reasons";

export const metadata = {
  title: "Stay safe",
};

export default function SafetyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl px-5 py-12 md:px-8">
        <h1 className="text-4xl font-extrabold">Stay safe on Baiolo</h1>
        <p className="mt-3 text-lg text-ink-muted">
          Baiolo is a playful place for testing ideas. Everyone should feel
          welcome and protected — kids, teens, and adults.
        </p>

        <section className="mt-10 space-y-6">
          {[
            {
              title: "Nothing goes public without a check",
              body: "Every project is checked automatically, then reviewed by a Baiolo teammate before it can appear in Explore.",
            },
            {
              title: "Report anything that feels wrong",
              body: "On every project page you can tap Report. We’ll look into it and may hide the project.",
            },
            {
              title: "No private chat in MVP",
              body: "There are no DMs or open chats yet — that keeps things simpler and safer.",
            },
            {
              title: "Be kind with feedback",
              body: "Short, helpful reactions help creators grow. Mean or scary content isn’t allowed.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl bg-surface p-6 shadow-[var(--shadow-1)]"
            >
              <h2 className="text-xl font-extrabold">{item.title}</h2>
              <p className="mt-2 text-ink-muted">{item.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-10 rounded-xl bg-lilac/40 p-6 shadow-[var(--shadow-1)]">
          <h2 className="text-2xl font-extrabold">How to report</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-ink-muted">
            <li>Open the project.</li>
            <li>Tap Report project.</li>
            <li>Pick a reason and confirm.</li>
          </ol>
          <p className="mt-4 text-sm font-bold text-ink">Reasons you can pick:</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {reportReasons.map((r) => (
              <li
                key={r.id}
                className="rounded-pill bg-surface px-3 py-1 text-sm font-bold text-brand-strong shadow-[var(--shadow-1)]"
              >
                {r.label}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-ink-muted">
            A Baiolo teammate will review the report. You can keep exploring.
          </p>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button href="/explore" size="l">
            Explore safely
          </Button>
          <Button href="/create" variant="secondary" size="l">
            Add your project
          </Button>
        </div>
      </main>
    </>
  );
}
