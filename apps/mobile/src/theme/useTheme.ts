import { themes } from "./tokens";
import type { Theme } from "./tokens";
import { useMockApp } from "../prototype/store";

/** Colors for the active prototype theme (light/dark toggle lives in the
    profile sheet, exactly like the mockup). */
export const useTheme = (): Theme => {
  const { state } = useMockApp();
  return themes[state.theme];
};
