import { useState } from "react";
import { api } from "../../lib/api";
import { useAsync, usePendingAction } from "../../lib/hooks";
import { pageTitle } from "../../lib/config";
import { addDaysToKey, formatDate, formatDayLabel, formatTimeRange, localTodayKey, plural } from "../../lib/format";
import { useToast } from "../../components/toast";
import { Alert, ConfirmDialog, EmptyState, ErrorState, Modal, PageHeader, PageLoader, Spinner } from "../../components/ui";
import ApprovalNotice from "./ApprovalNotice";

const PRESETS = [
    ["Morning", "09:00", "12:00"],
    ["Afternoon", "13:00", "16:00"],
    ["Evening", "16:00", "19:00"],
];

let slotSequence = 0;
const newSlot = (start = "09:00", end = "12:00") => ({ key: `new-${++slotSequence}`, start, end, maxPatients: 4, booked: 0 });

// Controlled editor for one day of availability.
function DayEditor({ initial, submitLabel, onSubmit, onCancel, allowRepeat = false }) {
    const [date, setDate] = useState(initial?.date || addDaysToKey(localTodayKey(), 1));
    const [slots, setSlots] = useState(
        initial ? initial.slots.map((s) => ({ ...s, key: s._id })) : [newSlot()]
    );
    const [repeatDays, setRepeatDays] = useState(0);
    const [errors, setErrors] = useState({});
    const [error, setError] = useState(null);
    const [pending, setPending] = useState(false);

    const hasBookings = slots.some((s) => s.booked > 0);
    const update = (key, changes) => setSlots((list) => list.map((s) => (s.key === key ? { ...s, ...changes } : s)));

    const submit = async (event) => {
        event.preventDefault();
        setPending(true);
        setErrors({});
        setError(null);
        try {
            const payload = {
                date,
                slots: slots.map((s) => ({
                    ...(s._id ? { _id: s._id } : {}),
                    start: s.start,
                    end: s.end,
                    maxPatients: Number(s.maxPatients),
                })),
            };
            await onSubmit(payload, repeatDays);
        } catch (err) {
            setErrors(err.errors || {});
            setError(err.message);
        } finally {
            setPending(false);
        }
    };

    // Server errors are keyed by the submitted index: "slots.2".
    const slotError = (index) => errors[`slots.${index}`];

    return (
        <form className="form" onSubmit={submit} noValidate>
            <div className="form-grid">
                <div className="field">
                    <label className="field-label" htmlFor="day-date">
                        Date
                    </label>
                    <input
                        id="day-date"
                        type="date"
                        className="control"
                        min={localTodayKey()}
                        value={date}
                        disabled={hasBookings}
                        aria-invalid={errors.date ? true : undefined}
                        onChange={(event) => setDate(event.target.value)}
                    />
                    {errors.date ? (
                        <span className="field-error">{errors.date}</span>
                    ) : (
                        hasBookings && <span className="field-hint">The date is locked because this day has bookings.</span>
                    )}
                </div>
                {allowRepeat && (
                    <div className="field">
                        <label className="field-label" htmlFor="day-repeat">
                            Repeat
                        </label>
                        <select id="day-repeat" className="control" value={repeatDays} onChange={(e) => setRepeatDays(Number(e.target.value))}>
                            <option value={0}>Only this day</option>
                            <option value={6}>This day and the next 6 days</option>
                            <option value={13}>This day and the next 13 days</option>
                        </select>
                    </div>
                )}
            </div>

            <div className="stack-sm">
                <span className="field-label">Time slots</span>
                {slots.map((slot, index) => (
                    <div key={slot.key} className="stack-sm">
                        <div className="slot-editor-row">
                            <div className="field">
                                <label className="field-label tiny" htmlFor={`start-${slot.key}`}>
                                    From
                                </label>
                                <input
                                    id={`start-${slot.key}`}
                                    type="time"
                                    className="control"
                                    value={slot.start}
                                    disabled={slot.booked > 0}
                                    onChange={(e) => update(slot.key, { start: e.target.value })}
                                />
                            </div>
                            <div className="field">
                                <label className="field-label tiny" htmlFor={`end-${slot.key}`}>
                                    To
                                </label>
                                <input
                                    id={`end-${slot.key}`}
                                    type="time"
                                    className="control"
                                    value={slot.end}
                                    disabled={slot.booked > 0}
                                    onChange={(e) => update(slot.key, { end: e.target.value })}
                                />
                            </div>
                            <div className="field">
                                <label className="field-label tiny" htmlFor={`max-${slot.key}`}>
                                    Patients
                                </label>
                                <input
                                    id={`max-${slot.key}`}
                                    type="number"
                                    className="control"
                                    min={Math.max(1, slot.booked)}
                                    max={50}
                                    value={slot.maxPatients}
                                    onChange={(e) => update(slot.key, { maxPatients: e.target.value })}
                                />
                            </div>
                            <button
                                type="button"
                                className="btn btn-ghost"
                                aria-label="Remove slot"
                                disabled={slot.booked > 0 || slots.length === 1}
                                title={slot.booked > 0 ? "This slot has bookings" : "Remove slot"}
                                onClick={() => setSlots((list) => list.filter((s) => s.key !== slot.key))}
                            >
                                ✕
                            </button>
                        </div>
                        {slot.booked > 0 && <span className="field-hint">{plural(slot.booked, "booking")}: only the capacity can change.</span>}
                        {slotError(index) && <span className="field-error">{slotError(index)}</span>}
                    </div>
                ))}
                <div className="row-sm">
                    {PRESETS.map(([label, start, end]) => (
                        <button key={label} type="button" className="btn btn-secondary btn-sm" onClick={() => setSlots((list) => [...list, newSlot(start, end)])}>
                            + {label} ({formatTimeRange(start, end)})
                        </button>
                    ))}
                </div>
                {errors.slots && <span className="field-error">{errors.slots}</span>}
            </div>

            {error && <Alert tone="danger">{error}</Alert>}
            <div className="row end">
                {onCancel && (
                    <button type="button" className="btn btn-secondary" onClick={onCancel}>
                        Cancel
                    </button>
                )}
                <button type="submit" className="btn btn-primary" disabled={pending}>
                    {pending && <Spinner />}
                    {submitLabel}
                </button>
            </div>
        </form>
    );
}

