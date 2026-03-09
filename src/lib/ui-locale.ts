"use client";

import { useEffect, useState } from "react";

export type UiLocale = "ja" | "en";

const STORAGE_KEY = "meisi-ui-locale";
const CHANGE_EVENT = "meisi-ui-locale-change";

function normalizeLocale(value: string | null): UiLocale {
  return value === "en" ? "en" : "ja";
}

export function useUiLocale() {
  const [locale, setLocaleState] = useState<UiLocale>(() => {
    if (typeof window === "undefined") {
      return "ja";
    }
    return normalizeLocale(window.localStorage.getItem(STORAGE_KEY));
  });

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setLocaleState(normalizeLocale(event.newValue));
      }
    };

    const onLocaleChange = () => {
      setLocaleState(normalizeLocale(window.localStorage.getItem(STORAGE_KEY)));
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(CHANGE_EVENT, onLocaleChange);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CHANGE_EVENT, onLocaleChange);
    };
  }, []);

  const setLocale = (nextLocale: UiLocale) => {
    setLocaleState(nextLocale);
    window.localStorage.setItem(STORAGE_KEY, nextLocale);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return { locale, setLocale };
}
