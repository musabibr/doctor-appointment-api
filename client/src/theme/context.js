import { createContext, use } from "react";

export const THEME_STORAGE_KEY = "doctorri.theme";

// { preference: "light" | "dark" | "system", theme: "light" | "dark", setPreference(value) }
export const ThemeContext = createContext({ preference: "system", theme: "light", setPreference: () => {} });

export const useTheme = () => use(ThemeContext);
