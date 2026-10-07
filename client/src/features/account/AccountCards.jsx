import { useRef, useState } from "react";
import { api } from "../../lib/api";
import { formError, useFormAction } from "../../lib/hooks";
import { useAuth } from "../../auth/context";
import { useToast } from "../../components/toast";
import { Alert, Avatar, Field, Spinner, SubmitButton } from "../../components/ui";
import { PasswordInput } from "../auth/AuthShell";

export function PhotoCard({ endpoint, onUploaded }) {
    const auth = useAuth();
    const { notify } = useToast();
    const input = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    const upload = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setError("The photo must be 5 MB or smaller");
            return;
        }
        const body = new FormData();
        body.append("photo", file);
        setUploading(true);
        setError(null);
        try {
            const user = await api.put(endpoint, body);
            auth.updateUser({ photo: user.photo });
            onUploaded?.(user);
            notify("Photo updated");
        } catch (err) {
            setError(err.errors?.photo || err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <section className="card stack">
            <h2>Profile photo</h2>
            <div className="photo-upload">
                <Avatar src={auth.user?.photo} name={auth.user?.name} size={88} />
                <div className="stack-sm">
                    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={upload} />
                    <button type="button" className="btn btn-secondary" onClick={() => input.current?.click()} disabled={uploading}>
                        {uploading && <Spinner />}
                        {auth.user?.photo ? "Change photo" : "Upload photo"}
                    </button>
                    <span className="muted tiny">JPG, PNG or WEBP, up to 5 MB.</span>
                </div>
            </div>
            {error && <Alert tone="danger">{error}</Alert>}
        </section>
    );
}

export function ChangePasswordCard() {
    const auth = useAuth();
    const { notify } = useToast();
    const form = useRef(null);

    const [state, onSubmit, pending] = useFormAction(async (previous, formData) => {
        if (formData.get("newPassword") !== formData.get("confirm")) {
            return { fieldErrors: { confirm: "The passwords do not match" } };
        }
        try {
            const session = await api.patch("/auth/me/password", {
                currentPassword: formData.get("currentPassword"),
                newPassword: formData.get("newPassword"),
            });
            auth.signIn(session); // the old token was revoked
            form.current?.reset();
            notify("Password updated. Other devices were signed out.");
            return {};
        } catch (error) {
            return formError(error);
        }
    });

    const errors = state.fieldErrors || {};

    return (
        <section className="card stack">
            <h2>Change password</h2>
            <form ref={form} className="form" onSubmit={onSubmit} noValidate>
                <Field label="Current password" error={errors.currentPassword}>
                    {(props) => <PasswordInput {...props} name="currentPassword" />}
                </Field>
                <div className="form-grid">
                    <Field label="New password" error={errors.newPassword} hint="8+ characters with a letter and a number.">
                        {(props) => <PasswordInput {...props} name="newPassword" autoComplete="new-password" />}
                    </Field>
                    <Field label="Repeat new password" error={errors.confirm}>
                        {(props) => <PasswordInput {...props} name="confirm" autoComplete="new-password" />}
                    </Field>
                </div>
                {state.error && state.code !== "VALIDATION_ERROR" && <Alert tone="danger">{state.error}</Alert>}
                <div className="row end">
                    <SubmitButton pending={pending}>Update password</SubmitButton>
                </div>
            </form>
        </section>
    );
}
