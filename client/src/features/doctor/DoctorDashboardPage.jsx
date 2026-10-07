import { Link } from "react-router";
import { api } from "../../lib/api";
import { useAsync } from "../../lib/hooks";
import { pageTitle } from "../../lib/config";
import { localTodayKey } from "../../lib/format";
import { useAuth } from "../../auth/context";
import AppointmentCard from "../../components/AppointmentCard";
import { EmptyState, ErrorState, PageHeader, PageLoader, RatingText, StatCard } from "../../components/ui";
import ApprovalNotice from "./ApprovalNotice";
import useDoctorAppointmentActions from "./useDoctorAppointmentActions";

function Checklist({ doctor }) {
    const upcomingDays = doctor.availability.filter((day) => day.date >= localTodayKey());
    const items = [
        ["Verify your email", doctor.isVerified],
        ["Get approved by an admin", doctor.approvalStatus === "approved"],
        ["Add a profile photo", Boolean(doctor.photo)],
        ["Add your clinic details", Boolean(doctor.clinic)],
        ["Set your consultation price", doctor.price > 0],
        ["Publish your availability", upcomingDays.length > 0],
    ];
    const done = items.filter(([, ok]) => ok).length;
    if (done === items.length) return null;

    return (
        <section className="card stack">
            <div className="row between">
                <h2>Get ready for patients</h2>
                <span className="muted small">
                    {done} of {items.length} done
                </span>
            </div>
            <ul className="checklist">
                {items.map(([label, ok]) => (
                    <li key={label}>
                        <span className={`check ${ok ? "done" : ""}`}>✓</span>
                        <span className={ok ? "muted" : ""}>{label}</span>
                    </li>
                ))}
            </ul>
            <div className="row">
                <Link to="/doctor/profile" className="btn btn-secondary btn-sm">
                    Edit profile & clinic
                </Link>
                {doctor.approvalStatus === "approved" && (
                    <Link to="/doctor/availability" className="btn btn-primary btn-sm">
                        Manage availability
                    </Link>
                )}
            </div>
        </section>
    );
}

export default function DoctorDashboardPage() {
    const auth = useAuth();
    const profile = useAsync(() => api.get("/doctors/me"), []);
    const summary = useAsync(() => api.get("/appointments/summary"), []);
    const requests = useAsync(() => api.get("/appointments", { scope: "upcoming", status: "pending", limit: 5 }), []);
    const today = useAsync(() => api.get("/appointments", { date: localTodayKey(), limit: 20 }), []);

    const refresh = () => {
        summary.reload();
        requests.reload();
        today.reload();
    };
    const { actionsFor, dialogs } = useDoctorAppointmentActions(refresh);

    if (profile.error) return <div className="container page"><ErrorState error={profile.error} onRetry={profile.reload} /></div>;
    if (!profile.data) return <PageLoader />;

    const doctor = profile.data;
    const stats = summary.data;
    const approved = doctor.approvalStatus === "approved";
    const todayItems = (today.data?.items || []).filter((a) => ["confirmed", "completed", "pending"].includes(a.status));

    return (
        <div className="container page stack-lg">
            <title>{pageTitle("Doctor dashboard")}</title>
            <PageHeader
                title={`Welcome, Dr. ${auth.user?.name?.split(" ")[0] || doctor.name}`}
                description="Here is what is happening with your practice."
                actions={
                    approved && (
                        <Link to={`/doctors/${doctor._id}`} className="btn btn-secondary">
                            View public profile
                        </Link>
                    )
                }
            />

            <ApprovalNotice doctor={doctor} />

            <div className="stat-grid">
                <StatCard as={Link} to="/doctor/appointments" label="New requests" value={stats?.pendingRequests ?? "–"} hint="Waiting for your answer" />
                <StatCard label="Today" value={stats?.today ?? "–"} hint="Visits scheduled today" />
                <StatCard label="Upcoming" value={stats?.upcoming ?? "–"} hint="Pending and confirmed" />
                <StatCard label="Completed visits" value={stats?.completed ?? "–"} />
                <StatCard
                    as={Link}
                    to="/doctor/reviews"
                    label="Rating"
                    value={doctor.ratingCount ? doctor.ratingAverage.toFixed(1) : "–"}
                    hint={<RatingText average={doctor.ratingAverage} count={doctor.ratingCount} />}
                />
            </div>

            <Checklist doctor={doctor} />

            {approved && (
                <div className="grid-2">
                    <section className="stack">
                        <div className="row between">
                            <h2>New requests</h2>
                            <Link to="/doctor/appointments" className="small">
                                See all
                            </Link>
                        </div>
                        {requests.data?.items.length === 0 && (
                            <EmptyState icon="✓" title="You are all caught up">
                                New booking requests will appear here.
                            </EmptyState>
                        )}
                        {(requests.data?.items || []).map((appointment) => (
                            <AppointmentCard key={appointment._id} appointment={appointment} viewer="doctor">
                                {actionsFor(appointment)}
                            </AppointmentCard>
                        ))}
                    </section>

                    <section className="stack">
                        <div className="row between">
                            <h2>Today’s schedule</h2>
                            <Link to="/doctor/availability" className="small">
                                Availability
                            </Link>
                        </div>
                        {today.data && todayItems.length === 0 && (
                            <EmptyState icon="☕" title="No visits today">
                                Confirmed visits for today will be listed here.
                            </EmptyState>
                        )}
                        {todayItems.map((appointment) => (
                            <AppointmentCard key={appointment._id} appointment={appointment} viewer="doctor">
                                {actionsFor(appointment)}
                            </AppointmentCard>
                        ))}
                    </section>
                </div>
            )}

            {dialogs}
        </div>
    );
}
