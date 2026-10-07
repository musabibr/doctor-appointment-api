import { Link } from "react-router";
import { clinicLabel, formatDate, formatMoney, formatTime, formatTimeRange, toDateKey } from "../lib/format";
import { appointmentTiming } from "../lib/appointments";
import { Avatar, StatusBadge } from "./ui";
import { CalendarDays, Clock, CreditCard } from "lucide-react";

const LABELS = {
    patient: { pending: "Awaiting confirmation" },
    doctor: { pending: "New request" },
};

function DateBlock({ appointment }) {
    const key = toDateKey(appointment.appointmentDate);
    return (
        <div className="appointment-when" aria-hidden="true">
            <div className="month">{formatDate(key, { month: "short" })}</div>
            <div className="day">{formatDate(key, { day: "numeric" })}</div>
            <div className="time">{formatTime(appointment.appointmentHour)}</div>
        </div>
    );
}

function Counterpart({ appointment, viewer }) {
    if (viewer === "patient") {
        const doctor = appointment.doctor;
        if (!doctor) return <strong>Doctor no longer available</strong>;
        return (
            <div className="row-sm">
                <Avatar src={doctor.photo} name={doctor.name} size={36} />
                <div>
                    <Link to={`/doctors/${doctor._id}`} className="strong">
                        Dr. {doctor.name}
                    </Link>
                    <div className="muted small">
                        {doctor.specialty}
                        {doctor.clinic && ` · ${clinicLabel(doctor.clinic)}`}
                    </div>
                </div>
            </div>
        );
    }
    const patient = appointment.patient;
    if (!patient) return <strong>Former patient</strong>;
    return (
        <div className="row-sm">
            <Avatar src={patient.photo} name={patient.name} size={36} />
            <div>
                <strong>{patient.name}</strong>
                <div className="muted small wrap-anywhere">
                    {[patient.gender, patient.phoneNumber, patient.email].filter(Boolean).join(" · ")}
                </div>
            </div>
        </div>
    );
}

export default function AppointmentCard({ appointment, viewer, children }) {
    const timing = appointmentTiming(appointment);
    const label =
        timing.expired && appointment.status === "pending"
            ? "Not confirmed in time"
            : LABELS[viewer]?.[appointment.status];

    const canceledBy =
        appointment.canceledBy === viewer ? "you" : appointment.canceledBy === "admin" ? "the platform" : `the ${appointment.canceledBy}`;

    return (
        <article className="card appointment-card">
            <div className="appointment-top">
                <DateBlock appointment={appointment} />
                <div className="stack-sm grow">
                    <div className="row between">
                        <Counterpart appointment={appointment} viewer={viewer} />
                        <StatusBadge status={timing.expired && appointment.status === "pending" ? "canceled" : appointment.status} label={label} />
                    </div>
                    <div className="appointment-meta">
                        <span><CalendarDays aria-hidden="true" />{formatDate(appointment.appointmentDate)}</span>
                        <span><Clock aria-hidden="true" />{formatTimeRange(appointment.appointmentHour, appointment.endHour)}</span>
                        {appointment.price > 0 && <span><CreditCard aria-hidden="true" />{formatMoney(appointment.price)}</span>}
                    </div>
                </div>
            </div>

            {appointment.reasonForVisit && (
                <div className="note">
                    <strong>Reason for visit:</strong> {appointment.reasonForVisit}
                </div>
            )}
            {appointment.status === "declined" && appointment.declineReason && (
                <div className="note">
                    <strong>Declined:</strong> {appointment.declineReason}
                </div>
            )}
            {appointment.status === "canceled" && (
                <div className="note">
                    <strong>Canceled by {canceledBy}</strong>
                    {appointment.cancelReason && `: ${appointment.cancelReason}`}
                </div>
            )}
            {appointment.doctorNotes && (
                <div className="note">
                    <strong>Doctor’s notes:</strong> {appointment.doctorNotes}
                </div>
            )}

            {children && <div className="appointment-actions">{children}</div>}
        </article>
    );
}