function DayCard({ day, onEdit, onDelete, readOnly }) {
    const booked = day.slots.reduce((sum, s) => sum + s.booked, 0);
    const capacity = day.slots.reduce((sum, s) => sum + s.maxPatients, 0);
    return (
        <article className="card stack-sm">
            <div className="row between">
                <div>
                    <h3>{formatDayLabel(day.date)}</h3>
                    <span className="muted small">{formatDate(day.date)}</span>
                </div>
                <span className={`badge ${booked >= capacity ? "badge-neutral" : "badge-primary"}`}>
                    {booked}/{capacity} booked
                </span>
            </div>
            <div className="stack-sm">
                {day.slots.map((slot) => (
                    <div key={slot._id} className="row between small">
                        <span>{formatTimeRange(slot.start, slot.end)}</span>
                        <span className="muted">
                            {slot.booked}/{slot.maxPatients} patients
                        </span>
                    </div>
                ))}
            </div>
            {!readOnly && (
                <div className="row end mt-1">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => onEdit(day)}>
                        Edit
                    </button>
                    <button
                        type="button"
                        className="btn btn-danger-outline btn-sm"
                        disabled={booked > 0}
                        title={booked > 0 ? "Decline or cancel the bookings first" : undefined}
                        onClick={() => onDelete(day)}
                    >
                        Remove
                    </button>
                </div>
            )}
        </article>
    );
}

