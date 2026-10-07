import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { api } from "../../lib/api";
import { formError, useFormAction } from "../../lib/hooks";
import { useAuth } from "../../auth/context";
import { useToast } from "../../components/toast";
import { Alert, Field, SubmitButton } from "../../components/ui";
import { AuthShell, DevEmailHint } from "./AuthShell";

const COOLDOWN_SECONDS = 60;

export default function VerifyEmailPage() {
    const auth = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { notify } = useToast();
    const [params] = useSearchParams();
    const [email, setEmail] = useState(params.get("email") || "");
    const [cooldown, setCooldown] = useState(params.get("email") ? COOLDOWN_SECONDS : 0);
    const [resendMessage, setResendMessage] = useState(null);

    useEffect(() => {
        if (cooldown <= 0) return undefined;
        const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    const [state, onSubmit, pending] = useFormAction(async (previous, formData) => {
        try {
            const session = await api.post("/auth/verify-email", {
                role: "doctor",
                email: email.trim(),
                code: String(formData.get("code") || "").replace(/\s/g, ""),
            });
            auth.signIn(session);
            notify("Email verified. Welcome aboard!");
            navigate("/doctor", { replace: true });
            return {};
        } catch (error) {
            if (error.code === "ALREADY_VERIFIED") {
                navigate("/login?role=doctor", { replace: true });
                return {};
            }
            return formError(error);
        }
    });

    const resend = async () => {
        setResendMessage(null);
        try {
            await api.post("/auth/resend-verification", { role: "doctor", email: email.trim() });
            setResendMessage({ tone: "success", text: "If your account still needs verification, a new code is on its way." });
            setCooldown(COOLDOWN_SECONDS);
        } catch (error) {
            setResendMessage({ tone: "danger", text: error.message });
        }
    };

    // Format problems are shown on the fields; anything else (wrong or expired
    // code, attempts left) as a message.
    const isValidation = state.code === "VALIDATION_ERROR";
    const errors = isValidation ? state.fieldErrors || {} : {};

    return (
        <AuthShell
            title="Verify your email"
            subtitle="Enter the 6-digit code we sent you. It is valid for 10 minutes."
            footer={
                <>
                    Wrong place? <Link to="/login?role=doctor">Back to login</Link>
                </>
            }
        >
            {location.state?.message && !state.error && <Alert tone="info">{location.state.message}</Alert>}
            <form className="form" onSubmit={onSubmit} noValidate>
                <Field label="Email" error={errors.email}>
                    {(props) => (
                        <input
                            {...props}
                            type="email"
                            className="control"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            autoComplete="email"
                        />
                    )}
                </Field>
                <Field label="Verification code" error={errors.code}>
                    {(props) => (
                        <input
                            {...props}
                            name="code"
                            className="control otp-input"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            placeholder="••••••"
                        />
                    )}
                </Field>
                {state.error && !isValidation && <Alert tone="danger">{state.error}</Alert>}
                <SubmitButton pending={pending} className="btn btn-primary btn-lg btn-block">
                    Verify email
                </SubmitButton>
            </form>
            <div className="row between small">
                <span className="muted">Didn’t get it? Check your spam folder.</span>
                <button type="button" className="link-button" disabled={cooldown > 0 || !email} onClick={resend}>
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </button>
            </div>
            {resendMessage && <Alert tone={resendMessage.tone}>{resendMessage.text}</Alert>}
            <DevEmailHint>Running locally without SendGrid? The code is printed in the API terminal.</DevEmailHint>
        </AuthShell>
    );
}
