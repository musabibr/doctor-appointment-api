import { useSearchParams } from "react-router";
import { api } from "../../lib/api";
import { useAsync } from "../../lib/hooks";
import { pageTitle } from "../../lib/config";
import { formatDate, formatMoney, formatTimeRange } from "../../lib/format";
import { EmptyState, ErrorState, PageHeader, Pagination, StatusBadge, Tabs } from "../../components/ui";

const STATUSES = ["all", "pending", "confirmed", "completed", "declined", "canceled"];

export default function AdminAppointmentsPage() {
    const [params, setParams] = useSearchParams();
    const status = params.get("status") || "all";
    const page = Number(params.get("page")) || 1;

    const appointments = useAsync(
        () => api.get("/admin/appointments", { status: status === "all" ? "" : status, page }),
        [status, page]
    );

    return (
        <div className="container page">
            <title>{pageTitle("Appointments")}</title>
            <PageHeader title="Appointments" description="Every booking on the platform, newest first." />
            <Tabs
                value={status}
                onChange={(id) => setParams(id === "all" ? {} : { status: id })}
                tabs={STATUSES.map((s) => ({ id: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
                label="Status"
            />

            {appointments.error ? (
                <ErrorState error={appointments.error} onRetry={appointments.reload} />
            ) : !appointments.data ? (
                <div className="skeleton" style={{ height: 240 }} />
            ) : appointments.data.items.length === 0 ? (
                <EmptyState icon="🗓" title="No appointments" />
            ) : (
                <>
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>When</th>
                                    <th>Patient</th>
                                    <th>Doctor</th>
                                    <th>Price</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {appointments.data.items.map((a) => (
                                    <tr key={a._id}>
                                        <td className="nowrap">
                                            <div className="strong">{formatDate(a.appointmentDate)}</div>
                                            <div className="muted tiny">{formatTimeRange(a.appointmentHour, a.endHour)}</div>
                                        </td>
                                        <td>{a.patient ? a.patient.name : <span className="muted">Deleted patient</span>}</td>
                                        <td>
                                            {a.doctor ? (
                                                <>
                                                    Dr. {a.doctor.name}
                                                    <div className="muted tiny">{a.doctor.specialty}</div>
                                                </>
                                            ) : (
                                                <span className="muted">Deleted doctor</span>
                                            )}
                                        </td>
                                        <td className="nowrap">{a.price ? formatMoney(a.price) : "—"}</td>
                                        <td>
                                            <StatusBadge status={a.status} />
                                            {a.canceledBy && <div className="muted tiny">by {a.canceledBy}</div>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination
                        page={appointments.data.page}
                        pages={appointments.data.pages}
                        onChange={(p) => setParams({ ...(status !== "all" ? { status } : {}), page: String(p) })}
                    />
                </>
            )}
        </div>
    );
}
