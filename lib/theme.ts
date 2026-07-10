import type { CSSProperties } from "react";

type ThemeTokens = {
  colors: {
    background: string;
    foreground: string;
    pageStart: string;
    pageMid: string;
    pageEnd: string;
    surface: string;
    surfaceElevated: string;
    surfaceMuted: string;
    surfaceSoft: string;
    surfaceAccent: string;
    surfaceSuccess: string;
    surfaceSuccessStrong: string;
    surfaceInfo: string;
    surfaceInfoStrong: string;
    surfaceWarning: string;
    surfaceDanger: string;
    surfaceDangerSoft: string;
    hero: string;
    heroDeep: string;
    heroMid: string;
    heroLow: string;
    heroGlow: string;
    heroCyan: string;
    brand: string;
    brandBright: string;
    brandTint: string;
    brandStrong: string;
    brandStrongHover: string;
    brandSuccess: string;
    brandSuccessStrong: string;
    brandSuccessDeep: string;
    brandSuccessMuted: string;
    brandSuccessBorder: string;
    brandSuccessRing: string;
    brandSuccessHover: string;
    brandAccent: string;
    brandAccentHover: string;
    actionPrimary: string;
    actionPrimaryHover: string;
    actionSecondary: string;
    actionSecondaryHover: string;
    actionInfoBorder: string;
    actionInfoSoft: string;
    actionInfoSubtle: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    textSoft: string;
    textSubtle: string;
    textDisabled: string;
    textBodyStrong: string;
    textBodyMuted: string;
    textBodySoft: string;
    borderStrong: string;
    border: string;
    borderSoft: string;
    borderMuted: string;
    borderSubtle: string;
    borderLight: string;
    borderLighter: string;
    borderPanel: string;
    borderPanelSoft: string;
    borderPanelMuted: string;
    borderCard: string;
    borderWarm: string;
    borderWarning: string;
    borderWarningStrong: string;
    borderDanger: string;
    borderNeutral100: string;
    borderNeutral200: string;
    danger: string;
    dangerStrong: string;
    dangerAccent: string;
    warning: string;
    warningStrong: string;
    buttonWarm: string;
    buttonWarmHover: string;
    borderHighlight: string;
    borderHighlightSoft: string;
    surfaceHighlight: string;
    surfaceHighlightSoft: string;
    surfaceWarm: string;
    info: string;
  };
  rgba: {
    surfaceOverlay: string;
    surfaceOverlayStrong: string;
    surfaceOverlaySoft: string;
    gridLineStrong: string;
    gridLine: string;
    gridLineSoft: string;
    gridLineFaint: string;
    gridText: string;
    gridTextStrong: string;
  };
  rgb: {
    surface: string;
    shadow: string;
    shadowBrand: string;
    shadowSuccess: string;
    overlay: string;
  };
  gradients: {
    page: string;
    heroSkeleton: string;
    heroOverlay: string;
    heroGrid: string;
    shell: string;
    shellHeader: string;
    surfaceSuccess: string;
    surfaceSuccessSoft: string;
    galleryOverlay: string;
    loadingSlate: string;
    loadingBlue: string;
    loadingNeutral: string;
  };
};

type ThemeOption = {
  label: string;
  swatch: string;
  theme: ThemeTokens;
};

type ThemeOverrides = {
  colors?: Partial<ThemeTokens["colors"]>;
  rgba?: Partial<ThemeTokens["rgba"]>;
  rgb?: Partial<ThemeTokens["rgb"]>;
  gradients?: Partial<ThemeTokens["gradients"]>;
};

