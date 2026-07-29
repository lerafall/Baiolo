"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

function getSpeechRecognitionCtor() {
  if (typeof window === "undefined") return null;
  const w = window as SpeechWindow;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useSpeechDictation(options: {
  value: string;
  onChange: (next: string) => void;
  /** Append spoken text to existing value (default true for long fields). */
  append?: boolean;
}) {
  const { locale, t } = useLocale();
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const valueRef = useRef(options.value);
  const onChangeRef = useRef(options.onChange);
  const append = options.append !== false;

  useEffect(() => {
    valueRef.current = options.value;
  }, [options.value]);

  useEffect(() => {
    onChangeRef.current = options.onChange;
  }, [options.onChange]);

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognitionCtor()));
  }, []);

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.onend = null;
        rec.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError(t("dictation.unsupported"));
      return;
    }

    setError(null);
    stop();

    const recognition = new Ctor();
    recognition.lang = locale === "pl" ? "pl-PL" : "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    let committed = valueRef.current;
    let interim = "";

    recognition.onresult = (event) => {
      let finals = "";
      interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0]?.transcript ?? "";
        if (event.results[i].isFinal) finals += piece;
        else interim += piece;
      }
      if (finals) {
        const base = append && committed.trim() ? `${committed.trim()} ` : "";
        committed = `${base}${finals.trim()}`;
        onChangeRef.current(committed);
      } else if (interim) {
        const base = append && committed.trim() ? `${committed.trim()} ` : "";
        onChangeRef.current(`${base}${interim.trim()}`);
      }
    };

    recognition.onerror = (event) => {
      const code = event.error || "";
      if (code === "not-allowed" || code === "service-not-allowed") {
        setError(t("dictation.permission"));
      } else if (code === "no-speech") {
        setError(t("dictation.noSpeech"));
      } else if (code && code !== "aborted") {
        setError(t("dictation.failed"));
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    try {
      recognition.start();
      setListening(true);
    } catch {
      setError(t("dictation.failed"));
      setListening(false);
    }
  }, [append, locale, stop, t]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { supported, listening, error, start, stop, toggle };
}
