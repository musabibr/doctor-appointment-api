import { useState } from "react";
import { api } from "../../lib/api";
import { useAsync, usePendingAction } from "../../lib/hooks";
import { pageTitle } from "../../lib/config";
import { formatDate } from "../../lib/format";
import { useToast } from "../../components/toast";
import { Avatar, ConfirmDialog, EmptyState, ErrorState, PageHeader, Pagination } from "../../components/ui";

export default function AdminPatientsPage() {
    const { notify } = useToast();
    const [q, setQ] = useState("");
    const [page, setPage] = useState(1);
    const [deleting, setDeleting] = useState(null);
    const [error, setError] = useState(null);
    const [pendingKey, run] = usePendingAction();
    const patients = useAsync(() => api.get("/admin/patients", { q, page }), [q, page]);

    const remove = () =>
        run("delete", async () => {
            setError(null);
            try {
                await api.delete(`/admin/patients/${deleting._id}`);
                notify("Patient deleted");
                setDeleting(null);
                patients.reload();
            } catch (err) {
                setError(err.message);
            }
        });

    return (
        <div className="container page">
            <title>{pageTitle("Patients")}</title>
            <PageHeader
                title="Patients"
                description={patients.data ? `${patients.data.total} registered` : "Registered patient accounts"}
                actions={
                    <form
                        className="row-sm"
                        role="search"
                        onSubmit={(event) => {
                            event.preventDefault();
                            setPage(1);
                            setQ(String(new FormData(event.currentTarget).get("q") || "").trim());
                        }}
                    >
                        <input name="q" className="control" placeholder="Name or email" style={{ width: 240 }} />
                        <button type="submit" className="btn btn-secondary">
                            Search
                        </button>
                    </form>
                }
            />

            {patients.error ? (
                <ErrorState error={patients.error} onRetry={patients.reload} />
            ) : !patients.data ? (
                <div className="skeleton" style={{ height: 240 }} />
            ) : patients.data.items.length === 0 ? (
                <EmptyState icon="👤" title="No patients found" />
            ) : (
                <>
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Patient</th>
                                    <th>Gender</th>
                                    <th>Phone</th>
                                    <th>Location</th>
                                    <th>Joined</th>
                                    <th aria-label="Actions" />
                                </tr>
                            </thead>
                            <tbody>
                                {patients.data.items.map((patient) => (
                                    <tr key={patient._id}>
                                        <td>
                                            <div className="row-sm" style={{ flexWrap: "nowrap" }}>
                                                <Avatar src={patient.photo} name={patient.name} size={34} />
                                                <div>
                                                    <div className="strong">{patient.name}</div>
                                                    <div className="muted tiny">{patient.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{patient.gender || "—"}</td>
                                        <td className="nowrap">{patient.phoneNumber || "—"}</td>
                                        <td>{[patient.location?.city, patient.location?.state].filter(Boolean).join(", ") || "—"}</td>
                                        <td className="nowrap">{formatDate(patient.createdAt.slice(0, 10))}</td>
                                        <td>
                                            <button
                                                type="button"
                                                className="btn btn-danger-outline btn-sm"
                                                onClick={() => {
                                                    setError(null);
                                                    setDeleting(patient);
                                                }}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination page={patients.data.page} pages={patients.data.pages} onChange={setPage} />
                </>
            )}

            <ConfirmDialog
                open={Boolean(deleting)}
                title={`Delete ${deleting?.name}?`}
                message="Their upcoming appointments are canceled (doctors are notified) and their reviews are removed. This cannot be undone."
                confirmLabel="Delete permanently"
                tone="danger"
                pending={pendingKey === "delete"}
                error={error}
                onConfirm={remove}
                onClose={() => setDeleting(null)}
            />
        </div>
    );
}
