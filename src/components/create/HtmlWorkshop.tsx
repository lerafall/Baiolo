"use client";

import { useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  cloneStarterFiles,
  HTML_STARTERS,
  buildPreviewHtml,
  type StarterFiles,
  type StarterId,
} from "@/lib/html-starters";
import { useT } from "@/lib/i18n/LocaleProvider";

type HtmlWorkshopProps = {
  files: StarterFiles;
  onFilesChange: (files: StarterFiles) => void;
  starterId?: StarterId;
  onStarterChange?: (id: StarterId) => void;
  showStarterPicker?: boolean;
};

export function HtmlWorkshop({
  starterId = "game",
  files,
  onStarterChange,
  onFilesChange,
  showStarterPicker = true,
}: HtmlWorkshopProps) {
  const t = useT();
  const fileNames = useMemo(() => Object.keys(files), [files]);
  const [activeFile, setActiveFile] = useState(fileNames[0] || "index.html");
  const [previewKey, setPreviewKey] = useState(0);
  const [mobilePane, setMobilePane] = useState<"code" | "preview">("code");

  useEffect(() => {
    if (!files[activeFile] && fileNames[0]) {
      setActiveFile(fileNames[0]);
    }
  }, [activeFile, fileNames, files]);

  const previewSrcDoc = useMemo(() => buildPreviewHtml(files), [files]);

  function refreshPreview() {
    setPreviewKey((k) => k + 1);
  }

  function pickStarter(id: StarterId) {
    onStarterChange?.(id);
    onFilesChange(cloneStarterFiles(id));
    setActiveFile("index.html");
    setPreviewKey((k) => k + 1);
  }

  const language =
    activeFile.endsWith(".css")
      ? "css"
      : activeFile.endsWith(".js")
        ? "javascript"
        : "html";

  return (
    <div className="space-y-4">
      {showStarterPicker && (
        <div>
          <p className="text-lg font-bold">{t("workshop.pickStarter")}</p>
          <p className="mt-1 text-ink-muted">{t("workshop.pickStarterSub")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(Object.keys(HTML_STARTERS) as StarterId[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => pickStarter(id)}
                className={cn(
                  "min-h-11 rounded-pill border-2 px-4 text-sm font-bold",
                  starterId === id
                    ? "border-brand bg-brand text-on-brand"
                    : "border-border bg-canvas text-ink-muted",
                )}
              >
                {t(`workshop.starter.${id}` as "workshop.starter.game")}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 md:hidden">
        <Button
          type="button"
          size="m"
          variant={mobilePane === "code" ? "primary" : "secondary"}
          onClick={() => setMobilePane("code")}
        >
          {t("workshop.code")}
        </Button>
        <Button
          type="button"
          size="m"
          variant={mobilePane === "preview" ? "primary" : "secondary"}
          onClick={() => setMobilePane("preview")}
        >
          {t("workshop.preview")}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div
          className={cn(
            "overflow-hidden rounded-xl border-2 border-border bg-[#1e1e1e] shadow-[var(--shadow-1)]",
            mobilePane !== "code" && "hidden md:block",
          )}
        >
          <div className="flex flex-wrap gap-1 border-b border-white/10 bg-[#252526] p-2">
            {fileNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setActiveFile(name)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-bold",
                  activeFile === name
                    ? "bg-brand text-on-brand"
                    : "text-white/70 hover:bg-white/10",
                )}
              >
                {name}
              </button>
            ))}
          </div>
          <Editor
            height="360px"
            theme="vs-dark"
            path={activeFile}
            language={language}
            value={files[activeFile] ?? ""}
            onChange={(value) => {
              onFilesChange({
                ...files,
                [activeFile]: value ?? "",
              });
            }}
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              wordWrap: "on",
              automaticLayout: true,
              scrollBeyondLastLine: false,
              tabSize: 2,
              padding: { top: 12 },
            }}
          />
        </div>

        <div
          className={cn(
            "flex flex-col overflow-hidden rounded-xl border-2 border-border bg-surface shadow-[var(--shadow-1)]",
            mobilePane !== "preview" && "hidden md:flex",
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <p className="text-sm font-bold">{t("workshop.livePreview")}</p>
            <Button type="button" size="m" variant="secondary" onClick={refreshPreview}>
              {t("workshop.refresh")}
            </Button>
          </div>
          <iframe
            key={previewKey}
            title={t("workshop.livePreview")}
            srcDoc={previewSrcDoc}
            className="min-h-[360px] w-full flex-1 bg-canvas"
            sandbox="allow-scripts"
          />
        </div>
      </div>

      <p className="text-sm text-ink-muted">{t("workshop.hint")}</p>
    </div>
  );
}
