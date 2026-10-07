import { Link, useNavigate } from "react-router";
import { api } from "../../lib/api";
import { useAsync } from "../../lib/hooks";
import { pageTitle } from "../../lib/config";
import { formatDayLabel } from "../../lib/format";
import { useAuth } from "../../auth/context";
import DoctorCard, { DoctorCardSkeleton } from "../../components/DoctorCard";
import { Avatar, RatingText } from "../../components/ui";

export default function HomePage() {
    const navigate = useNavigate();
    const auth = useAuth();
    const specialties = useAsync(() => api.get("/doctors/specialties"), []);
    const topDoctors = useAsync(() => api.get("/doctors", { sort: "rating", limit: 6 }), []);

    const search = (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const params = new URLSearchParams();
        for (const key of ["q", "specialty", "city"]) {
            const value = String(form.get(key) || "").trim();
            if (value) params.set(key, value);
        }
        navigate(`/doctors?${params}`);
    };

    const doctors = topDoctors.data?.items || [];

    return (
        <>
            <title>{pageTitle("Book a doctor online")}</title>

            <section className="hero">
                <div className="container hero-grid">
                    <div>
                        <span className="eyebrow">✓ Verified doctors · real-time availability</span>
                        <h1>
                            Book the right doctor, <em>without the waiting room.</em>
                        </h1>
                        <p className="lead">
                            Compare specialists, read reviews from real patients and reserve a time that suits you. Your
                            doctor confirms it, and you get an email right away.
                        </p>

                        <form className="search-panel" onSubmit={search} role="search">
                            <div className="field">
                                <label className="field-label" htmlFor="home-q">
                                    Doctor name
                                </label>
                                <input id="home-q" name="q" className="control" placeholder="e.g. Amina" />
                            </div>
                            <div className="field">
                                <label className="field-label" htmlFor="home-specialty">
                                    Specialty
                                </label>
                                <select id="home-specialty" name="specialty" className="control" defaultValue="">
                                    <option value="">Any specialty</option>
                                    {(specialties.data || []).map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="field">
                                <label className="field-label" htmlFor="home-city">
                                    City
                                </label>
                                <input id="home-city" name="city" className="control" placeholder="Any city" />
                            </div>
                            <button type="submit" className="btn btn-primary btn-lg">
                                Search
                            </button>
                        </form>
                    </div>

                    <div className="hero-visual">
                        <div className="hero-card stack">
                            <div className="row between">
                                <h3>Top rated doctors</h3>
                                <Link to="/doctors" className="small">
                                    See all
                                </Link>
                            </div>
                            {doctors.slice(0, 3).map((doctor) => (
                                <Link key={doctor._id} to={`/doctors/${doctor._id}`} className="row" style={{ color: "inherit" }}>
                                    <Avatar src={doctor.photo} name={doctor.name} size={44} />
                                    <div className="grow">
                                        <div className="strong">Dr. {doctor.name}</div>
                                        <div className="muted small">{doctor.specialty}</div>
                                    </div>
                                    <RatingText average={doctor.ratingAverage} count={doctor.ratingCount} />
                                </Link>
                            ))}
                            {!topDoctors.loading && doctors.length === 0 && (
                                <p className="muted small">Doctors will appear here once they are approved.</p>
                            )}
                            <div className="hero-stat-row">
                                <div className="hero-stat">
                                    <strong>{topDoctors.data?.total ?? "–"}</strong>
                                    <span className="muted tiny">Verified doctors</span>
                                </div>
                                <div className="hero-stat">
                                    <strong>{specialties.data?.length ?? "–"}</strong>
                                    <span className="muted tiny">Specialties</span>
                                </div>
                                <div className="hero-stat">
                                    <strong>
                                        {doctors.find((d) => d.nextAvailableDate)
                                            ? formatDayLabel(
                                                  doctors
                                                      .map((d) => d.nextAvailableDate)
                                                      .filter(Boolean)
                                                      .sort()[0]
                                              )
                                            : "–"}
                                    </strong>
                                    <span className="muted tiny">Next opening</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="container page stack-lg">
                {(specialties.data || []).length > 0 && (
                    <div className="stack">
                        <h2>Browse by specialty</h2>
                        <div className="row">
                            {specialties.data.map((s) => (
                                <Link key={s} to={`/doctors?specialty=${encodeURIComponent(s)}`} className="btn btn-secondary btn-sm">
                                    {s}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                <div className="stack">
                    <h2>How it works</h2>
                    <div className="steps">
                        {[
                            ["Find your doctor", "Search by specialty, city or name and compare prices, reviews and clinics."],
                            ["Pick a time", "See the real open slots and request the one that fits your day."],
                            ["Get confirmed", "Your doctor confirms the visit and you receive an email. Cancel anytime before it starts."],
                        ].map(([title, text], i) => (
                            <div key={title} className="card">
                                <div className="step-number">{i + 1}</div>
                                <h3>{title}</h3>
                                <p className="muted small mt-1">{text}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="stack">
                    <div className="row between">
                        <h2>Top-rated doctors</h2>
                        <Link to="/doctors">Browse all doctors →</Link>
                    </div>
                    <div className="stack">
                        {topDoctors.loading && !topDoctors.data
                            ? [1, 2, 3].map((n) => <DoctorCardSkeleton key={n} />)
                            : doctors.map((doctor) => <DoctorCard key={doctor._id} doctor={doctor} />)}
                    </div>
                </div>

                {auth.role !== "doctor" && (
                    <div className="cta-band">
                        <div>
                            <h2>Are you a doctor?</h2>
                            <p>Publish your availability, accept bookings and build your reputation with patient reviews.</p>
                        </div>
                        <Link to="/register/doctor" className="btn btn-lg">
                            Join as a doctor
                        </Link>
                    </div>
                )}
            </section>
        </>
    );
}
