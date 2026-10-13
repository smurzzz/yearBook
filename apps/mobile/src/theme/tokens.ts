/* =========================================================================
   YearbookHub — theme tokens (light/dark)
   Translated 1:1 from the design source's HSL variables (index.css) so the
   mobile app matches the approved mockup exactly. Components read colors
   only via useTheme(); no hex literals in components.
   ========================================================================= */

export type ThemeName = "light" | "dark";

/* ------------------------------ HSL → hex ------------------------------- */

const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  const sat = s / 100;
  const lig = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
};

const hex2 = (n: number) => n.toString(16).padStart(2, "0");

/** Parse `"244 72% 57%"` (optionally with `/ 0.5` alpha) into #RRGGBB / rgba(). */
export const hsl = (value: string): string => {
  const [hslPart, alphaPart] = value.split("/");
  const [h, s, l] = hslPart.trim().split(/\s+/).map((v) => parseFloat(v));
  const [r, g, b] = hslToRgb(h, s, l);
  if (alphaPart) {
    const a = parseFloat(alphaPart.trim());
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
};

/* ------------------------------- Palette -------------------------------- */

export interface Theme {
  name: ThemeName;

  /* Surfaces & ink */
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;

  /* Brand */
  primary: string;
  primaryForeground: string;
  primaryGlow: string;
  primarySoft: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;

  /* Status — always rendered as icon + label, never color alone */
  pending: string;
  pendingSoft: string;
  pendingForeground: string;
  approved: string;
  approvedSoft: string;
  approvedForeground: string;
  rejected: string;
  rejectedSoft: string;
  rejectedForeground: string;
  reported: string;
  reportedSoft: string;
  reportedForeground: string;

  /* Committee (admin) */
  admin: string;
  adminForeground: string;
  adminSurface: string;
  adminBorder: string;
  adminInk: string;

  /* On-image layer (fixed in both themes, over photography) */
  onImage: string;
  onImageMuted: string;
  onImageSurface: string;
  onImageBorder: string;

  /* Cinema canvas: viewers/toasts/scrim — dark in BOTH themes */
  canvas: string;
  overlay: string;

  shadowTile: string;
}

const shared = {
  onImage: hsl("0 0% 100%"),
  onImageMuted: hsl("0 0% 100% / 0.8"),
  onImageSurface: hsl("0 0% 100% / 0.16"),
  onImageBorder: hsl("0 0% 100% / 0.26"),
  canvas: hsl("240 30% 7%"),
  overlay: "rgba(10, 10, 20, 0.45)",
};

export const lightTheme: Theme = {
  name: "light",
  background: hsl("40 33% 99%"),
  foreground: hsl("240 18% 11%"),
  card: hsl("0 0% 100%"),
  cardForeground: hsl("240 18% 11%"),
  popover: hsl("0 0% 100%"),
  popoverForeground: hsl("240 18% 11%"),
  primary: hsl("244 72% 57%"),
  primaryForeground: hsl("0 0% 100%"),
  primaryGlow: hsl("252 90% 68%"),
  primarySoft: hsl("244 72% 57% / 0.12"),
  secondary: hsl("244 40% 96%"),
  secondaryForeground: hsl("244 45% 26%"),
  muted: hsl("240 20% 96%"),
  mutedForeground: hsl("240 9% 43%"),
  accent: hsl("244 40% 96%"),
  accentForeground: hsl("244 45% 26%"),
  destructive: hsl("0 74% 50%"),
  destructiveForeground: hsl("0 0% 100%"),
  border: hsl("240 16% 90%"),
  input: hsl("244 26% 92%"),
  ring: hsl("244 72% 57%"),
  pending: hsl("32 95% 40%"),
  pendingSoft: hsl("38 100% 94%"),
  pendingForeground: hsl("26 90% 28%"),
  approved: hsl("158 72% 30%"),
  approvedSoft: hsl("155 60% 93%"),
  approvedForeground: hsl("158 74% 22%"),
  rejected: hsl("350 78% 47%"),
  rejectedSoft: hsl("352 90% 96%"),
  rejectedForeground: hsl("350 72% 35%"),
  reported: hsl("208 88% 42%"),
  reportedSoft: hsl("208 90% 95%"),
  reportedForeground: hsl("210 80% 31%"),
  admin: hsl("268 52% 38%"),
  adminForeground: hsl("0 0% 100%"),
  adminSurface: hsl("270 40% 97%"),
  adminBorder: hsl("270 30% 90%"),
  adminInk: hsl("268 35% 18%"),
  ...shared,
  shadowTile: hsl("240 40% 12% / 0.10"),
};

export const darkTheme: Theme = {
  name: "dark",
  background: hsl("250 16% 7%"),
  foreground: hsl("240 24% 96%"),
  card: hsl("250 14% 10%"),
  cardForeground: hsl("240 24% 96%"),
  popover: hsl("250 14% 9%"),
  popoverForeground: hsl("240 24% 96%"),
  primary: hsl("250 88% 70%"),
  primaryForeground: hsl("250 45% 10%"),
  primaryGlow: hsl("258 92% 78%"),
  primarySoft: hsl("250 88% 70% / 0.16"),
  secondary: hsl("250 14% 16%"),
  secondaryForeground: hsl("245 30% 92%"),
  muted: hsl("250 12% 16%"),
  mutedForeground: hsl("245 12% 66%"),
  accent: hsl("250 14% 18%"),
  accentForeground: hsl("245 30% 92%"),
  destructive: hsl("0 68% 58%"),
  destructiveForeground: hsl("250 45% 10%"),
  border: hsl("250 12% 20%"),
  input: hsl("250 12% 22%"),
  ring: hsl("250 88% 70%"),
  pending: hsl("36 100% 66%"),
  pendingSoft: hsl("32 45% 16%"),
  pendingForeground: hsl("38 100% 82%"),
  approved: hsl("158 62% 52%"),
  approvedSoft: hsl("158 40% 14%"),
  approvedForeground: hsl("155 70% 80%"),
  rejected: hsl("350 86% 68%"),
  rejectedSoft: hsl("350 40% 17%"),
  rejectedForeground: hsl("352 92% 87%"),
  reported: hsl("208 90% 64%"),
  reportedSoft: hsl("208 45% 17%"),
  reportedForeground: hsl("208 90% 84%"),
  admin: hsl("270 62% 72%"),
  adminForeground: hsl("268 50% 12%"),
  adminSurface: hsl("268 25% 15%"),
  adminBorder: hsl("268 20% 25%"),
  adminInk: hsl("270 60% 88%"),
  ...shared,
  shadowTile: hsl("250 60% 2% / 0.55"),
};

export const themes: Record<ThemeName, Theme> = { light: lightTheme, dark: darkTheme };

/* --------------------------- Spacing / radius --------------------------- */

export const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 } as const;
export const screenPadding = 20;
export const sectionGap = 24;

