import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/Button";
import { HomeLiveStrip } from "@/components/home/HomeLiveStrip";
import { projects } from "@/lib/data/projects";
import { rankProjects } from "@/lib/ranking";
import { thumbBackgroundStyle } from "@/lib/thumb-style";

export default function LandingPage() {
  const samples = rankProjects(projects, 3).map((r) => r.project);

  return (
    <>
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#e0cfff_0%,_transparent_55%),radial-gradient(ellipse_at_bottom_left,_#b8fff3_0%,_transparent_50%)]"
          />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-2 md:items-center md:gap-12 md:px-8 md:py-20">
            <div>
              <p className="text-4xl font-extrabold tracking-tight text-brand-strong md:text-5xl">
                Baiolo
              </p>
              <h1 className="mt-4 max-w-xl text-3xl font-extrabold leading-tight text-ink md:text-4xl">
                Share little ideas. Let people play. See what they love.
              </h1>
              <p className="mt-4 max-w-lg text-lg text-ink-muted">
                Baiolo is a playful place to share prototypes, test ideas, and
                find what people love.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button href="/explore" size="l">
                  Start exploring
                </Button>
                <Button href="/create" variant="secondary" size="l">
                  Add your project
                </Button>
              </div>
            </div>

            <div className="relative min-h-[320px] rounded-xl bg-lilac/40 p-6 shadow-[var(--shadow-2)] md:min-h-[420px]">
              <div className="animate-floaty absolute right-8 top-8 size-14 rounded-full bg-sun shadow-[var(--shadow-1)]" />
              <div className="absolute right-24 top-16 size-4 rounded-full bg-accent-coral" />
              <div className="mt-8 space-y-4">
                {samples.map((p, i) => (
                  <div
                    key={p.id}
                    className="animate-rise origin-center"
                    style={{
                      transform: `translateX(${i * 12}px) rotate(${(i - 1) * 2}deg)`,
                      animationDelay: `${i * 80}ms`,
                    }}
                  >
                    <Link
                      href={`/play/${p.id}`}
                      className="block rounded-lg border border-border bg-surface p-3 shadow-[var(--shadow-1)] transition-transform duration-200 ease-out hover:z-10 hover:scale-[1.05] hover:shadow-[var(--shadow-2)] focus-visible:z-10 focus-visible:scale-[1.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    >
                      <div
                        className="mb-2 h-16 rounded-md bg-cover bg-center"
                        style={thumbBackgroundStyle(p.thumbnail)}
                        role="img"
                        aria-label={`${p.title} preview`}
                      />
                      <p className="font-extrabold text-ink">{p.title}</p>
                      <p className="text-sm text-ink-muted">{p.tagline}</p>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-surface/70 py-16">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <h2 className="text-3xl font-extrabold text-ink">How it works</h2>
            <p className="mt-2 text-lg text-ink-muted">
              Three simple steps. No heavy dashboards.
            </p>
            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              {[
                {
                  n: "1",
                  title: "Share a tiny idea",
                  body: "Upload a ZIP, paste a link, or start from a friendly template.",
                },
                {
                  n: "2",
                  title: "People play and react",
                  body: "Soft signals — plays and quick feelings — not heavy metrics.",
                },
                {
                  n: "3",
                  title: "Decide what to build next",
                  body: "See what people love, then keep going or try something new.",
                },
              ].map((step) => (
                <li
                  key={step.n}
                  className="rounded-xl bg-canvas p-6 shadow-[var(--shadow-1)]"
                >
                  <span className="inline-flex size-10 items-center justify-center rounded-full bg-brand text-lg font-extrabold text-on-brand">
                    {step.n}
                  </span>
                  <h3 className="mt-4 text-xl font-extrabold">{step.title}</h3>
                  <p className="mt-2 text-ink-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <HomeLiveStrip />

        <section className="bg-lilac/35 py-16">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 md:grid-cols-2 md:px-8">
            <div className="rounded-xl bg-surface p-8 shadow-[var(--shadow-1)]">
              <h2 className="text-2xl font-extrabold">For creators</h2>
              <p className="mt-3 text-ink-muted">
                Publish in minutes. See plays and reactions. Decide if the idea
                deserves another weekend.
              </p>
              <Button href="/create" className="mt-6">
                Add your project
              </Button>
            </div>
            <div className="rounded-xl bg-surface p-8 shadow-[var(--shadow-1)]">
              <h2 className="text-2xl font-extrabold">For explorers</h2>
              <p className="mt-3 text-ink-muted">
                Browse colorful cards, tap Play, leave a quick reaction. No
                long forms.
              </p>
              <Button href="/explore" className="mt-6">
                Start exploring
              </Button>
            </div>
          </div>
        </section>

        <section className="border-t border-border py-12">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 md:flex-row md:items-center md:px-8">
            <div>
              <p className="text-2xl font-extrabold text-brand-strong">Ready?</p>
              <p className="mt-1 text-ink-muted">
                A playful home for mini games, MVPs, and experiments.
              </p>
            </div>
            <Button href="/auth?next=%2Fexplore" variant="secondary">
              Join Baiolo
            </Button>
          </div>
        </section>
      </main>
    </>
  );
}
