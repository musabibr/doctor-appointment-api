import { api } from "./api";

let demoPromise = null;

// Resolves to the demo information ({ accounts, resetHours, nextResetAt }) when
// the server runs in demo mode, or null otherwise. Fetched once and cached so it
// can be read with React 19's use() inside a <Suspense> boundary.
export const loadDemo = () => {
    if (!demoPromise) demoPromise = api.get("/demo").catch(() => null);
    return demoPromise;
};
