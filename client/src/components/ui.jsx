import { useEffect, useId, useRef, useState } from "react";
import { assetUrl } from "../lib/api";
import { capitalize, initials } from "../lib/format";

export function Spinner({ label = "Loading" }) {
    return <span className="spinner" role="status" aria-label={label} />;
}

export function PageLoader() {
    return (
        <div className="page-loader">
            <Spinner />
        </div>
    );
}

export function ErrorState({ error, onRetry }) {
    return (
        <div className="card empty-state" role="alert">
            <div className="icon">!</div>
            <h3>Something went wrong</h3>
            <p className="muted">{error?.message || "Please try again."}</p>
            {onRetry && (
                <button type="button" className="btn btn-secondary" onClick={onRetry}>
                    Try again
                </button>
            )}
        </div>
    );
}

export function EmptyState({ icon = "○", title, children, action }) {
    return (
        <div className="card empty-state">
            <div className="icon" aria-hidden="true">
                {icon}
            </div>
            <h3>{title}</h3>
            {children && <p className="muted">{children}</p>}
            {action}
        </div>
    );
}

export function Alert({ tone = "info", children }) {
    return (
        <div className={`alert alert-${tone}`} role={tone === "danger" ? "alert" : "status"}>
            <div>{children}</div>
        </div>
    );
}

export function PageHeader({ title, description, actions }) {
    return (
        <div className="page-header">
            <div>
                <h1>{title}</h1>
                {description && <p className="muted">{description}</p>}
            </div>
            {actions && <div className="row">{actions}</div>}
        </div>
    );
}

// Label + control + hint/error. The control is passed as a render function so it
// can receive the generated id and aria attributes.
export function Field({ label, error, hint, optional, children, className = "" }) {
    const id = useId();
    const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
    return (
        <div className={`field ${className}`}>
            {label && (
                <label className="field-label" htmlFor={id}>
                    {label} {optional && <span className="optional">(optional)</span>}
                </label>
            )}
            {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
            {error ? (
                <span className="field-error" id={`${id}-error`}>
                    {error}
                </span>
            ) : (
                hint && (
                    <span className="field-hint" id={`${id}-hint`}>
                        {hint}
                    </span>
                )
            )}
        </div>
    );
}

export function SubmitButton({ pending, children, className = "btn btn-primary", disabled, ...props }) {
    return (
        <button type="submit" className={className} disabled={pending || disabled} {...props}>
            {pending && <Spinner label="Working" />}
            {children}
        </button>
    );
}

export function Avatar({ src, name, size = 48 }) {
    const [failed, setFailed] = useState(false);
    const url = assetUrl(src);
    return (
        <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">
            {url && !failed ? <img src={url} alt="" onError={() => setFailed(true)} /> : initials(name)}
        </div>
    );
}

const StarIcon = ({ className }) => (
    <svg viewBox="0 0 20 20" className={className} fill="currentColor" aria-hidden="true">
        <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L10 14.8l-5.2 2.8 1-5.8L1.5 7.7l5.9-.8L10 1.5z" />
    </svg>
);

export function Stars({ value = 0 }) {
    const rounded = Math.round(value);
    return (
        <span className="stars" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((n) => (
                <StarIcon key={n} className={n <= rounded ? "" : "empty"} />
            ))}
        </span>
    );
}

export function RatingText({ average, count }) {
    if (!count) return <span className="rating-text muted">No reviews yet</span>;
    return (
        <span className="rating-text" aria-label={`Rated ${average} out of 5 from ${count} reviews`}>
            <Stars value={average} />
            <strong>{average.toFixed(1)}</strong>
            <span className="muted">({count})</span>
        </span>
    );
}

export function StarInput({ value, onChange }) {
    return (
        <div className="star-input" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
                <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={value === n}
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    className={n <= value ? "on" : ""}
                    onClick={() => onChange(n)}
                >
                    ★
                </button>
            ))}
        </div>
    );
}

const STATUS_TONES = {
    pending: "warning",
    confirmed: "info",
    completed: "success",
    declined: "danger",
    canceled: "neutral",
    approved: "success",
    rejected: "danger",
};

export function StatusBadge({ status, label }) {
    return <span className={`badge badge-${STATUS_TONES[status] || "neutral"}`}>{label || capitalize(status)}</span>;
}

