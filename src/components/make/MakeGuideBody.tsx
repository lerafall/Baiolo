"use client";

import { Button } from "@/components/ui/Button";
import { CopyBuildPrompt } from "@/components/make/CopyBuildPrompt";
import { useT } from "@/lib/i18n/LocaleProvider";

export function MakeGuideBody() {
  const t = useT();

  const steps = [
    {
      n: "1",
      title: t("make.step1Title"),
      body: t("make.step1Body"),
    },
    {
      n: "2",
      title: t("make.step2Title"),
      body: t("make.step2Body"),
    },
    {
      n: "3",
      title: t("make.step3Title"),
      body: t("make.step3Body"),
    },
  ];

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 md:px-8">
      <p className="text-sm font-bold uppercase tracking-wide text-brand-strong">
        {t("make.eyebrow")}
      </p>
      <h1 className="mt-2 text-4xl font-extrabold leading-tight">
        {t("make.headline")}
      </h1>
      <p className="mt-3 text-lg text-ink-muted">{t("make.sub")}</p>

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
        <h2 className="text-2xl font-extrabold">{t("make.yourPrompt")}</h2>
        <p className="mt-2 text-ink-muted">{t("make.yourPromptSub")}</p>
        <div className="mt-5">
          <CopyBuildPrompt />
        </div>
      </section>

      <section className="mt-12 rounded-xl bg-lilac/45 p-6 text-center shadow-[var(--shadow-1)]">
        <p className="text-2xl font-extrabold">{t("make.gotZip")}</p>
        <p className="mt-2 text-ink-muted">{t("make.gotZipBody")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button href="/create" size="l">
            {t("make.openCreate")}
          </Button>
          <Button href="/explore" variant="secondary" size="l">
            {t("make.peekExamples")}
          </Button>
        </div>
      </section>
    </main>
  );
}
