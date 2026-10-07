import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { api } from "../../lib/api";
import { formError, useFormAction } from "../../lib/hooks";
import { HOME_BY_ROLE, useAuth } from "../../auth/context";
import { useToast } from "../../components/toast";
import { Alert, Field, GenderField, SubmitButton } from "../../components/ui";
import { AuthShell, PasswordInput } from "./AuthShell";

const text = (formData, key) => String(formData.get(key) || "").trim();

export default function RegisterPatientPage() {
    const auth = useAuth();
    const navigate = useNavigate();
    const { notify } = useToast();
    const [params] = useSearchParams();
    const next = params.get("next")?.startsWith("/") ? params.get("next") : null;

    const [state, onSubmit, pending] = useFormAction(async (previous, formData) => {
        const city = text(formData, "city");
        const stateName = text(formData, "state");
        try {
            const session = await api.post("/patients/register", {
                name: text(formData, "name"),
                email: text(formData, "email"),
                password: formData.get("password"),
                gender: formData.get("gender") || "",
                phoneNumber: text(formData, "phoneNumber") || undefined,
                location: city || stateName ? { city: city || undefined, state: stateName || undefined } : undefined,
            });
            auth.signIn(session);
            notify(`Welcome, ${session.user.name.split(" ")[0]}!`);
            navigate(next || "/doctors", { replace: true });
            return {};
        } catch (error) {
            return formError(error);
        }
    });

    if (auth.isAuthenticated && !pending) return <Navigate to={HOME_BY_ROLE[auth.role]} replace />;

    const errors = state.fieldErrors || {};

    return (
        <AuthShell
            title="Create your account"
            subtitle="Book appointments with verified doctors in a few clicks."
            width="medium"
            footer={
                <>
                    Already have an account? <Link to="/login">Log in</Link> · Are you a doctor?{" "}
                    <Link to="/register/doctor">Join as a doctor</Link>
                </>
            }
        >
            <form className="form" onSubmit={onSubmit} noValidate>
                <div className="form-grid">
                    <Field label="Full name" error={errors.name} className="span-2">
                        {(props) => <input {...props} name="name" className="control" autoComplete="name" required />}
                    </Field>
                    <Field label="Email" error={errors.email}>
                        {(props) => <input {...props} name="email" type="email" className="control" autoComplete="email" required />}
                    </Field>
                    <Field label="Password" error={errors.password} hint="At least 8 characters with a letter and a number.">
                        {(props) => <PasswordInput {...props} autoComplete="new-password" required />}
                    </Field>
                    <GenderField error={errors.gender} />
                    <Field label="Phone" optional error={errors.phoneNumber}>
                        {(props) => <input {...props} name="phoneNumber" type="tel" className="control" autoComplete="tel" placeholder="+249 912 345 678" />}
                    </Field>
                    <Field label="City" optional error={errors["location.city"]}>
                        {(props) => <input {...props} name="city" className="control" autoComplete="address-level2" />}
                    </Field>
                    <Field label="State" optional error={errors["location.state"]}>
                        {(props) => <input {...props} name="state" className="control" autoComplete="address-level1" />}
                    </Field>
                </div>
                {state.error && <Alert tone="danger">{state.error}</Alert>}
                <SubmitButton pending={pending} className="btn btn-primary btn-lg btn-block">
                    Create account
                </SubmitButton>
            </form>
        </AuthShell>
    );
}
