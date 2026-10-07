import { useCallback, useMemo, useRef, useState } from "react";
import { ToastContext } from "./toast";

export default function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const nextId = useRef(0);

    const dismiss = useCallback((id) => setToasts((list) => list.filter((toast) => toast.id !== id)), []);

    const notify = useCallback(
        (message, tone = "success") => {
            const id = ++nextId.current;
            setToasts((list) => [...list.slice(-3), { id, message, tone }]);
            setTimeout(() => dismiss(id), tone === "error" ? 6000 : 4000);
        },
        [dismiss]
    );

    const value = useMemo(() => ({ notify }), [notify]);

    return (
        <ToastContext value={value}>
            {children}
            <div className="toast-region" aria-live="polite">
                {toasts.map((toast) => (
                    <div key={toast.id} className={`toast ${toast.tone === "error" ? "error" : ""}`} role="status">
                        <span>{toast.message}</span>
                        <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss">
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext>
    );
}
