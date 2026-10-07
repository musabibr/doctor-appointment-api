import { useState } from "react";
import { Link, useParams } from "react-router";
import { api } from "../../lib/api";
import { formError, useAsync, useFormAction } from "../../lib/hooks";
import { pageTitle } from "../../lib/config";
import { formatDate, formatDayLabel, formatMoney, formatTimeRange, plural } from "../../lib/format";
import { useAuth } from "../../auth/context";
import { useToast } from "../../components/toast";
import { Price } from "../../components/DoctorCard";
import { Alert, Avatar, EmptyState, ErrorState, PageLoader, RatingText, Stars, SubmitButton } from "../../components/ui";

const seatsLeft = (day) => day.slots.filter((s) => !s.isPast).reduce((sum, s) => sum + s.remaining, 0);

function Reviews({ doctorId }) {
    const [limit, setLimit] = useState(5);
    const reviews = useAsync(() => api.get(`/reviews/doctor/${doctorId}`, { limit }), [doctorId, limit]);

    if (reviews.error) return <ErrorState error={reviews.error} onRetry={reviews.reload} />;
    if (!reviews.data) return <div className="skeleton" style={{ height: 120 }} />;
    if (reviews.data.total === 0) return <p className="muted">No reviews yet. Reviews appear after completed visits.</p>;

    return (
        <div>
            {reviews.data.items.map((review) => (
                <article key={review._id} className="review-item stack-sm">
                    <div className="row between">
                        <div className="row-sm">
                            <Avatar src={review.patient?.photo} name={review.patient?.name || "Patient"} size={32} />
                            <strong>{review.patient?.name || "Former patient"}</strong>
                        </div>
                        <span className="muted small">{formatDate(review.createdAt.slice(0, 10))}</span>
                    </div>
                    <Stars value={review.rating} />
                    {review.comment && <p>{review.comment}</p>}
                </article>
            ))}
            {reviews.data.total > reviews.data.items.length && (
                <button type="button" className="btn btn-secondary btn-sm mt-2" onClick={() => setLimit((n) => n + 5)}>
                    Show more reviews
                </button>
            )}
        </div>
    );
}

