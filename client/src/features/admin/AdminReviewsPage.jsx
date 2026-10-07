import { useState } from "react";
import { api } from "../../lib/api";
import { useAsync, usePendingAction } from "../../lib/hooks";
import { pageTitle } from "../../lib/config";
import { formatDateTime } from "../../lib/format";
import { useToast } from "../../components/toast";
import { ConfirmDialog, EmptyState, ErrorState, PageHeader, Pagination, Spinner, Stars } from "../../components/ui";

export default function AdminReviewsPage() {
    const { notify } = useToast();
    const [page, setPage] = useState(1);
    const [deleting, setDeleting] = useState(null);
    const [error, setError] = useState(null);
    const [pendingKey, run] = usePendingAction();
    const reviews = useAsync(() => api.get("/admin/reviews/reported", { page }), [page]);

    const dismiss = (review) =>
        run(`dismiss:${review._id}`, async () => {
            try {
                await api.patch(`/admin/reviews/${review._id}/dismiss`);
                notify("Report dismissed, the review stays visible");
                reviews.reload();
            } catch (err) {
                notify(err.message, "error");
            }
        });

    const remove = () =>
        run("delete", async () => {
            setError(null);
            try {
                await api.delete(`/admin/reviews/${deleting._id}`);
                notify("Review deleted");
                setDeleting(null);
                reviews.reload();
            } catch (err) {
                setError(err.message);
            }
        });

    return (
        <div className="container medium page">
            <title>{pageTitle("Reported reviews")}</title>
            <PageHeader title="Reported reviews" description="Doctors flag reviews they believe are abusive or not genuine. Keep or remove them." />

            {reviews.error ? (
                <ErrorState error={reviews.error} onRetry={reviews.reload} />
            ) : !reviews.data ? (
                <div className="skeleton" style={{ height: 180 }} />
            ) : reviews.data.items.length === 0 ? (
                <EmptyState icon="✓" title="Nothing to moderate">
                    Reported reviews will show up here.
                </EmptyState>
            ) : (
                <div className="stack">
                    {reviews.data.items.map((review) => (
                        <article key={review._id} className="card stack-sm">
                            <div className="row between">
                                <div>
                                    <strong>{review.patient?.name || "Deleted patient"}</strong>
                                    <span className="muted"> reviewed </span>
                                    <strong>{review.doctor ? `Dr. ${review.doctor.name}` : "a deleted doctor"}</strong>
                                </div>
                                <Stars value={review.rating} />
                            </div>
                            <p className="wrap-anywhere">{review.comment || <span className="muted">No comment</span>}</p>
                            <div className="note">
                                <strong>Doctor’s report:</strong> {review.reportReason}
                                {review.reportedAt && <div className="muted tiny mt-1">Reported {formatDateTime(review.reportedAt)}</div>}
                            </div>
                            <div className="row end">
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    disabled={pendingKey === `dismiss:${review._id}`}
                                    onClick={() => dismiss(review)}
                                >
                                    {pendingKey === `dismiss:${review._id}` && <Spinner />}
                                    Keep review
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger btn-sm"
                                    onClick={() => {
                                        setError(null);
                                        setDeleting(review);
                                    }}
                                >
                                    Delete review
                                </button>
                            </div>
                        </article>
                    ))}
                    <Pagination page={reviews.data.page} pages={reviews.data.pages} onChange={setPage} />
                </div>
            )}

            <ConfirmDialog
                open={Boolean(deleting)}
                title="Delete this review?"
                message="It will disappear from the doctor's profile and their rating will be recalculated."
                confirmLabel="Delete review"
                tone="danger"
                pending={pendingKey === "delete"}
                error={error}
                onConfirm={remove}
                onClose={() => setDeleting(null)}
            />
        </div>
    );
}
