import { api } from "../../lib/api";
import { formError, useFormAction } from "../../lib/hooks";
import { pageTitle } from "../../lib/config";
import { useAuth } from "../../auth/context";
import { useToast } from "../../components/toast";
import { Alert, Field, GenderField, PageHeader, SubmitButton } from "../../components/ui";
import { ChangePasswordCard, PhotoCard } from "../account/AccountCards";

const text = (formData, key) => String(formData.get(key) || "").trim();

export default function PatientProfilePage() {
    const auth = useAuth();
    const { notify } = useToast();
    const user = auth.user || {};

    const [state, onSubmit, pending] = useFormAction(async (previous, formData) => {
        try {
            const updated = await api.patch("/patients/me", {
                name: text(formData, "name"),
                gender: formData.get("gender") || undefined,
                phoneNumber: text(formData, "phoneNumber"),
                location: { city: text(formData, "city"), state: text(formData, "state") },
            });
            auth.updateUser(updated);
            notify("Profile saved");
            return {};
        } catch (error) {
            return formError(error);
        }
    });

    const errors = state.fieldErrors || {};

    return (
        <div className="container medium page">
            <title>{pageTitle("My profile")}</title>
            <PageHeader title="My profile" description={user.email} />
            <div className="stack">
                <PhotoCard endpoint="/patients/me/photo" />

                <section className="card stack">
                    <h2>Personal details</h2>
                    <form className="form" onSubmit={onSubmit} noValidate>
                        <div className="form-grid">
                            <Field label="Full name" error={errors.name} className="span-2">
                                {(props) => <input {...props} name="name" className="control" defaultValue={user.name} />}
                            </Field>
                            <GenderField error={errors.gender} defaultValue={user.gender} />
                            <Field label="Phone" optional error={errors.phoneNumber}>
                                {(props) => (
                                    <input {...props} name="phoneNumber" type="tel" className="control" defaultValue={user.phoneNumber || ""} />
                                )}
                            </Field>
                            <Field label="City" optional error={errors["location.city"]}>
                                {(props) => <input {...props} name="city" className="control" defaultValue={user.location?.city || ""} />}
                            </Field>
                            <Field label="State" optional error={errors["location.state"]}>
                                {(props) => <input {...props} name="state" className="control" defaultValue={user.location?.state || ""} />}
                            </Field>
                        </div>
                        {state.error && state.code !== "VALIDATION_ERROR" && <Alert tone="danger">{state.error}</Alert>}
                        <div className="row end">
                            <SubmitButton pending={pending}>Save changes</SubmitButton>
                        </div>
                    </form>
                </section>

                <ChangePasswordCard />
            </div>
        </div>
    );
}
