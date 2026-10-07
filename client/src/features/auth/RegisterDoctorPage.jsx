import { Link, Navigate, useNavigate } from "react-router";
import { api } from "../../lib/api";
import { formError, useAsync, useFormAction } from "../../lib/hooks";
import { HOME_BY_ROLE, useAuth } from "../../auth/context";
import { Alert, Field, GenderField, SubmitButton } from "../../components/ui";
import { AuthShell, PasswordInput } from "./AuthShell";

const DOCUMENT_TYPES = "image/jpeg,image/png,image/webp,application/pdf";
const PHOTO_TYPES = "image/jpeg,image/png,image/webp";
const MAX_SIZE = 5 * 1024 * 1024;

// Catch obvious problems before uploading several megabytes.
const checkFiles = (formData) => {
    const errors = {};
    for (const [field, required] of [
        ["medicalLicense", true],
        ["personalID", true],
        ["photo", false],
    ]) {
        const file = formData.get(field);
        const empty = !file || typeof file === "string" || file.size === 0;
        if (empty) {
            formData.delete(field);
            if (required) errors[field] = "Please upload this document";
        } else if (file.size > MAX_SIZE) {
            errors[field] = "The file must be 5 MB or smaller";
        }
    }
    return errors;
};

export default function RegisterDoctorPage() {
    const auth = useAuth();
    const navigate = useNavigate();
    const specialties = useAsync(() => api.get("/doctors/specialties"), []);

    const [state, onSubmit, pending] = useFormAction(async (previous, formData) => {
        const fileErrors = checkFiles(formData);
        if (Object.keys(fileErrors).length) {
            return { error: "Please check the uploaded documents", fieldErrors: fileErrors };
        }
        try {
            const result = await api.post("/doctors/register", formData);
            navigate(`/verify-email?email=${encodeURIComponent(result.email)}`, {
                state: { message: "Account created! Enter the 6-digit code we sent to your email." },
            });
            return {};
        } catch (error) {
            return formError(error);
        }
    });

    if (auth.isAuthenticated) return <Navigate to={HOME_BY_ROLE[auth.role]} replace />;

    const errors = state.fieldErrors || {};

    return (
        <AuthShell
            title="Join as a doctor"
            subtitle="Create your account, verify your email and our team will review your documents, usually within one business day."
            width="medium"
            footer={
                <>
                    Already registered? <Link to="/login?role=doctor">Log in</Link>
                </>
            }
        >
            <form className="form" onSubmit={onSubmit} noValidate encType="multipart/form-data">
                <h3>Account</h3>
                <div className="form-grid">
                    <Field label="Full name" error={errors.name} hint="Without the “Dr.” prefix." className="span-2">
                        {(props) => <input {...props} name="name" className="control" autoComplete="name" />}
                    </Field>
                    <Field label="Email" error={errors.email}>
                        {(props) => <input {...props} name="email" type="email" className="control" autoComplete="email" />}
                    </Field>
                    <Field label="Password" error={errors.password} hint="At least 8 characters with a letter and a number.">
                        {(props) => <PasswordInput {...props} autoComplete="new-password" />}
                    </Field>
                    <Field label="Phone" error={errors.phoneNumber}>
                        {(props) => <input {...props} name="phoneNumber" type="tel" className="control" autoComplete="tel" placeholder="+249 912 345 678" />}
                    </Field>
                    <GenderField error={errors.gender} />
                </div>

                <hr className="divider" />
                <h3>Practice</h3>
                <div className="form-grid">
                    <Field label="Specialty" error={errors.specialty}>
                        {(props) => (
                            <>
                                <input {...props} name="specialty" className="control" list="specialty-options" placeholder="e.g. Cardiology" />
                                <datalist id="specialty-options">
                                    {(specialties.data || []).map((s) => (
                                        <option key={s} value={s} />
                                    ))}
                                </datalist>
                            </>
                        )}
                    </Field>
                    <Field label="Practice address" error={errors.address}>
                        {(props) => <input {...props} name="address" className="control" placeholder="Street, city" />}
                    </Field>
                    <Field label="Consultation price" optional error={errors.price}>
                        {(props) => <input {...props} name="price" type="number" min="0" step="0.01" className="control" />}
                    </Field>
                    <Field label="Discount (%)" optional error={errors.discount}>
                        {(props) => <input {...props} name="discount" type="number" min="0" max="100" step="1" className="control" />}
                    </Field>
                    <Field label="About you" optional error={errors.about} className="span-2">
                        {(props) => (
                            <textarea
                                {...props}
                                name="about"
                                className="control"
                                maxLength={1000}
                                placeholder="Experience, areas of interest, languages spoken…"
                            />
                        )}
                    </Field>
                </div>

                <hr className="divider" />
                <h3>Verification documents</h3>
                <p className="muted small">Only our admin team can see these. JPG, PNG, WEBP or PDF, up to 5 MB each.</p>
                <div className="form-grid">
                    <Field label="Medical license" error={errors.medicalLicense}>
                        {(props) => <input {...props} name="medicalLicense" type="file" accept={DOCUMENT_TYPES} className="control" />}
                    </Field>
                    <Field label="Personal ID" error={errors.personalID}>
                        {(props) => <input {...props} name="personalID" type="file" accept={DOCUMENT_TYPES} className="control" />}
                    </Field>
                    <Field label="Profile photo" optional error={errors.photo} hint="Shown to patients on your profile.">
                        {(props) => <input {...props} name="photo" type="file" accept={PHOTO_TYPES} className="control" />}
                    </Field>
                </div>

                {state.error && <Alert tone="danger">{state.error}</Alert>}
                <SubmitButton pending={pending} className="btn btn-primary btn-lg btn-block">
                    {pending ? "Uploading…" : "Create doctor account"}
                </SubmitButton>
            </form>
        </AuthShell>
    );
}
