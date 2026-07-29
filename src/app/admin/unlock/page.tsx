"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/Button";
import { DictationField } from "@/components/ui/DictationField";
import { useSession } from "@/lib/session";
import { useT } from "@/lib/i18n/LocaleProvider";

/** Bootstrap: signed-in non-admin enters BAIOLO_ADMIN_CODE → profiles.role = admin. */
export default function AdminUnlockPage() {
  const t = useT();
  const router = useRouter();
  const { unlockAdmin } = useSession();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <>
      <SiteHeader showJoin={false} />
      <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-5 py-12">
        <h1 className="text-4xl font-extrabold">{t("admin.accessTitle")}</h1>
        <p className="mt-3 text-ink-muted">{t("admin.accessBody")}</p>
        <form
          className="mt-8"
          onSubmit={(e) => {
            e.preventDefault();
            void (async () => {
              setBusy(true);
              setError("");
              const ok = await unlockAdmin(code);
              setBusy(false);
              if (ok) {
                router.replace("/admin");
                router.refresh();
                return;
              }
              setError("That admin code didn’t work.");
            })();
          }}
        >
          <DictationField value={code} onChange={setCode} append={false}>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("admin.codePlaceholder")}
              className="min-h-14 w-full rounded-pill border-2 border-border px-5 text-lg focus:border-brand focus:outline-none"
              autoComplete="off"
            />
          </DictationField>
          {error && (
            <p className="mt-3 font-semibold text-danger">{error}</p>
          )}
          <Button
            type="submit"
            className="mt-6 w-full"
            size="l"
            disabled={busy}
          >
            {t("admin.unlock")}
          </Button>
        </form>
      </main>
    </>
  );
}
