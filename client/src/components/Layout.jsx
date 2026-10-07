import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useAuth } from "../auth/context";
import { APP_NAME } from "../lib/config";
import { Alert, Avatar } from "./ui";
import { DemoBanner } from "./Demo";
import { Menu, X } from "lucide-react";

const NAV = {
    guest: [{ to: "/doctors", label: "Find a doctor" }],
    patient: [
        { to: "/doctors", label: "Find a doctor" },
        { to: "/appointments", label: "My appointments" },
        { to: "/profile", label: "Profile" },
    ],
    doctor: [
        { to: "/doctor", label: "Dashboard", end: true },
        { to: "/doctor/appointments", label: "Appointments" },
        { to: "/doctor/availability", label: "Availability" },
        { to: "/doctor/reviews", label: "Reviews" },
        { to: "/doctor/profile", label: "Profile" },
    ],
    admin: [
        { to: "/admin", label: "Overview", end: true },
        { to: "/admin/doctors", label: "Doctors" },
        { to: "/admin/patients", label: "Patients" },
        { to: "/admin/appointments", label: "Appointments" },
        { to: "/admin/reviews", label: "Reported reviews" },
    ],
};

const CURRENT_YEAR = new Date().getFullYear();

const PROFILE_PATH = { patient: "/profile", doctor: "/doctor/profile", admin: "/admin" };

export function BrandMark() {
    return (
        <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
                <path d="M9.5 3h5v6.5H21v5h-6.5V21h-5v-6.5H3v-5h6.5z" />
            </svg>
        </span>
    );
}

export default function Layout() {
    const auth = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    // The mobile menu closes by itself on navigation: it is open only for the
    // page it was opened on.
    const [menuOpenedAt, setMenuOpenedAt] = useState(null);
    const menuOpen = menuOpenedAt === location.pathname;

    const links = NAV[auth.isAuthenticated ? auth.role : "guest"] || NAV.guest;

    const signOut = async () => {
        await auth.signOut();
        navigate("/");
    };

    return (
        <>
            <a className="sr-only" href="#main">
                Skip to content
            </a>
            <DemoBanner />
            <header className={`site-header ${menuOpen ? "open" : ""}`}>
                <div className="container">
                    <Link to="/" className="brand">
                        <BrandMark />
                        {APP_NAME}
                    </Link>

                    <button
                        type="button"
                        className="btn btn-ghost menu-toggle"
                        aria-expanded={menuOpen}
                        aria-label="Toggle menu"
                        onClick={() => setMenuOpenedAt(menuOpen ? null : location.pathname)}
                    >
                        {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
                    </button>

                    <nav className="main-nav" aria-label="Main">
                        {links.map((link) => (
                            <NavLink key={link.to} to={link.to} end={link.end} className="nav-link">
                                {link.label}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="header-actions">
                        {auth.isAuthenticated ? (
                            <>
                                <Link to={PROFILE_PATH[auth.role]} className="user-chip" title={auth.user?.email}>
                                    <Avatar src={auth.user?.photo} name={auth.user?.name} size={28} />
                                    <span>{auth.role === "doctor" ? `Dr. ${auth.user?.name}` : auth.user?.name}</span>
                                </Link>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={signOut}>
                                    Log out
                                </button>
                            </>
                        ) : auth.status === "loading" ? null : (
                            <>
                                <Link to="/login" className="btn btn-ghost">
                                    Log in
                                </Link>
                                <Link to="/register" className="btn btn-primary">
                                    Sign up
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {auth.expired && !auth.isAuthenticated && (
                <div className="container" style={{ marginTop: 16 }}>
                    <Alert tone="warning">
                        Your session has ended. Please <Link to="/login">log in</Link> again.
                    </Alert>
                </div>
            )}

            <main id="main">
                <Outlet />
            </main>

            <footer className="site-footer">
                <div className="container row between">
                    <span>
                        © {CURRENT_YEAR} {APP_NAME} · Book trusted doctors in minutes
                    </span>
                    <span className="row">
                        <Link to="/doctors">Find a doctor</Link>
                        <Link to="/register/doctor">Join as a doctor</Link>
                    </span>
                </div>
            </footer>
        </>
    );
}
