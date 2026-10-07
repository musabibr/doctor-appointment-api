import { Link } from "react-router";
import { pageTitle } from "../../lib/config";

export default function NotFoundPage() {
    return (
        <div className="container narrow page">
            <title>{pageTitle("Page not found")}</title>
            <div className="card empty-state">
                <div className="icon">?</div>
                <h1>Page not found</h1>
                <p className="muted">The page you are looking for does not exist or has moved.</p>
                <Link to="/" className="btn btn-primary">
                    Back to home
                </Link>
            </div>
        </div>
    );
}
