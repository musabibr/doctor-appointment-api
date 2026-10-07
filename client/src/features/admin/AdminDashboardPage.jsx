import { Link } from "react-router";
import { api } from "../../lib/api";
import { useAsync } from "../../lib/hooks";
import { pageTitle } from "../../lib/config";
import { Alert, ErrorState, PageHeader, PageLoader, StatCard } from "../../components/ui";

export default function AdminDashboardPage() {
    const stats = useAsync(() => api.get("/admin/stats"), []);

    if (stats.error) return <div className="container page"><ErrorState error={stats.error} onRetry={stats.reload} /></div>;
    if (!stats.data) return <PageLoader />;

    const { patients, doctors, appointments, reportedReviews } = stats.data;

    return (
        <div className="container page stack-lg">
            <title>{pageTitle("Admin overview")}</title>
            <PageHeader title="Admin overview" description="Keep the platform trustworthy: vet doctors and moderate reviews." />

            {(doctors.pending > 0 || reportedReviews > 0) && (
                <div className="stack-sm">
                    {doctors.pending > 0 && (
                        <Alert tone="warning">
                            <strong>{doctors.pending} doctor{doctors.pending > 1 ? "s are" : " is"} waiting for approval.</strong>{" "}
                            <Link to="/admin/doctors?status=pending">Review applications →</Link>
                        </Alert>
                    )}
                    {reportedReviews > 0 && (
                        <Alert tone="info">
                            <strong>{reportedReviews} reported review{reportedReviews > 1 ? "s" : ""}</strong> need a decision.{" "}
                            <Link to="/admin/reviews">Moderate reviews →</Link>
                        </Alert>
                    )}
                </div>
            )}

            <section className="stack">
                <h2>People</h2>
                <div className="stat-grid">
                    <StatCard as={Link} to="/admin/patients" label="Patients" value={patients} />
                    <StatCard as={Link} to="/admin/doctors?status=approved" label="Approved doctors" value={doctors.approved} />
                    <StatCard as={Link} to="/admin/doctors?status=pending" label="Pending approval" value={doctors.pending} />
                    <StatCard as={Link} to="/admin/doctors?status=rejected" label="Rejected" value={doctors.rejected} />
                </div>
            </section>

            <section className="stack">
                <h2>Appointments</h2>
                <div className="stat-grid">
                    <StatCard as={Link} to="/admin/appointments" label="Total" value={appointments.total} />
                    {["pending", "confirmed", "completed", "declined", "canceled"].map((status) => (
                        <StatCard
                            key={status}
                            as={Link}
                            to={`/admin/appointments?status=${status}`}
                            label={status.charAt(0).toUpperCase() + status.slice(1)}
                            value={appointments[status]}
                        />
                    ))}
                </div>
            </section>
        </div>
    );
}