export function Tabs({ tabs, value, onChange, label = "Sections" }) {
    return (
        <div className="tabs" role="tablist" aria-label={label}>
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    className="tab"
                    aria-selected={value === tab.id}
                    onClick={() => onChange(tab.id)}
                >
                    {tab.label}
                    {tab.count !== undefined && <span className="count">{tab.count}</span>}
                </button>
            ))}
        </div>
    );
}

export function Pagination({ page, pages, onChange }) {
    if (!pages || pages <= 1) return null;
    return (
        <nav className="pagination" aria-label="Pagination">
            <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
                ← Previous
            </button>
            <span className="muted small">
                Page {page} of {pages}
            </span>
            <button type="button" className="btn btn-secondary btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
                Next →
            </button>
        </nav>
    );
}

// Native <dialog>: focus trapping, Escape to close and the backdrop come for free.
// With `bare`, children render their own .modal-body / .modal-footer.
export function Modal({ open, title, onClose, children, footer, bare = false }) {
    const ref = useRef(null);
    const titleId = useId();

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    return (
        <dialog
            ref={ref}
            className="modal"
            aria-labelledby={titleId}
            onCancel={(event) => {
                event.preventDefault();
                onClose();
            }}
            onClick={(event) => {
                if (event.target === ref.current) onClose();
            }}
        >
            {open && (
                <>
                    <div className="modal-header">
                        <h2 id={titleId}>{title}</h2>
                        <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
                            ✕
                        </button>
                    </div>
                    {bare ? children : <div className="modal-body">{children}</div>}
                    {footer && <div className="modal-footer">{footer}</div>}
                </>
            )}
        </dialog>
    );
}

// Confirmation with an optional free-text field (reason, notes...).
export function ConfirmDialog({ open, title, onClose, ...props }) {
    return (
        <Modal open={open} title={title} onClose={onClose} bare>
            {/* Mounted per opening, so the text field starts empty every time. */}
            <ConfirmDialogContent onClose={onClose} {...props} />
        </Modal>
    );
}

function ConfirmDialogContent({
    message,
    confirmLabel = "Confirm",
    tone = "primary",
    textLabel,
    textPlaceholder,
    textRequired = false,
    textMinLength = 0,
    pending = false,
    error,
    onConfirm,
    onClose,
}) {
    const [text, setText] = useState("");
    const fieldId = useId();
    const tooShort = textRequired && text.trim().length < Math.max(1, textMinLength);

    return (
        <>
            <div className="modal-body stack">
                {message && <p className="muted">{message}</p>}
                {textLabel && (
                    <div className="field">
                        <label className="field-label" htmlFor={fieldId}>
                            {textLabel} {!textRequired && <span className="optional">(optional)</span>}
                        </label>
                        <textarea
                            id={fieldId}
                            className="control"
                            value={text}
                            placeholder={textPlaceholder}
                            maxLength={500}
                            onChange={(event) => setText(event.target.value)}
                        />
                        {textRequired && textMinLength > 0 && (
                            <span className="field-hint">At least {textMinLength} characters.</span>
                        )}
                    </div>
                )}
                {error && <Alert tone="danger">{error}</Alert>}
            </div>
            <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={pending}>
                    Back
                </button>
                <button
                    type="button"
                    className={`btn btn-${tone}`}
                    disabled={pending || tooShort}
                    onClick={() => onConfirm(text.trim())}
                >
                    {pending && <Spinner label="Working" />}
                    {confirmLabel}
                </button>
            </div>
        </>
    );
}

export function StatCard({ label, value, hint, to, as: Component = "div", ...props }) {
    return (
        <Component className="card stat-card" {...(to ? { to } : {})} {...props}>
            <span className="label">{label}</span>
            <span className="value">{value}</span>
            {hint && <span className="muted small">{hint}</span>}
        </Component>
    );
}

export function GenderField({ error, defaultValue }) {
    return (
        <Field label="Gender" error={error}>
            {(props) => (
                <div className="radio-row" role="radiogroup" aria-invalid={props["aria-invalid"]}>
                    {["female", "male"].map((gender) => (
                        <label key={gender} className="radio-pill">
                            <input type="radio" name="gender" value={gender} defaultChecked={defaultValue === gender} />
                            {gender === "female" ? "Female" : "Male"}
                        </label>
                    ))}
                </div>
            )}
        </Field>
    );
}
