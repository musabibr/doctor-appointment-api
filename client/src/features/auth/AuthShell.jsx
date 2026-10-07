import { useState } from "react";
import { pageTitle } from "../../lib/config";

export function AuthShell({ title, subtitle, children, footer, width = "narrow" }) {
    return (
        <div className="auth-shell">
            <title>{pageTitle(title)}</title>
            <div className={`container ${width}`}>
                <div className="card padded-lg auth-card stack">
                    <div className="stack-sm">
                        <h1>{title}</h1>
                        {subtitle && <p className="muted">{subtitle}</p>}
                    </div>
                    {children}
                </div>
                {footer && <div className="center mt-2 small">{footer}</div>}
            </div>
        </div>
    );
}

export function PasswordInput({ name = "password", autoComplete = "current-password", ...props }) {
    const [visible, setVisible] = useState(false);
    return (
        <div style={{ position: "relative" }}>
            <input
                {...props}
                name={name}
                type={visible ? "text" : "password"}
                className="control"
                autoComplete={autoComplete}
                style={{ paddingRight: 64 }}
            />
            <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)" }}
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? "Hide password" : "Show password"}
            >
                {visible ? "Hide" : "Show"}
            </button>
        </div>
    );
}

export function RoleSwitch({ value, onChange, roles }) {
    return (
        <div className="segmented" role="group" aria-label="Account type">
            {roles.map(([role, label]) => (
                <button key={role} type="button" aria-pressed={value === role} onClick={() => onChange(role)}>
                    {label}
                </button>
            ))}
        </div>
    );
}

export function DevEmailHint({ children }) {
    if (!import.meta.env.DEV) return null;
    return <p className="muted tiny">💡 {children}</p>;
}
