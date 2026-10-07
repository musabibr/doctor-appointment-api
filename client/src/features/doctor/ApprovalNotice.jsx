import { Link } from "react-router";
import { Alert } from "../../components/ui";

export default function ApprovalNotice({ doctor, showWhenApproved = false }) {
    if (!doctor) return null;
    if (doctor.approvalStatus === "pending") {
        return (
            <Alert tone="warning">
                <strong>Your account is under review.</strong> An admin is checking your documents. You will get an email as
                soon as you are approved. Meanwhile, complete your <Link to="/doctor/profile">profile and clinic details</Link>.
            </Alert>
        );
    }
    if (doctor.approvalStatus === "rejected") {
        return (
            <Alert tone="danger">
                <strong>Your application was not approved.</strong>
                {doctor.rejectionReason && <> Reason: {doctor.rejectionReason}.</>} Please contact support if you think this is a
                mistake.
            </Alert>
        );
    }
    if (showWhenApproved) {
        return <Alert tone="success">Your account is approved and visible to patients.</Alert>;
    }
    return null;
}
