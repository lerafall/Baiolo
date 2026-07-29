"use client";

import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n/LocaleProvider";
import { useSpeechDictation } from "@/lib/use-speech-dictation";

type DictationButtonProps = {
  value: string;
  onChange: (next: string) => void;
  /** Append spoken words (default true). Set false to replace (e.g. short search). */
  append?: boolean;
  className?: string;
  disabled?: boolean;
};

export function DictationButton({
  value,
  onChange,
  append = true,
  className,
  disabled,
}: DictationButtonProps) {
  const t = useT();
  const { supported, listening, error, toggle } = useSpeechDictation({
    value,
    onChange,
    append,
  });

  if (!supported) return null;

  return (
    <div className={cn("inline-flex shrink-0 flex-col items-center", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={listening}
        aria-label={listening ? t("dictation.stop") : t("dictation.start")}
        title={listening ? t("dictation.stop") : t("dictation.start")}
        onClick={toggle}
        className={cn(
          "inline-flex size-11 items-center justify-center rounded-full border-2 text-lg font-bold transition-all",
          listening
            ? "animate-pulse border-accent-coral bg-accent-coral/20 text-accent-coral"
            : "border-border bg-surface text-ink-muted hover:border-brand hover:text-brand-strong",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <span aria-hidden>{listening ? "⏹" : "🎤"}</span>
      </button>
      {error && (
        <p className="mt-1 max-w-[7.5rem] text-center text-[11px] font-semibold leading-tight text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

type DictationFieldProps = {
  value: string;
  onChange: (next: string) => void;
  append?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
};

/** Text control + mic button in one row. */
export function DictationField({
  value,
  onChange,
  append = true,
  disabled,
  className,
  children,
}: DictationFieldProps) {
  return (
    <div className={cn("flex items-start gap-2", className)}>
      <div className="min-w-0 flex-1">{children}</div>
      <DictationButton
        value={value}
        onChange={onChange}
        append={append}
        disabled={disabled}
        className="mt-0.5"
      />
    </div>
  );
}
