import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router";
import Layout from "./components/Layout";
import { PageLoader } from "./components/ui";
import RequireRole from "./auth/RequireRole";
import HomePage from "./features/public/HomePage";
import DoctorSearchPage from "./features/public/DoctorSearchPage";
import DoctorProfilePage from "./features/public/DoctorProfilePage";
import NotFoundPage from "./features/public/NotFoundPage";
import LoginPage from "./features/auth/LoginPage";
import RegisterPatientPage from "./features/auth/RegisterPatientPage";
import RegisterDoctorPage from "./features/auth/RegisterDoctorPage";
import VerifyEmailPage from "./features/auth/VerifyEmailPage";
import ForgotPasswordPage from "./features/auth/ForgotPasswordPage";
import ResetPasswordPage from "./features/auth/ResetPasswordPage";

// Signed-in areas are loaded on demand to keep the first page light.
const PatientAppointmentsPage = lazy(() => import("./features/patient/PatientAppointmentsPage"));
const PatientProfilePage = lazy(() => import("./features/patient/PatientProfilePage"));
const DoctorDashboardPage = lazy(() => import("./features/doctor/DoctorDashboardPage"));
const DoctorAppointmentsPage = lazy(() => import("./features/doctor/DoctorAppointmentsPage"));
const DoctorAvailabilityPage = lazy(() => import("./features/doctor/DoctorAvailabilityPage"));
const DoctorReviewsPage = lazy(() => import("./features/doctor/DoctorReviewsPage"));
const DoctorSettingsPage = lazy(() => import("./features/doctor/DoctorSettingsPage"));
const AdminDashboardPage = lazy(() => import("./features/admin/AdminDashboardPage"));
const AdminDoctorsPage = lazy(() => import("./features/admin/AdminDoctorsPage"));
const AdminDoctorDetailPage = lazy(() => import("./features/admin/AdminDoctorDetailPage"));
const AdminPatientsPage = lazy(() => import("./features/admin/AdminPatientsPage"));
const AdminAppointmentsPage = lazy(() => import("./features/admin/AdminAppointmentsPage"));
const AdminReviewsPage = lazy(() => import("./features/admin/AdminReviewsPage"));

const as = (role, element) => (
    <RequireRole role={role}>
        <Suspense fallback={<PageLoader />}>{element}</Suspense>
    </RequireRole>
);

export default function App() {
    return (
        <Routes>
            <Route element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="doctors" element={<DoctorSearchPage />} />
                <Route path="doctors/:id" element={<DoctorProfilePage />} />

                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPatientPage />} />
                <Route path="register/doctor" element={<RegisterDoctorPage />} />
                <Route path="verify-email" element={<VerifyEmailPage />} />
                <Route path="forgot-password" element={<ForgotPasswordPage />} />
                <Route path="reset-password" element={<ResetPasswordPage />} />

                <Route path="appointments" element={as("patient", <PatientAppointmentsPage />)} />
                <Route path="profile" element={as("patient", <PatientProfilePage />)} />

                <Route path="doctor" element={as("doctor", <DoctorDashboardPage />)} />
                <Route path="doctor/appointments" element={as("doctor", <DoctorAppointmentsPage />)} />
                <Route path="doctor/availability" element={as("doctor", <DoctorAvailabilityPage />)} />
                <Route path="doctor/reviews" element={as("doctor", <DoctorReviewsPage />)} />
                <Route path="doctor/profile" element={as("doctor", <DoctorSettingsPage />)} />

                <Route path="admin" element={as("admin", <AdminDashboardPage />)} />
                <Route path="admin/doctors" element={as("admin", <AdminDoctorsPage />)} />
                <Route path="admin/doctors/:id" element={as("admin", <AdminDoctorDetailPage />)} />
                <Route path="admin/patients" element={as("admin", <AdminPatientsPage />)} />
                <Route path="admin/appointments" element={as("admin", <AdminAppointmentsPage />)} />
                <Route path="admin/reviews" element={as("admin", <AdminReviewsPage />)} />

                <Route path="*" element={<NotFoundPage />} />
            </Route>
        </Routes>
    );
}