export default function DoctorAvailabilityPage() {
    const { notify } = useToast();
    const profile = useAsync(() => api.get("/doctors/me"), []);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [deleteError, setDeleteError] = useState(null);
    const [formKey, setFormKey] = useState(0);
    const [pendingKey, run] = usePendingAction();

    if (profile.error) return <div className="container page"><ErrorState error={profile.error} onRetry={profile.reload} /></div>;
    if (!profile.data) return <PageLoader />;

    const doctor = profile.data;
    const approved = doctor.approvalStatus === "approved";
    const today = localTodayKey();
    const upcoming = doctor.availability.filter((day) => day.date >= today);
    const past = doctor.availability.filter((day) => day.date < today).reverse();

    const addDays = async (payload, repeatDays) => {
        const dates = Array.from({ length: repeatDays + 1 }, (_, i) => addDaysToKey(payload.date, i));
        const skipped = [];
        for (const [index, date] of dates.entries()) {
            try {
                await api.post("/doctors/me/availability", { ...payload, date });
            } catch (error) {
                // The first day must succeed; later days that already exist are skipped.
                if (index === 0 || error.status !== 409) throw error;
                skipped.push(formatDayLabel(date));
            }
        }
        notify(
            skipped.length
                ? `Saved. Skipped ${plural(skipped.length, "day")} that already had availability.`
                : dates.length > 1
                  ? `Availability added for ${dates.length} days`
                  : "Availability added"
        );
        setFormKey((k) => k + 1);
        profile.reload();
    };

    const saveEdit = async (payload) => {
        await api.patch(`/doctors/me/availability/${editing._id}`, payload);
        notify("Day updated");
        setEditing(null);
        profile.reload();
    };

    const remove = () =>
        run("delete", async () => {
            setDeleteError(null);
            try {
                await api.delete(`/doctors/me/availability/${deleting._id}`);
                notify("Day removed");
                setDeleting(null);
                profile.reload();
            } catch (error) {
                setDeleteError(error.message);
            }
        });

    return (
        <div className="container page">
            <title>{pageTitle("Availability")}</title>
            <PageHeader title="Availability" description="Publish the days and hours patients can book. Each slot can take several patients." />
            <div className="stack-lg">
                <ApprovalNotice doctor={doctor} />

                {approved && (
                    <section className="card padded-lg stack">
                        <h2>Add availability</h2>
                        <DayEditor key={formKey} submitLabel="Add availability" onSubmit={addDays} allowRepeat />
                    </section>
                )}

                <section className="stack">
                    <h2>Upcoming days</h2>
                    {upcoming.length === 0 ? (
                        <EmptyState icon="🗓" title="No upcoming availability">
                            {approved ? "Add a day above so patients can book you." : "You can add availability once your account is approved."}
                        </EmptyState>
                    ) : (
                        <div className="grid-auto">
                            {upcoming.map((day) => (
                                <DayCard
                                    key={day._id}
                                    day={day}
                                    readOnly={!approved}
                                    onEdit={setEditing}
                                    onDelete={(d) => {
                                        setDeleteError(null);
                                        setDeleting(d);
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </section>

                {past.length > 0 && (
                    <details className="card">
                        <summary className="strong" style={{ cursor: "pointer" }}>
                            Past days ({past.length})
                        </summary>
                        <div className="grid-auto mt-2">
                            {past.map((day) => (
                                <DayCard key={day._id} day={day} readOnly />
                            ))}
                        </div>
                    </details>
                )}
            </div>

            <Modal open={Boolean(editing)} title={editing ? `Edit ${formatDayLabel(editing.date)}` : ""} onClose={() => setEditing(null)}>
                {editing && <DayEditor key={editing._id} initial={editing} submitLabel="Save changes" onSubmit={saveEdit} onCancel={() => setEditing(null)} />}
            </Modal>

            <ConfirmDialog
                open={Boolean(deleting)}
                title="Remove this day?"
                message={deleting ? `Patients will no longer be able to book ${formatDate(deleting.date)}.` : ""}
                confirmLabel="Remove day"
                tone="danger"
                pending={pendingKey === "delete"}
                error={deleteError}
                onConfirm={remove}
                onClose={() => setDeleting(null)}
            />
        </div>
    );
}
