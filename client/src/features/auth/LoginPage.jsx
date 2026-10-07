import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { api } from "../../lib/api";
import { formError, useFormAction } from "../../lib/hooks";
import { HOME_BY_ROLE, useAuth } from "../../auth/context";
import { Alert, Field, SubmitButton } from "../../components/ui";
import { AuthShell, PasswordInput, RoleSwitch } from "./AuthShell";

const ROLES = [
    ["patient", "Patient"],
    ["doctor", "Doctor"],
    ["admin", "Admin"],
];

// Only follow relative in-app redirects.
const safeNext = (next) => (next && next.startsWith("/") && !next.startsWith("//") ? next : null);

export default function LoginPage() {
    const auth = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const [role, setRole] = useState(ROLES.some(([r]) => r === params.get("role")) ? params.get("role") : "patient");
    const next = safeNext(params.get("next"));

    const [state, onSubmit, pending] = useFormAction(async (previous, formData) => {
        const email = String(formData.get("email") || "").trim();
        try {
            const session = await api.post("/auth/login", { role, email, password: formData.get("password") });
            auth.signIn(session);
            navigate(next || HOME_BY_ROLE[session.role], { replace: true });
            return {};
        } catch (error) {
            if (error.code === "EMAIL_NOT_VERIFIED") {
                navigate(`/verify-email?email=${encodeURIComponent(email)}`, { state: { message: error.message } });
                return {};
            }
            return formError(error);
        }
    });

    if (auth.isAuthenticated && !pending) return <Navigate to={next || HOME_BY_ROLE[auth.role]} replace />;

    return (
        <AuthShell
            title="Welcome back"
            subtitle="Log in to manage your appointments."
            footer={
                role === "doctor" ? (
                    <>
                        New doctor? <Link to="/register/doctor">Apply to join</Link>
                    </>
                ) : (
                    <>
                        New here? <Link to={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Create a patient account</Link>
                    </>
                )
            }
        >
            <RoleSwitch value={role} onChange={setRole} roles={ROLES} />
            <form className="form" onSubmit={onSubmit} noValidate>
                <Field label="Email" error={state.fieldErrors?.email}>
                    {(props) => <input {...props} name="email" type="email" className="control" autoComplete="email" required />}
                </Field>
                <Field label="Password" error={state.fieldErrors?.password}>
                    {(props) => <PasswordInput {...props} required />}
                </Field>
                {state.error && state.code !== "VALIDATION_ERROR" && <Alert tone="danger">{state.error}</Alert>}
                <SubmitButton pending={pending} className="btn btn-primary btn-block btn-lg">
                    Log in as {role}
                </SubmitButton>
                {role !== "admin" && (
                    <Link to={`/forgot-password?role=${role}`} className="small center">
                        Forgot your password?
                    </Link>
                )}
            </form>
        </AuthShell>
    );
}