const baseTheme: ThemeTokens = {
  colors: {
    background: "#f6f5ef",
    foreground: "#0f172a",
    pageStart: "#edf4ef",
    pageMid: "#f8f5ef",
    pageEnd: "#ffffff",
    surface: "#ffffff",
    surfaceElevated: "#fdfefd",
    surfaceMuted: "#f8fbf9",
    surfaceSoft: "#f3f8f5",
    surfaceAccent: "#f4faf7",
    surfaceSuccess: "#effcf5",
    surfaceSuccessStrong: "#def7ea",
    surfaceInfo: "#eff6ff",
    surfaceInfoStrong: "#edf4ff",
    surfaceWarning: "#fff4cf",
    surfaceDanger: "#fff0ed",
    surfaceDangerSoft: "#fef2f2",
    hero: "#071712",
    heroDeep: "#04140f",
    heroMid: "#0c382c",
    heroLow: "#071712",
    heroGlow: "#d5ef76",
    heroCyan: "#44d3ff",
    brand: "#14897d",
    brandBright: "#1aa39a",
    brandTint: "#8de3d8",
    brandStrong: "#17352a",
    brandStrongHover: "#0f251d",
    brandSuccess: "#1c8f5f",
    brandSuccessStrong: "#167c61",
    brandSuccessDeep: "#125845",
    brandSuccessMuted: "#4d9a72",
    brandSuccessBorder: "#b9dfcf",
    brandSuccessRing: "#bde7d4",
    brandSuccessHover: "#8bc3aa",
    brandAccent: "#d5ef76",
    brandAccentHover: "#c6e663",
    actionPrimary: "#2563eb",
    actionPrimaryHover: "#1d4ed8",
    actionSecondary: "#3b5bfd",
    actionSecondaryHover: "#2f52f5",
    actionInfoBorder: "#93c5fd",
    actionInfoSoft: "#bfdbfe",
    actionInfoSubtle: "#bfd7ff",
    textPrimary: "#10233b",
    textSecondary: "#4a6886",
    textMuted: "#6d8098",
    textSoft: "#7a8598",
    textSubtle: "#869ab0",
    textDisabled: "#796c62",
    textBodyStrong: "#2e2a2b",
    textBodyMuted: "#6d635d",
    textBodySoft: "#786c63",
    borderStrong: "#d5e1da",
    border: "#d8e4de",
    borderSoft: "#dce7e1",
    borderMuted: "#dde7e1",
    borderSubtle: "#d7e3dd",
    borderLight: "#deebe4",
    borderLighter: "#e2ece6",
    borderPanel: "#e2e8f0",
    borderPanelSoft: "#cbd5e1",
    borderPanelMuted: "#c8d7d0",
    borderCard: "#d9e7df",
    borderWarm: "#eadfce",
    borderWarning: "#efdfc7",
    borderWarningStrong: "#f2d58b",
    borderDanger: "#efc3bb",
    borderNeutral100: "#e1e8ef",
    borderNeutral200: "#e3ece6",
    danger: "#dc2626",
    dangerStrong: "#c35c45",
    dangerAccent: "#ff4c4c",
    warning: "#c77a18",
    warningStrong: "#b07a12",
    buttonWarm: "#ddcdb3",
    buttonWarmHover: "#ccb894",
    borderHighlight: "#f0dba3",
    borderHighlightSoft: "#efdba8",
    surfaceHighlight: "#fff7df",
    surfaceHighlightSoft: "#fffdf5",
    surfaceWarm: "#fbf6ee",
    info: "#2457a6",
  },
  rgba: {
    surfaceOverlay: "rgba(255, 255, 255, 0.72)",
    surfaceOverlayStrong: "rgba(255, 255, 255, 0.88)",
    surfaceOverlaySoft: "rgba(255, 255, 255, 0.55)",
    gridLineStrong: "rgba(29, 42, 68, 0.12)",
    gridLine: "rgba(29, 42, 68, 0.08)",
    gridLineSoft: "rgba(29, 42, 68, 0.07)",
    gridLineFaint: "rgba(29, 42, 68, 0.06)",
    gridText: "rgba(29, 42, 68, 0.5)",
    gridTextStrong: "rgba(29, 42, 68, 0.68)",
  },
  rgb: {
    surface: "255, 255, 255",
    shadow: "15, 23, 42",
    shadowBrand: "22, 46, 39",
    shadowSuccess: "22, 124, 97",
    overlay: "15, 23, 42",
  },
  gradients: {
    page:
      "linear-gradient(180deg, var(--color-page-start) 0%, var(--color-page-mid) 36%, var(--color-page-end) 100%)",
    heroSkeleton:
      "linear-gradient(120deg, rgba(4, 20, 16, 1), rgba(12, 56, 44, 0.88), rgba(7, 23, 18, 1))",
    heroOverlay:
      "radial-gradient(circle at top left, rgba(151, 236, 114, 0.16), transparent 32%), radial-gradient(circle at 80% 20%, rgba(68, 211, 255, 0.16), transparent 28%), linear-gradient(135deg, rgba(4, 16, 12, 0.96), rgba(7, 34, 28, 0.88) 45%, rgba(10, 24, 22, 0.96))",
    heroGrid:
      "linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px)",
    shell: "linear-gradient(180deg, #ffffff 0%, #f8fbf9 100%)",
    shellHeader:
      "radial-gradient(circle at top left, rgba(213, 239, 118, 0.16), transparent 28%), linear-gradient(180deg, rgba(20, 137, 125, 0.06), rgba(255, 255, 255, 0))",
    surfaceSuccess:
      "linear-gradient(180deg, var(--color-surface-success) 0%, var(--color-surface-success-strong) 100%)",
    surfaceSuccessSoft:
      "linear-gradient(180deg, #f7fdf9 0%, #effaf4 100%)",
    galleryOverlay:
      "linear-gradient(180deg, transparent, rgba(6, 18, 34, 0.72))",
    loadingSlate:
      "linear-gradient(110deg, rgba(203, 213, 225, 0.95), rgba(226, 232, 240, 0.75), rgba(203, 213, 225, 0.95))",
    loadingBlue:
      "linear-gradient(110deg, rgba(219, 234, 254, 0.92), rgba(239, 246, 255, 0.76), rgba(219, 234, 254, 0.92))",
    loadingNeutral:
      "linear-gradient(110deg, rgba(226, 232, 240, 0.9), rgba(241, 245, 249, 0.72), rgba(226, 232, 240, 0.9))",
  },
};

