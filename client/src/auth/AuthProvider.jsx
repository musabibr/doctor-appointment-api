import { useCallback, useEffect, useMemo, useState } from "react";
import { api, tokenStore } from "../lib/api";
import { AuthContext } from "./context";

const GUEST = { status: "guest", role: null, user: null };

export default function AuthProvider({ children }) {
    const [session, setSession] = useState(() => (tokenStore.get() ? { ...GUEST, status: "loading" } : GUEST));

    // Restore the session from a saved token.
    useEffect(() => {
        if (!tokenStore.get()) return undefined;
        let active = true;
        api.get("/auth/me")
            .then(({ role, user }) => active && setSession({ status: "authenticated", role, user }))
            .catch(() => {
                if (!active) return;
                tokenStore.clear();
                setSession(GUEST);
            });
        return () => {
            active = false;
        };
    }, []);

    // The API client fires this when the server rejects our token.
    useEffect(() => {
        const onExpired = () => {
            tokenStore.clear();
            setSession({ ...GUEST, expired: true });
        };
        window.addEventListener("auth:expired", onExpired);
        return () => window.removeEventListener("auth:expired", onExpired);
    }, []);

    const signIn = useCallback(({ token, role, user }) => {
        tokenStore.set(token);
        setSession({ status: "authenticated", role, user });
    }, []);

    const signOut = useCallback(async () => {
        try {
            await api.post("/auth/logout");
        } catch {
            // the token is dropped locally either way
        }
        tokenStore.clear();
        setSession(GUEST);
    }, []);

    const updateUser = useCallback((user) => setSession((current) => ({ ...current, user: { ...current.user, ...user } })), []);

    const value = useMemo(
        () => ({ ...session, isAuthenticated: session.status === "authenticated", signIn, signOut, updateUser }),
        [session, signIn, signOut, updateUser]
    );

    return <AuthContext value={value}>{children}</AuthContext>;
}
