import { Link, useSearchParams } from "react-router";
import { api } from "../../lib/api";
import { useAsync } from "../../lib/hooks";
import { pageTitle } from "../../lib/config";
import { formatDate } from "../../lib/format";
import { Avatar, EmptyState, ErrorState, PageHeader, Pagination, StatusBadge, Tabs } from "../../components/ui";

const STATUSES = [
    { id: "pending", label: "Pending" },
    { id: "approved", label: "Approved" },
    { id: "rejected", label: "Rejected" },
    { id: "all", label: "All" },
];

export default function AdminDoctorsPage() {
    const [params, setParams] = useSearchParams();
    const status = params.get("status") || "pending";
    const q = params.get("q") || "";
    const page = Number(params.get("page")) || 1;

    const doctors = useAsync(
        () => api.get("/admin/doctors", { status: status === "all" ? "" : status, q, page }),
        [status, q, page]
    );

    const set = (changes) => {
        const next = new URLSearchParams(params);
        for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value);
            else next.delete(key);
        }
        if (!("page" in changes)) next.delete("page");
        setParams(next);
    };

    return (
        <div className="container page">
            <title>{pageTitle("Doctors")}</title>
            <PageHeader title="Doctors" description="Review applications and manage doctor accounts." />

            <div className="row between">
                <Tabs value={status} onChange={(id) => set({ status: id })} tabs={STATUSES} label="Approval status" />
                <form
                    className="row-sm"
                    role="search"
                    onSubmit={(event) => {
                        event.preventDefault();
                        set({ q: String(new FormData(event.currentTarget).get("q") || "").trim() });
                    }}
                >
                    <input name="q" className="control" placeholder="Name, email or specialty" defaultValue={q} key={q} style={{ width: 240 }} />
                    <button type="submit" className="btn btn-secondary">
                        Search
                    </button>
                </form>
            </div>

            {doctors.error ? (
                <ErrorState error={doctors.error} onRetry={doctors.reload} />
            ) : !doctors.data ? (
                <div className="skeleton" style={{ height: 240 }} />
            ) : doctors.data.items.length === 0 ? (
                <EmptyState icon="✓" title={status === "pending" ? "No applications waiting" : "No doctors found"} />
            ) : (
                <>
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Doctor</th>
                                    <th>Specialty</th>
                                    <th>Phone</th>
                                    <th>Email verified</th>
                                    <th>Registered</th>
                                    <th>Status</th>
                                    <th aria-label="Actions" />
                                </tr>
                            </thead>
                            <tbody>
                                {doctors.data.items.map((doctor) => (
                                    <tr key={doctor._id}>
                                        <td>
                                            <div className="row-sm" style={{ flexWrap: "nowrap" }}>
                                                <Avatar src={doctor.photo} name={doctor.name} size={34} />
                                                <div>
                                                    <div className="strong">Dr. {doctor.name}</div>
                                                    <div className="muted tiny">{doctor.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{doctor.specialty}</td>
                                        <td className="nowrap">{doctor.phoneNumber}</td>
                                        <td>{doctor.isVerified ? "Yes" : <span className="muted">Not yet</span>}</td>
                                        <td className="nowrap">{formatDate(doctor.createdAt.slice(0, 10))}</td>
                                        <td>
                                            <StatusBadge status={doctor.approvalStatus} />
                                        </td>
                                        <td>
                                            <Link to={`/admin/doctors/${doctor._id}`} className="btn btn-secondary btn-sm">
                                                {doctor.approvalStatus === "pending" ? "Review" : "Open"}
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination page={doctors.data.page} pages={doctors.data.pages} onChange={(p) => set({ page: String(p) })} />
                </>
            )}
        </div>
    );
}
