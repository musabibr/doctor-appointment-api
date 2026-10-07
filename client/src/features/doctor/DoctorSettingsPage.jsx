import { api } from "../../lib/api";
import { formError, useAsync, useFormAction } from "../../lib/hooks";
import { pageTitle } from "../../lib/config";
import { useAuth } from "../../auth/context";
import { useToast } from "../../components/toast";
import { Alert, ErrorState, Field, GenderField, PageHeader, PageLoader, StatusBadge, SubmitButton } from "../../components/ui";
import { ChangePasswordCard, PhotoCard } from "../account/AccountCards";
import ApprovalNotice from "./ApprovalNotice";

const text = (formData, key) => String(formData.get(key) || "").trim();

function ProfileForm({ doctor, onSaved }) {
    const auth = useAuth();
    const { notify } = useToast();

    const [state, onSubmit, pending] = useFormAction(async (previous, formData) => {
        try {
            const updated = await api.patch("/doctors/me", {
                name: text(formData, "name"),
                gender: formData.get("gender") || undefined,
                phoneNumber: text(formData, "phoneNumber"),
                specialty: text(formData, "specialty"),
                address: text(formData, "address"),
                about: text(formData, "about"),
                price: text(formData, "price") || 0,
                discount: text(formData, "discount") || 0,
            });
            auth.updateUser({ name: updated.name });
            onSaved(updated);
            notify("Profile saved");
            return {};
        } catch (error) {
            return formError(error);
        }
    });

    const errors = state.fieldErrors || {};

    return (
        <section className="card stack">
            <h2>Professional details</h2>
            <form className="form" onSubmit={onSubmit} noValidate>
                <div className="form-grid">
                    <Field label="Full name" error={errors.name}>
                        {(props) => <input {...props} name="name" className="control" defaultValue={doctor.name} />}
                    </Field>
                    <Field label="Specialty" error={errors.specialty}>
                        {(props) => <input {...props} name="specialty" className="control" defaultValue={doctor.specialty} />}
                    </Field>
                    <Field label="Phone" error={errors.phoneNumber}>
                        {(props) => <input {...props} name="phoneNumber" type="tel" className="control" defaultValue={doctor.phoneNumber} />}
                    </Field>
                    <GenderField error={errors.gender} defaultValue={doctor.gender} />
                    <Field label="Consultation price" error={errors.price}>
                        {(props) => <input {...props} name="price" type="number" min="0" step="0.01" className="control" defaultValue={doctor.price || ""} />}
                    </Field>
                    <Field label="Discount (%)" error={errors.discount}>
                        {(props) => <input {...props} name="discount" type="number" min="0" max="100" className="control" defaultValue={doctor.discount || ""} />}
                    </Field>
                    <Field label="Practice address" error={errors.address} className="span-2">
                        {(props) => <input {...props} name="address" className="control" defaultValue={doctor.address} />}
                    </Field>
                    <Field label="About you" error={errors.about} className="span-2" hint="Shown on your public profile.">
                        {(props) => <textarea {...props} name="about" className="control" maxLength={1000} defaultValue={doctor.about} />}
                    </Field>
                </div>
                {state.error && state.code !== "VALIDATION_ERROR" && <Alert tone="danger">{state.error}</Alert>}
                <div className="row end">
                    <SubmitButton pending={pending}>Save details</SubmitButton>
                </div>
            </form>
        </section>
    );
}

function ClinicForm({ clinic, onSaved }) {
    const { notify } = useToast();

    const [state, onSubmit, pending] = useFormAction(async (previous, formData) => {
        try {
            const saved = await api.put("/doctors/me/clinic", {
                name: text(formData, "name"),
                location: { city: text(formData, "city"), state: text(formData, "state"), address: text(formData, "address") },
                contact: { phone: text(formData, "phone"), email: text(formData, "email") || undefined },
                services: text(formData, "services"),
            });
            onSaved(saved);
            notify("Clinic saved");
            return {};
        } catch (error) {
            return formError(error);
        }
    });

    const errors = state.fieldErrors || {};

    return (
        <section className="card stack">
            <div>
                <h2>Clinic</h2>
                <p className="muted small">Patients use this to find you by city and to know where to go.</p>
            </div>
            <form className="form" onSubmit={onSubmit} noValidate>
                <div className="form-grid">
                    <Field label="Clinic name" error={errors.name} className="span-2">
                        {(props) => <input {...props} name="name" className="control" defaultValue={clinic?.name} />}
                    </Field>
                    <Field label="City" error={errors["location.city"]}>
                        {(props) => <input {...props} name="city" className="control" defaultValue={clinic?.location?.city} />}
                    </Field>
                    <Field label="State" error={errors["location.state"]}>
                        {(props) => <input {...props} name="state" className="control" defaultValue={clinic?.location?.state} />}
                    </Field>
                    <Field label="Street address" optional error={errors["location.address"]} className="span-2">
                        {(props) => <input {...props} name="address" className="control" defaultValue={clinic?.location?.address} />}
                    </Field>
                    <Field label="Clinic phone" error={errors["contact.phone"]}>
                        {(props) => <input {...props} name="phone" type="tel" className="control" defaultValue={clinic?.contact?.phone} />}
                    </Field>
                    <Field label="Clinic email" optional error={errors["contact.email"]}>
                        {(props) => <input {...props} name="email" type="email" className="control" defaultValue={clinic?.contact?.email} />}
                    </Field>
                    <Field label="Services" optional error={errors.services} hint="Separate with commas, e.g. ECG, Vaccinations" className="span-2">
                        {(props) => <input {...props} name="services" className="control" defaultValue={(clinic?.services || []).join(", ")} />}
                    </Field>
                </div>
                {state.error && state.code !== "VALIDATION_ERROR" && <Alert tone="danger">{state.error}</Alert>}
                <div className="row end">
                    <SubmitButton pending={pending}>{clinic ? "Save clinic" : "Add clinic"}</SubmitButton>
                </div>
            </form>
        </section>
    );
}

export default function DoctorSettingsPage() {
    const auth = useAuth();
    const profile = useAsync(() => api.get("/doctors/me"), []);

    if (profile.error) return <div className="container page"><ErrorState error={profile.error} onRetry={profile.reload} /></div>;
    if (!profile.data) return <PageLoader />;

    const doctor = profile.data;

    return (
        <div className="container medium page">
            <title>{pageTitle("Profile & clinic")}</title>
            <PageHeader
                title="Profile & clinic"
                description={auth.user?.email}
                actions={<StatusBadge status={doctor.approvalStatus} label={`Account ${doctor.approvalStatus}`} />}
            />
            <div className="stack">
                <ApprovalNotice doctor={doctor} />
                <PhotoCard endpoint="/doctors/me/photo" onUploaded={(updated) => profile.setData(updated)} />
                <ProfileForm doctor={doctor} onSaved={(updated) => profile.setData(updated)} />
                <ClinicForm clinic={doctor.clinic} onSaved={(clinic) => profile.setData((d) => ({ ...d, clinic }))} />
                <ChangePasswordCard />
            </div>
        </div>
    );
}
