import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import AuthProvider from "./auth/AuthProvider";
import ThemeProvider from "./theme/ThemeProvider";
import ToastProvider from "./components/ToastProvider";
import App from "./App";
import "./styles/global.css";
import "./styles/areas/public.css";
import "./styles/areas/auth.css";
import "./styles/areas/patient.css";
import "./styles/areas/doctor.css";
import "./styles/areas/admin.css";
import "./styles/areas/demo.css";

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <ThemeProvider>
            <BrowserRouter>
                <AuthProvider>
                    <ToastProvider>
                        <App />
                    </ToastProvider>
                </AuthProvider>
            </BrowserRouter>
        </ThemeProvider>
    </StrictMode>
);