function BookingPanel({ doctor, onBooked }) {
    const auth = useAuth();
    const { notify } = useToast();
    const days = doctor.availability.filter((day) => day.slots.some((slot) => !slot.isPast));
    const [dayId, setDayId] = useState(() => (days.find((d) => seatsLeft(d) > 0) || days[0])?._id);
    const [slotId, setSlotId] = useState(null);
    const [booked, setBooked] = useState(null);

    const day = days.find((d) => d._id === dayId) || days[0];
    const slot = day?.slots.find((s) => s._id === slotId);

    const [state, onSubmit, pending] = useFormAction(async (previous, formData) => {
        try {
            const appointment = await api.post("/appointments", {
                doctorId: doctor._id,
                availabilityId: day._id,
                slotId: slot._id,
                reasonForVisit: String(formData.get("reasonForVisit") || "").trim() || undefined,
            });
            setBooked(appointment);
            setSlotId(null);
            notify("Appointment requested");
            onBooked();
            return {};
        } catch (error) {
            onBooked(); // refresh seats, the slot may have just filled up
            return formError(error);
        }
    });

    if (booked) {
        return (
            <div className="stack">
                <Alert tone="success">
                    <strong>Request sent!</strong> Dr. {doctor.name} will confirm your appointment on{" "}
                    {formatDate(booked.appointmentDate)} at {formatTimeRange(booked.appointmentHour, booked.endHour)}. We will
                    email you when it is confirmed.
                </Alert>
                <div className="row">
                    <Link to="/appointments" className="btn btn-primary">
                        View my appointments
                    </Link>
                    <button type="button" className="btn btn-ghost" onClick={() => setBooked(null)}>
                        Book another time
                    </button>
                </div>
            </div>
        );
    }

    if (days.length === 0) {
        return (
            <EmptyState icon="🗓" title="No open times right now">
                Dr. {doctor.name} has not published upcoming availability. Please check back soon.
            </EmptyState>
        );
    }

    return (
        <form className="stack" onSubmit={onSubmit}>
            <div className="stack-sm">
                <span className="field-label">1. Choose a day</span>
                <div className="day-strip" role="group" aria-label="Available days">
                    {days.map((d) => {
                        const seats = seatsLeft(d);
                        return (
                            <button
                                key={d._id}
                                type="button"
                                className={`day-pill ${seats === 0 ? "full" : ""}`}
                                aria-pressed={d._id === day._id}
                                onClick={() => {
                                    setDayId(d._id);
                                    setSlotId(null);
                                }}
                            >
                                <span className="weekday">{formatDate(d.date, { weekday: "short" })}</span>
                                <span className="date">{formatDate(d.date, { month: "short", day: "numeric" })}</span>
                                <span className="seats">{seats === 0 ? "Full" : `${seats} left`}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="stack-sm">
                <span className="field-label">2. Choose a time · {formatDayLabel(day.date)}</span>
                <div className="slot-list" role="group" aria-label="Time slots">
                    {day.slots.map((s) => {
                        const unavailable = s.isPast || s.remaining === 0;
                        return (
                            <button
                                key={s._id}
                                type="button"
                                className="slot"
                                aria-pressed={s._id === slotId}
                                disabled={unavailable}
                                onClick={() => setSlotId(s._id)}
                            >
                                <strong>{formatTimeRange(s.start, s.end)}</strong>
                                <span className="small muted">
                                    {s.isPast ? "Ended" : s.remaining === 0 ? "Fully booked" : plural(s.remaining, "seat") + " left"}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {slot && (
                <>
                    <div className="field">
                        <label className="field-label" htmlFor="reason">
                            3. Reason for visit <span className="optional">(optional)</span>
                        </label>
                        <textarea
                            id="reason"
                            name="reasonForVisit"
                            className="control"
                            maxLength={500}
                            placeholder="Briefly describe your symptoms or what you need"
                        />
                    </div>
                    <div className="note row between">
                        <span>
                            {formatDayLabel(day.date)}, {formatTimeRange(slot.start, slot.end)}
                        </span>
                        <strong>{doctor.price ? formatMoney(doctor.finalPrice) : "Price on request"}</strong>
                    </div>
                </>
            )}

            {state.error && <Alert tone="danger">{state.error}</Alert>}

            {auth.isAuthenticated && auth.role === "patient" ? (
                <SubmitButton pending={pending} disabled={!slot} className="btn btn-primary btn-lg btn-block">
                    {slot ? "Request appointment" : "Select a time to continue"}
                </SubmitButton>
            ) : auth.isAuthenticated ? (
                <Alert tone="info">Only patient accounts can book appointments.</Alert>
            ) : (
                <Link
                    to={`/login?role=patient&next=${encodeURIComponent(`/doctors/${doctor._id}`)}`}
                    className="btn btn-primary btn-lg btn-block"
                >
                    Log in to book
                </Link>
            )}
        </form>
    );
}

export default function DoctorProfilePage() {
    const { id } = useParams();
    const doctor = useAsync(() => api.get(`/doctors/${id}`), [id]);

    if (doctor.error) {
        return (
            <div className="container narrow page">
                {doctor.error.status === 404 ? (
                    <EmptyState
                        icon="?"
                        title="Doctor not found"
                        action={
                            <Link to="/doctors" className="btn btn-primary">
                                Find another doctor
                            </Link>
                        }
                    >
                        This profile is not available.
                    </EmptyState>
                ) : (
                    <ErrorState error={doctor.error} onRetry={doctor.reload} />
                )}
            </div>
        );
    }
    if (!doctor.data) return <PageLoader />;

    const d = doctor.data;
    const clinic = d.clinic;

    return (
        <div className="container page">
            <title>{pageTitle(`Dr. ${d.name} · ${d.specialty}`)}</title>
            <div className="profile-layout">
                <div className="stack">
                    <section className="card padded-lg">
                        <div className="profile-header">
                            <Avatar src={d.photo} name={d.name} size={96} />
                            <div className="stack-sm grow">
                                <h1>Dr. {d.name}</h1>
                                <div className="row-sm">
                                    <span className="tag">{d.specialty}</span>
                                    <RatingText average={d.ratingAverage} count={d.ratingCount} />
                                </div>
                                {clinic && (
                                    <span className="muted small">
                                        📍 {clinic.name}, {clinic.location?.city}
                                    </span>
                                )}
                            </div>
                            <div className="stack-sm" style={{ alignItems: "flex-end" }}>
                                <Price price={d.price} finalPrice={d.finalPrice} discount={d.discount} />
                                {d.discount > 0 && <span className="badge badge-success">{d.discount}% off</span>}
                            </div>
                        </div>
                    </section>

                    <section className="card stack-sm">
                        <h2>About</h2>
                        <p className="muted wrap-anywhere">{d.about || "This doctor has not added a description yet."}</p>
                    </section>

                    <section className="card stack-sm">
                        <h2>Clinic</h2>
                        {clinic ? (
                            <div className="stack-sm">
                                <strong>{clinic.name}</strong>
                                <span className="muted">
                                    {[clinic.location?.address, clinic.location?.city, clinic.location?.state].filter(Boolean).join(", ")}
                                </span>
                                <span className="small">
                                    📞 <a href={`tel:${clinic.contact?.phone}`}>{clinic.contact?.phone}</a>
                                    {clinic.contact?.email && (
                                        <>
                                            {" · "}✉ <a href={`mailto:${clinic.contact.email}`}>{clinic.contact.email}</a>
                                        </>
                                    )}
                                </span>
                                {clinic.services?.length > 0 && (
                                    <div className="row-sm mt-1">
                                        {clinic.services.map((service) => (
                                            <span key={service} className="tag">
                                                {service}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="muted">{d.address}</p>
                        )}
                    </section>

                    <section className="card stack-sm">
                        <h2>Patient reviews</h2>
                        <Reviews doctorId={d._id} />
                    </section>
                </div>

                <aside className="card padded-lg booking-panel stack">
                    <h2>Book an appointment</h2>
                    <BookingPanel doctor={d} onBooked={doctor.reload} />
                </aside>
            </div>
        </div>
    );
}
