import { Link, useSearchParams } from "react-router";
import { api } from "../../lib/api";
import { formError, useFormAction } from "../../lib/hooks";
import { Alert, Field, SubmitButton } from "../../components/ui";
import { AuthShell, PasswordInput } from "./AuthShell";

export default function ResetPasswordPage() {
    const [params] = useSearchParams();
    const token = params.get("token") || "";
    const role = params.get("role") === "doctor" ? "doctor" : "patient";

    const [state, onSubmit, pending] = useFormAction(async (previous, formData) => {
        const password = String(formData.get("password") || "");
        if (password !== formData.get("confirm")) {
            return { fieldErrors: { confirm: "The passwords do not match" } };
        }
        try {
            await api.post("/auth/reset-password", { role, token, password });
            return { done: true };
        } catch (error) {
            return formError(error);
        }
    });

    if (!token) {
        return (
            <AuthShell title="Invalid reset link">
                <Alert tone="danger">This link is incomplete. Please request a new one.</Alert>
                <Link to="/forgot-password" className="btn btn-primary">
                    Request a new link
                </Link>
            </AuthShell>
        );
    }

    return (
        <AuthShell title="Choose a new password" subtitle="You will be signed out of all your devices.">
            {state.done ? (
                <>
                    <Alert tone="success">Your password has been changed.</Alert>
                    <Link to={`/login?role=${role}`} className="btn btn-primary btn-block">
                        Log in
                    </Link>
                </>
            ) : (
                <form className="form" onSubmit={onSubmit} noValidate>
                    <Field label="New password" error={state.fieldErrors?.password} hint="At least 8 characters with a letter and a number.">
                        {(props) => <PasswordInput {...props} autoComplete="new-password" />}
                    </Field>
                    <Field label="Repeat the new password" error={state.fieldErrors?.confirm}>
                        {(props) => <PasswordInput {...props} name="confirm" autoComplete="new-password" />}
                    </Field>
                    {state.error && state.code !== "VALIDATION_ERROR" && (
                        <Alert tone="danger">
                            {state.error} <Link to={`/forgot-password?role=${role}`}>Request a new link</Link>
                        </Alert>
                    )}
                    <SubmitButton pending={pending} className="btn btn-primary btn-block">
                        Save new password
                    </SubmitButton>
                </form>
            )}
        </AuthShell>
    );
}
