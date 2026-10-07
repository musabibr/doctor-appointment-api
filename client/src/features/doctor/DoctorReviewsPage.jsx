import { useState } from "react";
import { api } from "../../lib/api";
import { useAsync, usePendingAction } from "../../lib/hooks";
import { pageTitle } from "../../lib/config";
import { formatDate } from "../../lib/format";
import { useAuth } from "../../auth/context";
import { useToast } from "../../components/toast";
import { Avatar, ConfirmDialog, EmptyState, ErrorState, PageHeader, Pagination, RatingText, Stars } from "../../components/ui";

export default function DoctorReviewsPage() {
    const auth = useAuth();
    const { notify } = useToast();
    const [page, setPage] = useState(1);
    const [reporting, setReporting] = useState(null);
    const [error, setError] = useState(null);
    const [pendingKey, run] = usePendingAction();
    const doctorId = auth.user?._id;

    const reviews = useAsync(() => api.get(`/reviews/doctor/${doctorId}`, { page, limit: 10 }), [doctorId, page]);

    const report = (reason) =>
        run("report", async () => {
            setError(null);
            try {
                await api.post(`/reviews/${reporting._id}/report`, { reason });
                notify("Review reported. An admin will take a look.");
                setReporting(null);
                reviews.reload();
            } catch (err) {
                setError(err.errors?.reason || err.message);
            }
        });

    return (
        <div className="container medium page">
            <title>{pageTitle("My reviews")}</title>
            <PageHeader
                title="Patient reviews"
                description="Patients can review you after a completed visit. Report reviews that are abusive or not genuine."
                actions={<RatingText average={auth.user?.ratingAverage || 0} count={auth.user?.ratingCount || 0} />}
            />

            {reviews.error ? (
                <ErrorState error={reviews.error} onRetry={reviews.reload} />
            ) : !reviews.data ? (
                <div className="skeleton" style={{ height: 140 }} />
            ) : reviews.data.items.length === 0 ? (
                <EmptyState icon="★" title="No reviews yet">
                    Reviews appear here after you mark visits as completed and patients rate them.
                </EmptyState>
            ) : (
                <div className="stack">
                    {reviews.data.items.map((review) => (
                        <article key={review._id} className="card stack-sm">
                            <div className="row between">
                                <div className="row-sm">
                                    <Avatar src={review.patient?.photo} name={review.patient?.name || "Patient"} size={36} />
                                    <div>
                                        <strong>{review.patient?.name || "Former patient"}</strong>
                                        <div className="muted tiny">{formatDate(review.createdAt.slice(0, 10))}</div>
                                    </div>
                                </div>
                                <Stars value={review.rating} />
                            </div>
                            {review.comment ? <p>{review.comment}</p> : <p className="muted small">No comment.</p>}
                            <div className="row end">
                                {review.reported ? (
                                    <span className="badge badge-warning">Reported · under review</span>
                                ) : (
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => {
                                            setError(null);
                                            setReporting(review);
                                        }}
                                    >
                                        ⚑ Report
                                    </button>
                                )}
                            </div>
                        </article>
                    ))}
                    <Pagination page={reviews.data.page} pages={reviews.data.pages} onChange={setPage} />
                </div>
            )}

            <ConfirmDialog
                open={Boolean(reporting)}
                title="Report this review?"
                message="An admin will check it and remove it if it breaks the rules."
                confirmLabel="Send report"
                tone="danger"
                textLabel="What is wrong with it?"
                textPlaceholder="e.g. Abusive language, or this person was never my patient"
                textRequired
                textMinLength={5}
                pending={pendingKey === "report"}
                error={error}
                onConfirm={report}
                onClose={() => setReporting(null)}
            />
        </div>
    );
}