export const radius = {
  pill: 999,
  card: 20,
  sheetTop: 28,
  input: 14,
  chip: 999,
  tile: 12,
  md: 14,
  sm: 10,
} as const;

/* ------------------------------ Typography ------------------------------ */

export const fonts = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semibold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extrabold: "PlusJakartaSans_800ExtraBold",
};

export interface TypeStyle {
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
  fontFamily: string;
}

/** Type scale from the design source (tailwind.config.ts). */
export const typography = {
  eyebrow: { fontSize: 11, lineHeight: 14, letterSpacing: 1.54, fontFamily: fonts.bold },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: fonts.regular },
  label: { fontSize: 13, lineHeight: 18, fontFamily: fonts.regular },
  body: { fontSize: 15, lineHeight: 22, fontFamily: fonts.regular },
  subhead: { fontSize: 17, lineHeight: 24, fontFamily: fonts.semibold },
  heading: { fontSize: 20, lineHeight: 26, letterSpacing: -0.2, fontFamily: fonts.semibold },
  title: { fontSize: 26, lineHeight: 32, letterSpacing: -0.39, fontFamily: fonts.extrabold },
  display: { fontSize: 34, lineHeight: 40, letterSpacing: -0.68, fontFamily: fonts.extrabold },
  button: { fontSize: 16, lineHeight: 20, fontFamily: fonts.semibold },
} satisfies Record<string, TypeStyle>;

/* ------------------------------- Elevation ------------------------------ */

export const elevation = {
  tile: {
    shadowColor: hsl("240 40% 12%"),
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  sheet: {
    shadowColor: hsl("240 40% 12%"),
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
};
