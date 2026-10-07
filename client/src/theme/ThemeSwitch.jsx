import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "./context";

const OPTIONS = [
    { value: "light", label: "Light theme", Icon: Sun },
    { value: "dark", label: "Dark theme", Icon: Moon },
    { value: "system", label: "Match system theme", Icon: Monitor },
];

// Three-way Light / Dark / System switch.
export default function ThemeSwitch({ className = "" }) {
    const { preference, setPreference } = useTheme();
    return (
        <div className={`theme-switch ${className}`} role="radiogroup" aria-label="Color theme">
            {OPTIONS.map(({ value, label, Icon }) => (
                <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={preference === value}
                    aria-label={label}
                    title={label}
                    onClick={() => setPreference(value)}
                >
                    <Icon size={15} strokeWidth={1.75} aria-hidden="true" />
                </button>
            ))}
        </div>
    );
}
