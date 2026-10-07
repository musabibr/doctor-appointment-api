import { useState } from "react";
import { api } from "../../lib/api";
import { useAsync } from "../../lib/hooks";
import { pageTitle } from "../../lib/config";
import { useAuth } from "../../auth/context";
import AppointmentCard from "../../components/AppointmentCard";
import { EmptyState, ErrorState, PageHeader, Pagination, Tabs } from "../../components/ui";
import ApprovalNotice from "./ApprovalNotice";
import useDoctorAppointmentActions from "./useDoctorAppointmentActions";

const VIEWS = {
    requests: { query: { scope: "upcoming", status: "pending" }, empty: "No new requests", hint: "Booking requests from patients appear here." },
    upcoming: { query: { scope: "upcoming", status: "confirmed" }, empty: "No confirmed visits coming up", hint: "Confirmed appointments appear here." },
    history: { query: { scope: "history" }, empty: "No past appointments yet", hint: "Completed, declined and canceled visits appear here." },
};

export default function DoctorAppointmentsPage() {
    const auth = useAuth();
    const [view, setView] = useState("requests");
    const [page, setPage] = useState(1);

    const summary = useAsync(() => api.get("/appointments/summary"), []);
    const list = useAsync(() => api.get("/appointments", { ...VIEWS[view].query, page, limit: 10 }), [view, page]);

    const refresh = () => {
        list.reload();
        summary.reload();
    };
    const { actionsFor, dialogs } = useDoctorAppointmentActions(refresh);

    const changeView = (next) => {
        setView(next);
        setPage(1);
    };

    const stats = summary.data;

    return (
        <div className="container medium page">
            <title>{pageTitle("Appointments")}</title>
            <PageHeader title="Appointments" description="Confirm requests, follow up on visits and keep your schedule tidy." />
            <div className="stack">
                <ApprovalNotice doctor={auth.user} />
                <Tabs
                    value={view}
                    onChange={changeView}
                    tabs={[
                        { id: "requests", label: "Requests", count: stats?.pendingRequests },
                        { id: "upcoming", label: "Confirmed", count: stats ? stats.upcoming - stats.pendingRequests : undefined },
                        { id: "history", label: "History" },
                    ]}
                />

                {list.error ? (
                    <ErrorState error={list.error} onRetry={list.reload} />
                ) : !list.data ? (
                    <div className="skeleton" style={{ height: 160 }} />
                ) : list.data.items.length === 0 ? (
                    <EmptyState icon="🗓" title={VIEWS[view].empty}>
                        {VIEWS[view].hint}
                    </EmptyState>
                ) : (
                    <>
                        {list.data.items.map((appointment) => (
                            <AppointmentCard key={appointment._id} appointment={appointment} viewer="doctor">
                                {actionsFor(appointment)}
                            </AppointmentCard>
                        ))}
                        <Pagination page={list.data.page} pages={list.data.pages} onChange={setPage} />
                    </>
                )}
            </div>
            {dialogs}
        </div>
    );
}
