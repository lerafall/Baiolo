"use client";

import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/LocaleProvider";
import { reportReasons } from "@/lib/report-reasons";

export function SafetyBody() {
  const t = useT();

  const items = [
    { title: t("safety.checkTitle"), body: t("safety.checkBody") },
    { title: t("safety.reportTitle"), body: t("safety.reportBody") },
    { title: t("safety.chatTitle"), body: t("safety.chatBody") },
    { title: t("safety.kindTitle"), body: t("safety.kindBody") },
  ];

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 md:px-8">
      <h1 className="text-4xl font-extrabold">{t("safety.headline")}</h1>
      <p className="mt-3 text-lg text-ink-muted">{t("safety.sub")}</p>

      <section className="mt-10 space-y-6">
        {items.map((item) => (
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
        <h2 className="text-2xl font-extrabold">{t("safety.howTitle")}</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-ink-muted">
          <li>{t("safety.how1")}</li>
          <li>{t("safety.how2")}</li>
          <li>{t("safety.how3")}</li>
        </ol>
        <p className="mt-4 text-sm font-bold text-ink">{t("safety.reasonsLabel")}</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {reportReasons.map((r) => (
            <li
              key={r.id}
              className="rounded-pill bg-surface px-3 py-1 text-sm font-bold text-brand-strong shadow-[var(--shadow-1)]"
            >
              {t(`report.${r.id}`)}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-ink-muted">{t("safety.reviewNote")}</p>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button href="/explore" size="l">
          {t("safety.exploreSafely")}
        </Button>
        <Button href="/create" variant="secondary" size="l">
          {t("projects.addProject")}
        </Button>
      </div>
    </main>
  );
}
