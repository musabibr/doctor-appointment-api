import { Link, Navigate, useLocation } from "react-router";
import { HOME_BY_ROLE, useAuth } from "./context";
import { PageLoader } from "../components/ui";

// Renders children only for a signed-in user with the given role.
export default function RequireRole({ role, children }) {
    const auth = useAuth();
    const location = useLocation();

    if (auth.status === "loading") return <PageLoader />;

    if (!auth.isAuthenticated) {
        const next = encodeURIComponent(location.pathname + location.search);
        return <Navigate to={`/login?role=${role}&next=${next}`} replace />;
    }

    if (auth.role !== role) {
        return (
            <div className="container narrow page">
                <title>Not available</title>
                <div className="card empty-state">
                    <h1>This page is for {role} accounts</h1>
                    <p className="muted">You are signed in as a {auth.role}.</p>
                    <Link className="btn btn-primary" to={HOME_BY_ROLE[auth.role] || "/"}>
                        Go to my dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return children;
}
