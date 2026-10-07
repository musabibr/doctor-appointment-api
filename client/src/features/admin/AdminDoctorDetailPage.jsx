import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api, assetUrl } from "../../lib/api";
import { useAsync, usePendingAction } from "../../lib/hooks";
import { pageTitle } from "../../lib/config";
import { formatDateTime, formatMoney } from "../../lib/format";
import { useToast } from "../../components/toast";
import { Alert, Avatar, ConfirmDialog, ErrorState, PageLoader, Spinner, StatusBadge } from "../../components/ui";

function DocumentPreview({ label, url }) {
    if (!url) return null;
    const href = assetUrl(url);
    const isPdf = /\.pdf($|\?)/i.test(url);
    return (
        <div className="doc-preview">
            {isPdf ? <iframe src={href} title={label} /> : <img src={href} alt={label} />}
            <div className="doc-caption">
                <strong>{label}</strong>
                <a href={href} target="_blank" rel="noreferrer">
                    Open in new tab ↗
                </a>
            </div>
        </div>
    );
}

function Detail({ label, children }) {
    return (
        <div className="stack-sm" style={{ gap: 2 }}>
            <span className="muted tiny strong">{label.toUpperCase()}</span>
            <span className="wrap-anywhere">{children || <span className="muted">—</span>}</span>
        </div>
    );
}

export default function AdminDoctorDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { notify } = useToast();
    const doctor = useAsync(() => api.get(`/admin/doctors/${id}`), [id]);
    const [dialog, setDialog] = useState(null); // "reject" | "delete"
    const [error, setError] = useState(null);
    const [pendingKey, run] = usePendingAction();

    const act = (key, request, message, after) =>
        run(key, async () => {
            setError(null);
            try {
                await request();
                notify(message);
                setDialog(null);
                after();
            } catch (err) {
                if (dialog) setError(err.errors?.reason || err.message);
                else notify(err.message, "error");
            }
        });

    if (doctor.error) return <div className="container page"><ErrorState error={doctor.error} onRetry={doctor.reload} /></div>;
    if (!doctor.data) return <PageLoader />;

    const d = doctor.data;
    const clinic = d.clinic;

    return (
        <div className="container page stack">
            <title>{pageTitle(`Dr. ${d.name}`)}</title>
            <Link to="/admin/doctors" className="small">
                ← All doctors
            </Link>

            <section className="card padded-lg">
                <div className="profile-header">
                    <Avatar src={d.photo} name={d.name} size={80} />
                    <div className="stack-sm grow">
                        <h1>Dr. {d.name}</h1>
                        <div className="row-sm">
                            <span className="tag">{d.specialty}</span>
                            <StatusBadge status={d.approvalStatus} />
                            {!d.isVerified && <span className="badge badge-warning">Email not verified</span>}
                        </div>
                        <span className="muted small">Registered {formatDateTime(d.createdAt)}</span>
                    </div>
                    <div className="row">
                        {d.approvalStatus !== "approved" && (
                            <button
                                type="button"
                                className="btn btn-success"
                                disabled={pendingKey === "approve"}
                                onClick={() => act("approve", () => api.patch(`/admin/doctors/${id}/approve`), "Doctor approved", doctor.reload)}
                            >
                                {pendingKey === "approve" && <Spinner />}
                                Approve
                            </button>
                        )}
                        {d.approvalStatus === "pending" && (
                            <button type="button" className="btn btn-danger-outline" onClick={() => setDialog("reject")}>
                                Reject
                            </button>
                        )}
                        <button type="button" className="btn btn-ghost" onClick={() => setDialog("delete")}>
                            Delete account
                        </button>
                    </div>
                </div>
            </section>

            {d.approvalStatus === "rejected" && d.rejectionReason && (
                <Alert tone="danger">
                    <strong>Rejected:</strong> {d.rejectionReason}
                </Alert>
            )}
            {!d.isVerified && (
                <Alert tone="warning">
                    This doctor has not verified their email yet. They can only sign in and appear in search after verifying.
                </Alert>
            )}

            <div className="grid-2">
                <section className="card stack">
                    <h2>Profile</h2>
                    <div className="grid-2">
                        <Detail label="Email">{d.email}</Detail>
                        <Detail label="Phone">{d.phoneNumber}</Detail>
                        <Detail label="Gender">{d.gender}</Detail>
                        <Detail label="Price">{d.price ? `${formatMoney(d.price)}${d.discount ? ` (−${d.discount}%)` : ""}` : null}</Detail>
                    </div>
                    <Detail label="Practice address">{d.address}</Detail>
                    <Detail label="About">{d.about}</Detail>
                </section>

                <section className="card stack">
                    <h2>Clinic</h2>
                    {clinic ? (
                        <>
                            <Detail label="Name">{clinic.name}</Detail>
                            <Detail label="Location">
                                {[clinic.location?.address, clinic.location?.city, clinic.location?.state].filter(Boolean).join(", ")}
                            </Detail>
                            <Detail label="Contact">{[clinic.contact?.phone, clinic.contact?.email].filter(Boolean).join(" · ")}</Detail>
                            <Detail label="Services">{clinic.services?.join(", ")}</Detail>
                        </>
                    ) : (
                        <p className="muted">No clinic details yet.</p>
                    )}
                </section>
            </div>

            <section className="card stack">
                <h2>Verification documents</h2>
                <p className="muted small">Check that the license is valid and that the name matches the ID before approving.</p>
                <div className="grid-2">
                    <DocumentPreview label="Medical license" url={d.medicalLicense} />
                    <DocumentPreview label="Personal ID" url={d.personalID} />
                </div>
            </section>

            <ConfirmDialog
                open={dialog === "reject"}
                title="Reject this application?"
                message="The doctor will receive an email with your reason."
                confirmLabel="Reject application"
                tone="danger"
                textLabel="Reason"
                textPlaceholder="e.g. The medical license image is not readable"
                textRequired
                textMinLength={5}
                pending={pendingKey === "reject"}
                error={error}
                onConfirm={(reason) =>
                    act("reject", () => api.patch(`/admin/doctors/${id}/reject`, { reason }), "Application rejected", doctor.reload)
                }
                onClose={() => setDialog(null)}
            />
            <ConfirmDialog
                open={dialog === "delete"}
                title={`Delete Dr. ${d.name}?`}
                message="This permanently removes the account, its clinic and reviews. Upcoming appointments are canceled and patients are notified. This cannot be undone."
                confirmLabel="Delete permanently"
                tone="danger"
                pending={pendingKey === "delete"}
                error={error}
                onConfirm={() =>
                    act("delete", () => api.delete(`/admin/doctors/${id}`), "Doctor deleted", () => navigate("/admin/doctors", { replace: true }))
                }
                onClose={() => setDialog(null)}
            />
        </div>
    );
}