function createTheme(
  label: string,
  swatch: string,
  overrides: ThemeOverrides,
): ThemeOption {
  return {
    label,
    swatch,
    theme: {
      colors: {
        ...baseTheme.colors,
        ...overrides.colors,
      },
      rgba: {
        ...baseTheme.rgba,
        ...overrides.rgba,
      },
      rgb: {
        ...baseTheme.rgb,
        ...overrides.rgb,
      },
      gradients: {
        ...baseTheme.gradients,
        ...overrides.gradients,
      },
    },
  };
}

export const themeOptions = {
  green: createTheme("Green", "#14897d", {}),
  red: createTheme("Red", "#c2413c", {
    colors: {
      pageStart: "#fef2f2",
      pageMid: "#fff7f5",
      surfaceMuted: "#fff7f5",
      surfaceSoft: "#fdf2f2",
      surfaceAccent: "#fff1ef",
      surfaceSuccess: "#fff2f2",
      surfaceSuccessStrong: "#ffe3df",
      hero: "#2a0d10",
      heroDeep: "#1b080b",
      heroMid: "#5e1d25",
      heroLow: "#22090d",
      heroGlow: "#fca5a5",
      heroCyan: "#fdba74",
      brand: "#c2413c",
      brandBright: "#dc4e4a",
      brandTint: "#fecaca",
      brandStrong: "#5f1f1c",
      brandStrongHover: "#471513",
      brandAccent: "#f59e0b",
      brandAccentHover: "#e78b09",
      actionPrimary: "#dc2626",
      actionPrimaryHover: "#b91c1c",
      actionSecondary: "#e11d48",
      actionSecondaryHover: "#be123c",
      dangerStrong: "#b42318",
      dangerAccent: "#ef4444",
      buttonWarm: "#de7b6d",
      buttonWarmHover: "#ca695b",
      borderHighlight: "#f7c8a1",
      borderHighlightSoft: "#f8dac0",
      surfaceHighlight: "#fff3e6",
      surfaceHighlightSoft: "#fffbf6",
    },
    gradients: {
      heroSkeleton:
        "linear-gradient(120deg, rgba(39, 11, 13, 1), rgba(94, 29, 37, 0.9), rgba(34, 9, 13, 1))",
      heroOverlay:
        "radial-gradient(circle at top left, rgba(248, 113, 113, 0.18), transparent 32%), radial-gradient(circle at 80% 20%, rgba(251, 146, 60, 0.18), transparent 28%), linear-gradient(135deg, rgba(34, 9, 13, 0.96), rgba(87, 25, 30, 0.9) 45%, rgba(28, 8, 10, 0.96))",
      shellHeader:
        "radial-gradient(circle at top left, rgba(245, 158, 11, 0.16), transparent 28%), linear-gradient(180deg, rgba(194, 65, 60, 0.06), rgba(255, 255, 255, 0))",
      surfaceSuccessSoft:
        "linear-gradient(180deg, #fff8f7 0%, #ffefee 100%)",
    },
  }),
  blue: createTheme("Blue", "#2563eb", {
    colors: {
      pageStart: "#eef4ff",
      pageMid: "#f7faff",
      surfaceMuted: "#f5f9ff",
      surfaceSoft: "#eef5ff",
      surfaceAccent: "#eef6ff",
      surfaceSuccess: "#eff6ff",
      surfaceSuccessStrong: "#dbeafe",
      hero: "#081529",
      heroDeep: "#050f1f",
      heroMid: "#15345d",
      heroLow: "#081529",
      heroGlow: "#93c5fd",
      heroCyan: "#67e8f9",
      brand: "#2563eb",
      brandBright: "#3b82f6",
      brandTint: "#bfdbfe",
      brandStrong: "#173b7a",
      brandStrongHover: "#112c5a",
      brandAccent: "#67e8f9",
      brandAccentHover: "#22d3ee",
      actionPrimary: "#2563eb",
      actionPrimaryHover: "#1d4ed8",
      actionSecondary: "#0f766e",
      actionSecondaryHover: "#115e59",
      buttonWarm: "#4f8df6",
      buttonWarmHover: "#3d7ceb",
    },
    gradients: {
      heroSkeleton:
        "linear-gradient(120deg, rgba(6, 15, 31, 1), rgba(21, 52, 93, 0.9), rgba(8, 21, 41, 1))",
      heroOverlay:
        "radial-gradient(circle at top left, rgba(96, 165, 250, 0.18), transparent 32%), radial-gradient(circle at 80% 20%, rgba(103, 232, 249, 0.18), transparent 28%), linear-gradient(135deg, rgba(5, 15, 31, 0.96), rgba(16, 49, 88, 0.9) 45%, rgba(7, 18, 36, 0.96))",
      shellHeader:
        "radial-gradient(circle at top left, rgba(103, 232, 249, 0.15), transparent 28%), linear-gradient(180deg, rgba(37, 99, 235, 0.06), rgba(255, 255, 255, 0))",
      surfaceSuccessSoft:
        "linear-gradient(180deg, #f7fbff 0%, #edf5ff 100%)",
    },
  }),
  amber: createTheme("Amber", "#c77a18", {
    colors: {
      pageStart: "#fff8ed",
      pageMid: "#fffdf7",
      surfaceMuted: "#fffaf1",
      surfaceSoft: "#fff6e8",
      surfaceAccent: "#fff8ef",
      surfaceSuccess: "#fff7e9",
      surfaceSuccessStrong: "#fdecc8",
      hero: "#23140a",
      heroDeep: "#170d06",
      heroMid: "#5a3717",
      heroLow: "#23140a",
      heroGlow: "#facc15",
      heroCyan: "#fdba74",
      brand: "#c77a18",
      brandBright: "#dd8a1f",
      brandTint: "#f6d59a",
      brandStrong: "#5e3a12",
      brandStrongHover: "#472b0c",
      brandAccent: "#f59e0b",
      brandAccentHover: "#e69009",
      actionPrimary: "#d97706",
      actionPrimaryHover: "#b45309",
      actionSecondary: "#92400e",
      actionSecondaryHover: "#78350f",
      borderHighlight: "#efc875",
      borderHighlightSoft: "#f5deb0",
      surfaceHighlight: "#fff4d9",
      surfaceHighlightSoft: "#fffaf0",
      buttonWarm: "#d5a25d",
      buttonWarmHover: "#c58e44",
    },
    gradients: {
      heroSkeleton:
        "linear-gradient(120deg, rgba(23, 13, 6, 1), rgba(90, 55, 23, 0.9), rgba(35, 20, 10, 1))",
      heroOverlay:
        "radial-gradient(circle at top left, rgba(250, 204, 21, 0.18), transparent 32%), radial-gradient(circle at 80% 20%, rgba(253, 186, 116, 0.18), transparent 28%), linear-gradient(135deg, rgba(23, 13, 6, 0.96), rgba(90, 55, 23, 0.9) 45%, rgba(30, 17, 9, 0.96))",
      shellHeader:
        "radial-gradient(circle at top left, rgba(245, 158, 11, 0.16), transparent 28%), linear-gradient(180deg, rgba(199, 122, 24, 0.06), rgba(255, 255, 255, 0))",
      surfaceSuccessSoft:
        "linear-gradient(180deg, #fffdf8 0%, #fff5e7 100%)",
    },
  }),
  plum: createTheme("Plum", "#7c3aed", {
    colors: {
      pageStart: "#f6f0ff",
      pageMid: "#fcf9ff",
      surfaceMuted: "#faf5ff",
      surfaceSoft: "#f5efff",
      surfaceAccent: "#f7f1ff",
      surfaceSuccess: "#f5f0ff",
      surfaceSuccessStrong: "#ede0ff",
      hero: "#170d29",
      heroDeep: "#10081d",
      heroMid: "#3b1d5f",
      heroLow: "#170d29",
      heroGlow: "#c4b5fd",
      heroCyan: "#67e8f9",
      brand: "#7c3aed",
      brandBright: "#8b5cf6",
      brandTint: "#ddd6fe",
      brandStrong: "#412070",
      brandStrongHover: "#311754",
      brandAccent: "#f472b6",
      brandAccentHover: "#ec4899",
      actionPrimary: "#7c3aed",
      actionPrimaryHover: "#6d28d9",
      actionSecondary: "#2563eb",
      actionSecondaryHover: "#1d4ed8",
      buttonWarm: "#9e77f1",
      buttonWarmHover: "#8e67e3",
    },
    gradients: {
      heroSkeleton:
        "linear-gradient(120deg, rgba(16, 8, 29, 1), rgba(59, 29, 95, 0.9), rgba(23, 13, 41, 1))",
      heroOverlay:
        "radial-gradient(circle at top left, rgba(196, 181, 253, 0.18), transparent 32%), radial-gradient(circle at 80% 20%, rgba(244, 114, 182, 0.16), transparent 28%), linear-gradient(135deg, rgba(16, 8, 29, 0.96), rgba(59, 29, 95, 0.9) 45%, rgba(20, 10, 36, 0.96))",
      shellHeader:
        "radial-gradient(circle at top left, rgba(244, 114, 182, 0.16), transparent 28%), linear-gradient(180deg, rgba(124, 58, 237, 0.06), rgba(255, 255, 255, 0))",
      surfaceSuccessSoft:
        "linear-gradient(180deg, #fbf8ff 0%, #f4eeff 100%)",
    },
  }),
} as const;

