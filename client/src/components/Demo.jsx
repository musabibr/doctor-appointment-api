import { Suspense, use, useState } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../lib/api";
import { loadDemo } from "../lib/demo";
import { HOME_BY_ROLE, useAuth } from "../auth/context";
import { Alert, Spinner } from "./ui";

// Renders children(demo) only when the server runs in demo mode.
function WhenDemo({ children }) {
    const demo = use(loadDemo());
    return demo ? children(demo) : null;
}

const OnlyInDemo = ({ children }) => (
    <Suspense fallback={null}>
        <WhenDemo>{children}</WhenDemo>
    </Suspense>
);

export function DemoBanner() {
    return (
        <OnlyInDemo>
            {(demo) => (
                <div className="demo-banner" role="note">
                    <div className="container">
                        <span>
                            <strong>Demo environment.</strong> Sample data
                            {demo.resetHours ? ` resets every ${demo.resetHours} hours` : " is shared by everyone"}. Emails
                            are not sent:
                        </span>
                        <Link to="/demo/inbox">open the demo inbox</Link>
                        <span className="muted">·</span>
                        <Link to="/login">one-click logins</Link>
                    </div>
                </div>
            )}
        </OnlyInDemo>
    );
}

const ROLE_ICONS = { patient: "🧑", doctor: "🩺", admin: "🛡️" };

function DemoLoginButtons({ accounts, next }) {
    const auth = useAuth();
    const navigate = useNavigate();
    const [pending, setPending] = useState(null);
    const [error, setError] = useState(null);

    const signIn = async (account) => {
        setPending(account.email);
        setError(null);
        try {
            const session = await api.post("/auth/login", {
                role: account.role,
                email: account.email,
                password: account.password,
            });
            auth.signIn(session);
            navigate(next || HOME_BY_ROLE[session.role], { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setPending(null);
        }
    };

    return (
        <section className="demo-logins stack-sm" aria-label="Demo accounts">
            <div>
                <strong>Try it in one click</strong>
                <p className="muted small">Shared demo accounts with sample appointments and reviews.</p>
            </div>
            <div className="demo-login-grid">
                {accounts.map((account) => (
                    <button
                        key={account.email}
                        type="button"
                        className="btn btn-secondary"
                        disabled={Boolean(pending)}
                        onClick={() => signIn(account)}
                    >
                        {pending === account.email ? <Spinner /> : <span aria-hidden="true">{ROLE_ICONS[account.role]}</span>}
                        {account.label}
                    </button>
                ))}
            </div>
            {error && <Alert tone="danger">{error}</Alert>}
        </section>
    );
}

export function DemoLogins({ next }) {
    return <OnlyInDemo>{(demo) => <DemoLoginButtons accounts={demo.accounts} next={next} />}</OnlyInDemo>;
}

export function DemoInboxHint({ children }) {
    return (
        <OnlyInDemo>
            {() => (
                <Alert tone="info">
                    {children}{" "}
                    <Link to="/demo/inbox" target="_blank">
                        Open the demo inbox ↗
                    </Link>
                </Alert>
            )}
        </OnlyInDemo>
    );
}
