import { createContext, use } from "react";

export const AuthContext = createContext(null);

// { status: "loading" | "guest" | "authenticated", role, user, isAuthenticated,
//   signIn(session), signOut(), updateUser(partialUser) }
export const useAuth = () => use(AuthContext);

export const HOME_BY_ROLE = {
    patient: "/appointments",
    doctor: "/doctor",
    admin: "/admin",
};