export type ThemeName = keyof typeof themeOptions;
export type ThemeMode = "light" | "dark";

const configuredDefaultThemeName = process.env.NEXT_PUBLIC_DEFAULT_THEME?.trim();

export const defaultThemeName: ThemeName =
  configuredDefaultThemeName && configuredDefaultThemeName in themeOptions
    ? (configuredDefaultThemeName as ThemeName)
    : "green";
export const defaultThemeMode: ThemeMode = "light";
export const themeStorageKey = "btc-theme";
export const themeModeStorageKey = "btc-theme-mode";

export function getThemeVariables(themeName: ThemeName, mode: ThemeMode = defaultThemeMode) {
  const theme = resolveThemeMode(themeOptions[themeName].theme, mode);

  return {
    "--background": theme.colors.background,
    "--foreground": theme.colors.foreground,
    "--color-page-start": theme.colors.pageStart,
    "--color-page-mid": theme.colors.pageMid,
    "--color-page-end": theme.colors.pageEnd,
    "--color-surface": theme.colors.surface,
    "--color-surface-rgb": theme.rgb.surface,
    "--color-surface-elevated": theme.colors.surfaceElevated,
    "--color-surface-muted": theme.colors.surfaceMuted,
    "--color-surface-soft": theme.colors.surfaceSoft,
    "--color-surface-accent": theme.colors.surfaceAccent,
    "--color-surface-success": theme.colors.surfaceSuccess,
    "--color-surface-success-strong": theme.colors.surfaceSuccessStrong,
    "--color-surface-info": theme.colors.surfaceInfo,
    "--color-surface-info-strong": theme.colors.surfaceInfoStrong,
    "--color-surface-warning": theme.colors.surfaceWarning,
    "--color-surface-danger": theme.colors.surfaceDanger,
    "--color-surface-danger-soft": theme.colors.surfaceDangerSoft,
    "--color-surface-overlay": theme.rgba.surfaceOverlay,
    "--color-surface-overlay-strong": theme.rgba.surfaceOverlayStrong,
    "--color-surface-overlay-soft": theme.rgba.surfaceOverlaySoft,
    "--color-hero": theme.colors.hero,
    "--color-hero-deep": theme.colors.heroDeep,
    "--color-hero-mid": theme.colors.heroMid,
    "--color-hero-low": theme.colors.heroLow,
    "--color-hero-glow": theme.colors.heroGlow,
    "--color-hero-cyan": theme.colors.heroCyan,
    "--color-brand": theme.colors.brand,
    "--color-brand-bright": theme.colors.brandBright,
    "--color-brand-tint": theme.colors.brandTint,
    "--color-brand-strong": theme.colors.brandStrong,
    "--color-brand-strong-hover": theme.colors.brandStrongHover,
    "--color-brand-success": theme.colors.brandSuccess,
    "--color-brand-success-strong": theme.colors.brandSuccessStrong,
    "--color-brand-success-deep": theme.colors.brandSuccessDeep,
    "--color-brand-success-muted": theme.colors.brandSuccessMuted,
    "--color-brand-success-border": theme.colors.brandSuccessBorder,
    "--color-brand-success-ring": theme.colors.brandSuccessRing,
    "--color-brand-success-hover": theme.colors.brandSuccessHover,
    "--color-brand-accent": theme.colors.brandAccent,
    "--color-brand-accent-hover": theme.colors.brandAccentHover,
    "--color-action-primary": theme.colors.actionPrimary,
    "--color-action-primary-hover": theme.colors.actionPrimaryHover,
    "--color-action-secondary": theme.colors.actionSecondary,
    "--color-action-secondary-hover": theme.colors.actionSecondaryHover,
    "--color-action-info-border": theme.colors.actionInfoBorder,
    "--color-action-info-soft": theme.colors.actionInfoSoft,
    "--color-action-info-subtle": theme.colors.actionInfoSubtle,
    "--color-text-primary": theme.colors.textPrimary,
    "--color-text-secondary": theme.colors.textSecondary,
    "--color-text-muted": theme.colors.textMuted,
    "--color-text-soft": theme.colors.textSoft,
    "--color-text-subtle": theme.colors.textSubtle,
    "--color-text-disabled": theme.colors.textDisabled,
    "--color-text-body-strong": theme.colors.textBodyStrong,
    "--color-text-body-muted": theme.colors.textBodyMuted,
    "--color-text-body-soft": theme.colors.textBodySoft,
    "--color-border-strong": theme.colors.borderStrong,
    "--color-border": theme.colors.border,
    "--color-border-soft": theme.colors.borderSoft,
    "--color-border-muted": theme.colors.borderMuted,
    "--color-border-subtle": theme.colors.borderSubtle,
    "--color-border-light": theme.colors.borderLight,
    "--color-border-lighter": theme.colors.borderLighter,
    "--color-border-panel": theme.colors.borderPanel,
    "--color-border-panel-soft": theme.colors.borderPanelSoft,
    "--color-border-panel-muted": theme.colors.borderPanelMuted,
    "--color-border-card": theme.colors.borderCard,
    "--color-border-warm": theme.colors.borderWarm,
    "--color-border-warning": theme.colors.borderWarning,
    "--color-border-warning-strong": theme.colors.borderWarningStrong,
    "--color-border-danger": theme.colors.borderDanger,
    "--color-border-neutral-100": theme.colors.borderNeutral100,
    "--color-border-neutral-200": theme.colors.borderNeutral200,
    "--color-danger": theme.colors.danger,
    "--color-danger-strong": theme.colors.dangerStrong,
    "--color-danger-accent": theme.colors.dangerAccent,
    "--color-warning": theme.colors.warning,
    "--color-warning-strong": theme.colors.warningStrong,
    "--color-button-warm": theme.colors.buttonWarm,
    "--color-button-warm-hover": theme.colors.buttonWarmHover,
    "--color-border-highlight": theme.colors.borderHighlight,
    "--color-border-highlight-soft": theme.colors.borderHighlightSoft,
    "--color-surface-highlight": theme.colors.surfaceHighlight,
    "--color-surface-highlight-soft": theme.colors.surfaceHighlightSoft,
    "--color-surface-warm": theme.colors.surfaceWarm,
    "--color-info": theme.colors.info,
    "--color-shadow-rgb": theme.rgb.shadow,
    "--color-shadow-brand-rgb": theme.rgb.shadowBrand,
    "--color-shadow-success-rgb": theme.rgb.shadowSuccess,
    "--color-overlay-rgb": theme.rgb.overlay,
    "--grid-line-strong": theme.rgba.gridLineStrong,
    "--grid-line": theme.rgba.gridLine,
    "--grid-line-soft": theme.rgba.gridLineSoft,
    "--grid-line-faint": theme.rgba.gridLineFaint,
    "--grid-text": theme.rgba.gridText,
    "--grid-text-strong": theme.rgba.gridTextStrong,
    "--gradient-page": theme.gradients.page,
    "--gradient-hero-skeleton": theme.gradients.heroSkeleton,
    "--gradient-hero-overlay": theme.gradients.heroOverlay,
    "--gradient-hero-grid": theme.gradients.heroGrid,
    "--gradient-shell": theme.gradients.shell,
    "--gradient-shell-header": theme.gradients.shellHeader,
    "--gradient-surface-success": theme.gradients.surfaceSuccess,
    "--gradient-surface-success-soft": theme.gradients.surfaceSuccessSoft,
    "--gradient-gallery-overlay": theme.gradients.galleryOverlay,
    "--gradient-loading-slate": theme.gradients.loadingSlate,
    "--gradient-loading-blue": theme.gradients.loadingBlue,
    "--gradient-loading-neutral": theme.gradients.loadingNeutral,
  } satisfies Record<`--${string}`, string>;
}

