import { localTodayKey, toDateKey } from "./format";

const nowKey = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    return `${localTodayKey()} ${hh}:${mm}`;
};

// Client-side view of where an appointment is in time. The server makes the
// final decision (in the clinic's time zone); this only drives what the UI offers.
export const appointmentTiming = (appointment) => {
    const day = toDateKey(appointment.appointmentDate);
    const current = nowKey();
    const started = `${day} ${appointment.appointmentHour}` <= current;
    const ended = `${day} ${appointment.endHour}` <= current;
    const active = appointment.status === "pending" || appointment.status === "confirmed";
    return { started, ended, active, expired: active && ended };
};
