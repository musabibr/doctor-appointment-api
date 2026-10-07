import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY, ThemeContext } from "./context";

const PREFERENCES = ["light", "dark", "system"];
const darkQuery = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : null;

const readPreference = () => {
    try {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        return PREFERENCES.includes(saved) ? saved : "system";
    } catch {
        return "system";
    }
};

// The operating system's light/dark setting, kept in sync while the page is open.
const subscribeToSystem = (onChange) => {
    darkQuery?.addEventListener("change", onChange);
    return () => darkQuery?.removeEventListener("change", onChange);
};
const systemPrefersDark = () => Boolean(darkQuery?.matches);

export default function ThemeProvider({ children }) {
    const [preference, setPreferenceState] = useState(readPreference);
    const prefersDark = useSyncExternalStore(subscribeToSystem, systemPrefersDark, () => false);
    const theme = preference === "system" ? (prefersDark ? "dark" : "light") : preference;

    useEffect(() => {
        const root = document.documentElement;
        root.setAttribute("data-theme", theme);
        root.style.colorScheme = theme;
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute("content", getComputedStyle(root).getPropertyValue("--bg").trim() || "#ffffff");
    }, [theme]);

    const setPreference = useCallback((value) => {
        if (!PREFERENCES.includes(value)) return;
        setPreferenceState(value);
        try {
            if (value === "system") localStorage.removeItem(THEME_STORAGE_KEY);
            else localStorage.setItem(THEME_STORAGE_KEY, value);
        } catch {
            // Storage unavailable: the choice lasts until the page is closed.
        }
    }, []);

    const value = useMemo(() => ({ preference, theme, setPreference }), [preference, theme, setPreference]);
    return <ThemeContext value={value}>{children}</ThemeContext>;
}
