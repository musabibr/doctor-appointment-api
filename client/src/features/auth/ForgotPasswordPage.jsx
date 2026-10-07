import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "../../lib/api";
import { formError, useFormAction } from "../../lib/hooks";
import { Alert, Field, SubmitButton } from "../../components/ui";
import { AuthShell, DevEmailHint, RoleSwitch } from "./AuthShell";
import { DemoInboxHint } from "../../components/Demo";

export default function ForgotPasswordPage() {
    const [params] = useSearchParams();
    const [role, setRole] = useState(params.get("role") === "doctor" ? "doctor" : "patient");

    const [state, onSubmit, pending] = useFormAction(async (previous, formData) => {
        try {
            await api.post("/auth/forgot-password", { role, email: String(formData.get("email") || "").trim() });
            return { sent: true };
        } catch (error) {
            return formError(error);
        }
    });

    return (
        <AuthShell
            title="Reset your password"
            subtitle="We will email you a link to choose a new password."
            footer={
                <>
                    Remembered it? <Link to={`/login?role=${role}`}>Back to login</Link>
                </>
            }
        >
            {state.sent ? (
                <>
                    <Alert tone="success">
                        If an account exists for that email, a reset link is on its way. The link is valid for 30 minutes.
                    </Alert>
                    <DevEmailHint>Running locally without SendGrid? The link is printed in the API terminal.</DevEmailHint>
                    <DemoInboxHint>This is a demo, so the link is not emailed.</DemoInboxHint>
                </>
            ) : (
                <>
                    <RoleSwitch
                        value={role}
                        onChange={setRole}
                        roles={[
                            ["patient", "Patient"],
                            ["doctor", "Doctor"],
                        ]}
                    />
                    <form className="form" onSubmit={onSubmit} noValidate>
                        <Field label="Email" error={state.fieldErrors?.email}>
                            {(props) => <input {...props} name="email" type="email" className="control" autoComplete="email" />}
                        </Field>
                        {state.error && state.code !== "VALIDATION_ERROR" && <Alert tone="danger">{state.error}</Alert>}
                        <SubmitButton pending={pending} className="btn btn-primary btn-block">
                            Send reset link
                        </SubmitButton>
                    </form>
                </>
            )}
        </AuthShell>
    );
}
