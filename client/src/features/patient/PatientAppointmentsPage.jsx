import { useState } from "react";
import { Link } from "react-router";
import { api } from "../../lib/api";
import { usePendingAction, useAsync } from "../../lib/hooks";
import { pageTitle } from "../../lib/config";
import { appointmentTiming } from "../../lib/appointments";
import { useToast } from "../../components/toast";
import AppointmentCard from "../../components/AppointmentCard";
import {
    Alert,
    ConfirmDialog,
    EmptyState,
    ErrorState,
    Modal,
    PageHeader,
    Pagination,
    Spinner,
    StarInput,
    Tabs,
} from "../../components/ui";

function ReviewDialog({ appointment, onClose, onSaved }) {
    const { notify } = useToast();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [pending, setPending] = useState(false);
    const [error, setError] = useState(null);

    const submit = async () => {
        setPending(true);
        setError(null);
        try {
            await api.post("/reviews", { appointmentId: appointment._id, rating, comment: comment.trim() });
            notify("Thank you for your review!");
            onSaved();
        } catch (err) {
            setError(err.message);
        } finally {
            setPending(false);
        }
    };

    return (
        <Modal
            open={Boolean(appointment)}
            title={appointment?.doctor ? `Review Dr. ${appointment.doctor.name}` : "Leave a review"}
            onClose={onClose}
            footer={
                <>
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="button" className="btn btn-primary" disabled={!rating || pending} onClick={submit}>
                        {pending && <Spinner />}
                        Post review
                    </button>
                </>
            }
        >
            <div className="stack">
                <div className="stack-sm">
                    <span className="field-label">How was your visit?</span>
                    <StarInput value={rating} onChange={setRating} />
                </div>
                <div className="field">
                    <label className="field-label" htmlFor="review-comment">
                        Your review <span className="optional">(optional)</span>
                    </label>
                    <textarea
                        id="review-comment"
                        className="control"
                        maxLength={1000}
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        placeholder="What went well? What could be better?"
                    />
                </div>
                {error && <Alert tone="danger">{error}</Alert>}
            </div>
        </Modal>
    );
}

export default function PatientAppointmentsPage() {
    const { notify } = useToast();
    const [scope, setScope] = useState("upcoming");
    const [page, setPage] = useState(1);
    const [cancelling, setCancelling] = useState(null);
    const [reviewing, setReviewing] = useState(null);
    const [cancelError, setCancelError] = useState(null);
    const [pendingKey, run] = usePendingAction();

    const list = useAsync(() => api.get("/appointments", { scope, page, limit: 10 }), [scope, page]);

    const changeScope = (next) => {
        setScope(next);
        setPage(1);
    };

    const cancel = (reason) =>
        run("cancel", async () => {
            setCancelError(null);
            try {
                await api.patch(`/appointments/${cancelling._id}/cancel`, { reason: reason || undefined });
                notify("Appointment canceled");
                setCancelling(null);
                list.reload();
            } catch (error) {
                setCancelError(error.message);
            }
        });

    return (
        <div className="container medium page">
            <title>{pageTitle("My appointments")}</title>
            <PageHeader
                title="My appointments"
                description="Track your bookings, cancel if plans change and review past visits."
                actions={
                    <Link to="/doctors" className="btn btn-primary">
                        Book a new appointment
                    </Link>
                }
            />

            <Tabs
                value={scope}
                onChange={changeScope}
                tabs={[
                    { id: "upcoming", label: "Upcoming" },
                    { id: "history", label: "Past & canceled" },
                ]}
            />

            {list.error ? (
                <ErrorState error={list.error} onRetry={list.reload} />
            ) : !list.data ? (
                <div className="stack">
                    <div className="skeleton" style={{ height: 150 }} />
                    <div className="skeleton" style={{ height: 150 }} />
                </div>
            ) : list.data.items.length === 0 ? (
                <EmptyState
                    icon="🗓"
                    title={scope === "upcoming" ? "No upcoming appointments" : "Nothing here yet"}
                    action={
                        <Link to="/doctors" className="btn btn-primary">
                            Find a doctor
                        </Link>
                    }
                >
                    {scope === "upcoming"
                        ? "When you book a visit it will show up here."
                        : "Completed, declined and canceled visits will appear here."}
                </EmptyState>
            ) : (
                <div className="stack">
                    {list.data.items.map((appointment) => {
                        const timing = appointmentTiming(appointment);
                        const doctorLink = appointment.doctor && `/doctors/${appointment.doctor._id}`;
                        return (
                            <AppointmentCard key={appointment._id} appointment={appointment} viewer="patient">
                                {timing.active && !timing.ended && (
                                    <button
                                        type="button"
                                        className="btn btn-danger-outline btn-sm"
                                        onClick={() => {
                                            setCancelError(null);
                                            setCancelling(appointment);
                                        }}
                                    >
                                        Cancel appointment
                                    </button>
                                )}
                                {appointment.status === "completed" && !appointment.review && (
                                    <button type="button" className="btn btn-primary btn-sm" onClick={() => setReviewing(appointment)}>
                                        ★ Leave a review
                                    </button>
                                )}
                                {appointment.status === "completed" && appointment.review && (
                                    <span className="badge badge-success">Reviewed</span>
                                )}
                                {!timing.active && doctorLink && (
                                    <Link to={doctorLink} className="btn btn-secondary btn-sm">
                                        Book again
                                    </Link>
                                )}
                            </AppointmentCard>
                        );
                    })}
                    <Pagination page={list.data.page} pages={list.data.pages} onChange={setPage} />
                </div>
            )}

            <ConfirmDialog
                open={Boolean(cancelling)}
                title="Cancel this appointment?"
                message="The doctor will be notified and the time slot will be released for other patients."
                confirmLabel="Cancel appointment"
                tone="danger"
                textLabel="Reason"
                textPlaceholder="Let the doctor know why (optional)"
                pending={pendingKey === "cancel"}
                error={cancelError}
                onConfirm={cancel}
                onClose={() => setCancelling(null)}
            />

            <ReviewDialog
                key={reviewing?._id}
                appointment={reviewing}
                onClose={() => setReviewing(null)}
                onSaved={() => {
                    setReviewing(null);
                    list.reload();
                }}
            />
        </div>
    );
}
