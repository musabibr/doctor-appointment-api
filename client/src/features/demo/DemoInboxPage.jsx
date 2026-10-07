import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../../lib/api";
import { useAsync } from "../../lib/hooks";
import { pageTitle } from "../../lib/config";
import { formatRelativeTime } from "../../lib/format";
import { EmptyState, ErrorState, PageHeader } from "../../components/ui";

const REFRESH_MS = 5000;

const findCode = (email) => (/code/i.test(email.subject) ? email.text.match(/\b(\d{6})\b/)?.[1] : null);
const findLinks = (email) => [...new Set(email.text.match(/https?:\/\/[^\s\])]+/g) || [])];

function CopyButton({ value }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // Clipboard unavailable (e.g. plain http): the code stays selectable.
        }
    };
    return (
        <button type="button" className="btn btn-secondary btn-sm" onClick={copy}>
            {copied ? "Copied" : "Copy"}
        </button>
    );
}

function EmailCard({ email }) {
    const code = findCode(email);
    const links = findLinks(email);
    return (
        <article className="card stack-sm">
            <div className="row between">
                <strong>{email.subject}</strong>
                <span className="muted small">{formatRelativeTime(email.sentAt)}</span>
            </div>
            <span className="muted small">To: {email.to}</span>

            {code && (
                <div className="row demo-code">
                    <span className="otp-display">{code}</span>
                    <CopyButton value={code} />
                </div>
            )}
            {links.length > 0 && (
                <div className="row-sm">
                    {links.map((href) => (
                        <a key={href} href={href} className="btn btn-primary btn-sm">
                            Open link{href.includes("reset-password") ? ": reset password" : ""}
                        </a>
                    ))}
                </div>
            )}

            <details>
                <summary className="small muted" style={{ cursor: "pointer" }}>
                    Show full email
                </summary>
                <pre className="email-text">{email.text}</pre>
            </details>
        </article>
    );
}

export default function DemoInboxPage() {
    const [to, setTo] = useState("");
    const emails = useAsync(() => api.get("/demo/emails", { to }), [to]);
    const { reload } = emails;

    // New emails show up without reloading the page.
    useEffect(() => {
        const timer = setInterval(reload, REFRESH_MS);
        return () => clearInterval(timer);
    }, [reload]);

    const notDemo = emails.error?.status === 404;

    return (
        <div className="container medium page">
            <title>{pageTitle("Demo inbox")}</title>
            <PageHeader
                title="Demo inbox"
                description="This demo does not send real emails. Verification codes, password reset links and notifications appear here instead (newest first, updated every few seconds)."
            />

            {notDemo ? (
                <EmptyState icon="✉" title="The demo inbox is off" action={<Link to="/" className="btn btn-primary">Back to home</Link>}>
                    It is only available when the app runs in demo mode.
                </EmptyState>
            ) : (
                <div className="stack">
                    <form
                        className="row-sm"
                        role="search"
                        onSubmit={(event) => {
                            event.preventDefault();
                            setTo(String(new FormData(event.currentTarget).get("to") || "").trim());
                        }}
                    >
                        <input name="to" type="search" className="control" placeholder="Filter by recipient email" style={{ maxWidth: 320 }} />
                        <button type="submit" className="btn btn-secondary">
                            Filter
                        </button>
                    </form>

                    {emails.error ? (
                        <ErrorState error={emails.error} onRetry={reload} />
                    ) : !emails.data ? (
                        <div className="skeleton" style={{ height: 140 }} />
                    ) : emails.data.length === 0 ? (
                        <EmptyState icon="✉" title="No emails yet">
                            Register as a doctor, ask for a password reset or book an appointment, and the email will show up here.
                        </EmptyState>
                    ) : (
                        emails.data.map((email) => <EmailCard key={email.id} email={email} />)
                    )}
                </div>
            )}
        </div>
    );
}
