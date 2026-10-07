import { useState } from "react";
import { api } from "../../lib/api";
import { usePendingAction } from "../../lib/hooks";
import { appointmentTiming } from "../../lib/appointments";
import { useToast } from "../../components/toast";
import { ConfirmDialog, Spinner } from "../../components/ui";

const DIALOGS = {
    decline: {
        title: "Decline this request?",
        message: "The patient will be notified and the seat becomes available again.",
        confirmLabel: "Decline request",
        tone: "danger",
        textLabel: "Reason",
        textPlaceholder: "e.g. I am not available that morning",
        field: "reason",
        done: "Request declined",
    },
    cancel: {
        title: "Cancel this appointment?",
        message: "The patient will be notified by email.",
        confirmLabel: "Cancel appointment",
        tone: "danger",
        textLabel: "Reason",
        textPlaceholder: "Let the patient know why",
        field: "reason",
        done: "Appointment canceled",
    },
    complete: {
        title: "Mark the visit as completed?",
        message: "The patient will be invited to leave a review.",
        confirmLabel: "Mark as completed",
        tone: "success",
        textLabel: "Visit notes",
        textPlaceholder: "Diagnosis, prescriptions or follow-up advice the patient can read later",
        field: "doctorNotes",
        done: "Visit completed",
    },
};

// Buttons and dialogs for the actions a doctor can take on an appointment.
export default function useDoctorAppointmentActions(onChanged) {
    const { notify } = useToast();
    const [dialog, setDialog] = useState(null); // { type, appointment }
    const [error, setError] = useState(null);
    const [pendingKey, run] = usePendingAction();

    const perform = (appointment, action, body = {}) =>
        run(`${action}:${appointment._id}`, async () => {
            setError(null);
            try {
                await api.patch(`/appointments/${appointment._id}/${action}`, body);
                notify(action === "confirm" ? "Appointment confirmed" : DIALOGS[action].done);
                setDialog(null);
                onChanged();
            } catch (err) {
                if (dialog) setError(err.message);
                else notify(err.message, "error");
                if (err.status === 409) onChanged();
            }
        });

    const open = (type, appointment) => {
        setError(null);
        setDialog({ type, appointment });
    };

    const actionsFor = (appointment) => {
        const timing = appointmentTiming(appointment);
        const busy = (action) => pendingKey === `${action}:${appointment._id}`;
        const buttons = [];

        if (appointment.status === "pending") {
            if (!timing.ended) {
                buttons.push(
                    <button
                        key="confirm"
                        type="button"
                        className="btn btn-success btn-sm"
                        disabled={busy("confirm")}
                        onClick={() => perform(appointment, "confirm")}
                    >
                        {busy("confirm") && <Spinner />}
                        Confirm
                    </button>
                );
            }
            buttons.push(
                <button key="decline" type="button" className="btn btn-danger-outline btn-sm" onClick={() => open("decline", appointment)}>
                    Decline
                </button>
            );
        }

        if (appointment.status === "confirmed") {
            if (timing.started) {
                buttons.push(
                    <button key="complete" type="button" className="btn btn-primary btn-sm" onClick={() => open("complete", appointment)}>
                        Mark as completed
                    </button>
                );
            }
            if (!timing.ended) {
                buttons.push(
                    <button key="cancel" type="button" className="btn btn-danger-outline btn-sm" onClick={() => open("cancel", appointment)}>
                        Cancel
                    </button>
                );
            }
        }
        return buttons.length ? buttons : null;
    };

    const config = dialog ? DIALOGS[dialog.type] : null;
    const dialogs = (
        <ConfirmDialog
            open={Boolean(dialog)}
            title={config?.title}
            message={config?.message}
            confirmLabel={config?.confirmLabel}
            tone={config?.tone}
            textLabel={config?.textLabel}
            textPlaceholder={config?.textPlaceholder}
            pending={Boolean(dialog && pendingKey === `${dialog.type}:${dialog.appointment._id}`)}
            error={error}
            onConfirm={(text) => perform(dialog.appointment, dialog.type, { [config.field]: text || undefined })}
            onClose={() => setDialog(null)}
        />
    );

    return { actionsFor, dialogs };
}
