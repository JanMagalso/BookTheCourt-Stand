"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import {
  defaultThemeMode,
  defaultThemeName,
  getThemeVariables,
  isThemeName,
  isThemeMode,
  themeModeStorageKey,
  themeOptions,
  themeStorageKey,
  type ThemeMode,
  type ThemeName,
} from "@/lib/theme";

export function ThemeSwitcher() {
  const hasMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [isCompactMobile, setIsCompactMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>(() => {
    if (typeof window === "undefined") {
      return defaultThemeName;
    }

    const savedTheme = window.localStorage.getItem(themeStorageKey);
    return savedTheme && isThemeName(savedTheme) ? savedTheme : defaultThemeName;
  });
  const [selectedMode, setSelectedMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return defaultThemeMode;
    }

    const savedMode = window.localStorage.getItem(themeModeStorageKey);
    return savedMode && isThemeMode(savedMode) ? savedMode : defaultThemeMode;
  });

  useEffect(() => {
    applyTheme(selectedTheme, selectedMode);
    window.localStorage.setItem(themeStorageKey, selectedTheme);
    window.localStorage.setItem(themeModeStorageKey, selectedMode);
  }, [selectedMode, selectedTheme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 640px)");
    const syncViewport = () => {
      const nextIsCompactMobile = mediaQuery.matches;
      setIsCompactMobile(nextIsCompactMobile);
    };

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);

    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  if (!hasMounted) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[1300]">
      <div className="flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className={`inline-flex items-center justify-center gap-2 rounded-full border border-(--color-border-card) bg-[rgba(var(--color-surface-rgb),0.92)] text-(--color-text-primary) shadow-[0_20px_48px_rgba(var(--color-shadow-rgb),0.16)] backdrop-blur-xl transition hover:scale-[1.03] ${
            isCompactMobile ? "h-10 w-10 pr-2" : "min-h-11 px-4 py-2.5"
          }`}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close theme switcher" : "Open theme switcher"}
        >
          <span aria-hidden="true" className="text-lg leading-none">
            ◐
          </span>
          {!isCompactMobile ? (
            <span className="text-xs font-semibold uppercase tracking-[0.14em]">
              Theme
            </span>
          ) : null}
        </button>

        {isOpen ? (
          <div
            className={`rounded-[1.4rem] border border-(--color-border-card) bg-[rgba(var(--color-surface-rgb),0.9)] px-3 py-3 shadow-[0_20px_48px_rgba(var(--color-shadow-rgb),0.14)] backdrop-blur-xl transition-all duration-200 ${
              isCompactMobile ? "w-[calc(100vw-2rem)] max-w-[20rem]" : "w-auto"
            }`}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-(--color-text-soft)">
                  Theme
                </p>
                <p className="text-xs text-(--color-text-secondary)">
                  Switch the venue look
                </p>
              </div>
            </div>

            <div className="mb-3 inline-flex rounded-full border border-(--color-border-soft) bg-[rgba(var(--color-surface-rgb),0.68)] p-1">
              {(["light", "dark"] as const).map((mode) => {
                const isActive = selectedMode === mode;

                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSelectedMode(mode)}
                    className={`inline-flex min-h-9 items-center justify-center rounded-full px-3 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                      isActive
                        ? "bg-(--color-brand-strong) text-white shadow-[0_8px_20px_rgba(var(--color-shadow-rgb),0.18)]"
                        : "text-(--color-text-secondary)"
                    }`}
                    aria-pressed={isActive}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              {Object.entries(themeOptions).map(([themeName, option]) => {
                const isActive = selectedTheme === themeName;

                return (
                  <button
                    key={themeName}
                    type="button"
                    onClick={() => setSelectedTheme(themeName as ThemeName)}
                    className={`group relative inline-flex h-10 w-10 items-center justify-center rounded-full border transition-transform hover:scale-105 ${
                      isActive
                        ? "border-(--color-text-primary) ring-2 ring-(--color-brand-accent) ring-offset-2 ring-offset-(--color-surface)"
                        : "border-white/70"
                    }`}
                    style={{ background: option.swatch }}
                    aria-label={`Switch to ${option.label} theme`}
                    aria-pressed={isActive}
                    title={option.label}
                  >
                    {isActive ? (
                      <span className="h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_0_2px_rgba(15,23,42,0.16)]" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function applyTheme(themeName: ThemeName, mode: ThemeMode) {
  const root = document.documentElement;
  const variables = getThemeVariables(themeName, mode);

  root.dataset.theme = themeName;
  root.dataset.themeMode = mode;

  for (const [key, value] of Object.entries(variables)) {
    root.style.setProperty(key, value);
  }
}
