"use client";

import { useEffect, useState } from "react";

import {
  defaultThemeName,
  getThemeVariables,
  isThemeName,
  themeOptions,
  themeStorageKey,
  type ThemeName,
} from "@/lib/theme";

export function ThemeSwitcher() {
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>(() => {
    if (typeof window === "undefined") {
      return defaultThemeName;
    }

    const savedTheme = window.localStorage.getItem(themeStorageKey);
    return savedTheme && isThemeName(savedTheme) ? savedTheme : defaultThemeName;
  });

  useEffect(() => {
    applyTheme(selectedTheme);
    window.localStorage.setItem(themeStorageKey, selectedTheme);
  }, [selectedTheme]);

  return (
    <div className="fixed bottom-4 right-4 z-[1300]">
      <div className="rounded-[1.4rem] border border-[color:var(--color-border-card)] bg-[rgba(var(--color-surface-rgb),0.9)] px-3 py-3 shadow-[0_20px_48px_rgba(var(--color-shadow-rgb),0.14)] backdrop-blur-xl">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-soft)]">
              Theme
            </p>
            <p className="text-xs text-[color:var(--color-text-secondary)]">
              Switch the venue look
            </p>
          </div>
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
                    ? "border-[color:var(--color-text-primary)] ring-2 ring-[color:var(--color-brand-accent)] ring-offset-2 ring-offset-white"
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
    </div>
  );
}

function applyTheme(themeName: ThemeName) {
  const root = document.documentElement;
  const variables = getThemeVariables(themeName);

  root.dataset.theme = themeName;

  for (const [key, value] of Object.entries(variables)) {
    root.style.setProperty(key, value);
  }
}