export function isThemeName(value: string): value is ThemeName {
  return value in themeOptions;
}

export function isThemeMode(value: string): value is ThemeMode {
  return value === "light" || value === "dark";
}

export const rootThemeStyle = getThemeVariables(defaultThemeName, defaultThemeMode) as CSSProperties;

function resolveThemeMode(theme: ThemeTokens, mode: ThemeMode): ThemeTokens {
  if (mode === "light") {
    return theme;
  }

  return {
    ...theme,
    colors: {
      ...theme.colors,
      background: "#081119",
      foreground: "#eef5fb",
      pageStart: "#09131c",
      pageMid: "#0d1721",
      pageEnd: "#101b25",
      surface: "#11202c",
      surfaceElevated: "#142633",
      surfaceMuted: "#162836",
      surfaceSoft: "#1a2d3c",
      surfaceAccent: "#1b3446",
      surfaceSuccess: "#17362d",
      surfaceSuccessStrong: "#1d473b",
      surfaceInfo: "#162d43",
      surfaceInfoStrong: "#1b3952",
      surfaceWarning: "#412f14",
      surfaceDanger: "#452126",
      surfaceDangerSoft: "#38181e",
      brandSuccess: "#55d39e",
      brandSuccessStrong: "#79e8b8",
      brandSuccessDeep: "#d9fff0",
      brandSuccessMuted: "#a7d9c3",
      brandSuccessBorder: "#31735b",
      brandSuccessRing: "#4ec794",
      brandSuccessHover: "#89f0c0",
      textPrimary: "#eef5fb",
      textSecondary: "#c7d5e3",
      textMuted: "#adbdce",
      textSoft: "#95a7ba",
      textSubtle: "#7f92a7",
      textDisabled: "#718298",
      textBodyStrong: "#f4f8fc",
      textBodyMuted: "#c6d1dd",
      textBodySoft: "#acbbc9",
      borderStrong: "#355065",
      border: "#2f475b",
      borderSoft: "#395166",
      borderMuted: "#3d566b",
      borderSubtle: "#355166",
      borderLight: "#42607a",
      borderLighter: "#4a6984",
      borderPanel: "#375268",
      borderPanelSoft: "#4b657d",
      borderPanelMuted: "#426079",
      borderCard: "#36556d",
      borderWarm: "#564737",
      borderWarning: "#66512f",
      borderWarningStrong: "#98743a",
      borderDanger: "#7d4a4f",
      borderNeutral100: "#415d75",
      borderNeutral200: "#38556b",
      danger: "#f87171",
      dangerStrong: "#fca5a5",
      dangerAccent: "#f87171",
      warning: "#fbbf24",
      warningStrong: "#fde68a",
      buttonWarm: theme.colors.brand,
      buttonWarmHover: theme.colors.brandBright,
      borderHighlight: "#8e7744",
      borderHighlightSoft: "#6a5a39",
      surfaceHighlight: "#2c2618",
      surfaceHighlightSoft: "#1d1912",
      surfaceWarm: "#1d1711",
      info: "#9fd2ff",
    },
    rgba: {
      ...theme.rgba,
      surfaceOverlay: "rgba(17, 32, 44, 0.72)",
      surfaceOverlayStrong: "rgba(17, 32, 44, 0.88)",
      surfaceOverlaySoft: "rgba(17, 32, 44, 0.58)",
      gridLineStrong: "rgba(170, 190, 212, 0.24)",
      gridLine: "rgba(170, 190, 212, 0.16)",
      gridLineSoft: "rgba(170, 190, 212, 0.12)",
      gridLineFaint: "rgba(170, 190, 212, 0.1)",
      gridText: "rgba(211, 223, 236, 0.7)",
      gridTextStrong: "rgba(238, 245, 251, 0.88)",
    },
    rgb: {
      ...theme.rgb,
      surface: "17, 32, 44",
      shadow: "2, 6, 23",
      shadowBrand: "2, 6, 23",
      shadowSuccess: "4, 120, 87",
      overlay: "2, 6, 23",
    },
    gradients: {
      ...theme.gradients,
      page:
        "linear-gradient(180deg, var(--color-page-start) 0%, var(--color-page-mid) 38%, var(--color-page-end) 100%)",
      shell:
        "linear-gradient(180deg, rgba(18,36,49,0.92) 0%, rgba(13,28,38,0.88) 100%)",
      shellHeader:
        "radial-gradient(circle at top left, color-mix(in srgb, var(--color-brand-accent) 18%, transparent), transparent 28%), linear-gradient(180deg, color-mix(in srgb, var(--color-brand) 10%, transparent), rgba(255, 255, 255, 0))",
      surfaceSuccess:
        "linear-gradient(180deg, var(--color-surface-success) 0%, var(--color-surface-success-strong) 100%)",
      surfaceSuccessSoft:
        "linear-gradient(180deg, rgba(18,45,39,0.94) 0%, rgba(14,36,31,0.9) 100%)",
      galleryOverlay:
        "linear-gradient(180deg, transparent, rgba(2, 6, 23, 0.82))",
      loadingSlate:
        "linear-gradient(110deg, rgba(71, 85, 105, 0.95), rgba(100, 116, 139, 0.75), rgba(71, 85, 105, 0.95))",
      loadingBlue:
        "linear-gradient(110deg, rgba(30, 64, 175, 0.82), rgba(59, 130, 246, 0.62), rgba(30, 64, 175, 0.82))",
      loadingNeutral:
        "linear-gradient(110deg, rgba(51, 65, 85, 0.92), rgba(71, 85, 105, 0.72), rgba(51, 65, 85, 0.92))",
    },
  };
}
