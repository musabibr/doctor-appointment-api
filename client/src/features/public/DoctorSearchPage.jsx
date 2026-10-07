import { useSearchParams } from "react-router";
import { api } from "../../lib/api";
import { useAsync } from "../../lib/hooks";
import { pageTitle } from "../../lib/config";
import { localTodayKey, plural } from "../../lib/format";
import DoctorCard, { DoctorCardSkeleton } from "../../components/DoctorCard";
import { EmptyState, ErrorState, Pagination } from "../../components/ui";

const FILTER_KEYS = ["q", "specialty", "city", "date"];

const SORTS = [
    { value: "rating", label: "Best rated" },
    { value: "price_asc", label: "Price: low to high" },
    { value: "price_desc", label: "Price: high to low" },
    { value: "name", label: "Name (A–Z)" },
];

export default function DoctorSearchPage() {
    const [params, setParams] = useSearchParams();
    const query = Object.fromEntries(params.entries());
    const queryKey = params.toString();

    const specialties = useAsync(() => api.get("/doctors/specialties"), []);
    const results = useAsync(() => api.get("/doctors", { ...query, limit: 10 }), [queryKey]);

    const update = (changes) => {
        const next = new URLSearchParams(params);
        for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value);
            else next.delete(key);
        }
        if (!("page" in changes)) next.delete("page");
        setParams(next);
    };

    const applyFilters = (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        update(Object.fromEntries(FILTER_KEYS.map((key) => [key, String(form.get(key) || "").trim()])));
    };

    const hasFilters = FILTER_KEYS.some((key) => params.get(key));
    const data = results.data;

    return (
        <div className="container page">
            <title>{pageTitle("Find a doctor")}</title>
            <div className="page-header">
                <div>
                    <h1>Find a doctor</h1>
                    <p className="muted">Filter by specialty, city or a day you are free.</p>
                </div>
            </div>

            <div className="search-layout">
                <aside className="card filters">
                    {/* key resets the uncontrolled inputs when the URL changes */}
                    <form className="form" onSubmit={applyFilters} key={queryKey} role="search">
                        <div className="field">
                            <label className="field-label" htmlFor="f-q">
                                Doctor name
                            </label>
                            <input id="f-q" name="q" className="control" defaultValue={query.q || ""} placeholder="Search by name" />
                        </div>
                        <div className="field">
                            <label className="field-label" htmlFor="f-specialty">
                                Specialty
                            </label>
                            <select id="f-specialty" name="specialty" className="control" defaultValue={query.specialty || ""}>
                                <option value="">Any specialty</option>
                                {(specialties.data || []).map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                                {query.specialty && !(specialties.data || []).includes(query.specialty) && (
                                    <option value={query.specialty}>{query.specialty}</option>
                                )}
                            </select>
                        </div>
                        <div className="field">
                            <label className="field-label" htmlFor="f-city">
                                City
                            </label>
                            <input id="f-city" name="city" className="control" defaultValue={query.city || ""} placeholder="Any city" />
                        </div>
                        <div className="field">
                            <label className="field-label" htmlFor="f-date">
                                Available on
                            </label>
                            <input
                                id="f-date"
                                name="date"
                                type="date"
                                className="control"
                                min={localTodayKey()}
                                defaultValue={query.date || ""}
                            />
                        </div>
                        <button type="submit" className="btn btn-primary">
                            Apply filters
                        </button>
                        {hasFilters && (
                            <button type="button" className="btn btn-ghost" onClick={() => setParams({})}>
                                Clear all
                            </button>
                        )}
                    </form>
                </aside>

                <section className="stack" aria-live="polite">
                    <div className="row between">
                        <span className="muted">
                            {data ? `${plural(data.total, "doctor")} found` : "Searching…"}
                        </span>
                        <label className="row-sm small">
                            <span className="muted">Sort by</span>
                            <select
                                className="control"
                                style={{ width: "auto" }}
                                value={query.sort || "rating"}
                                onChange={(event) => update({ sort: event.target.value === "rating" ? "" : event.target.value })}
                            >
                                {SORTS.map((sort) => (
                                    <option key={sort.value} value={sort.value}>
                                        {sort.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    {results.error ? (
                        <ErrorState error={results.error} onRetry={results.reload} />
                    ) : results.loading && !data ? (
                        [1, 2, 3, 4].map((n) => <DoctorCardSkeleton key={n} />)
                    ) : data.items.length === 0 ? (
                        <EmptyState
                            icon="🔍"
                            title="No doctors match your search"
                            action={
                                hasFilters && (
                                    <button type="button" className="btn btn-secondary" onClick={() => setParams({})}>
                                        Clear filters
                                    </button>
                                )
                            }
                        >
                            Try another specialty, city or date.
                        </EmptyState>
                    ) : (
                        <>
                            {data.items.map((doctor) => (
                                <DoctorCard key={doctor._id} doctor={doctor} />
                            ))}
                            <Pagination page={data.page} pages={data.pages} onChange={(page) => update({ page: String(page) })} />
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}
