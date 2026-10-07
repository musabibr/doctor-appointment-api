import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// In development the API runs on its own port; Vite forwards /api and /uploads
// to it so the browser only ever talks to one origin.
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    const apiTarget = env.API_PROXY_TARGET || "http://localhost:5000";

    return {
        plugins: [react()],
        server: {
            port: 5173,
            proxy: {
                "/api": apiTarget,
                "/uploads": apiTarget,
            },
        },
        preview: {
            port: 4173,
            proxy: {
                "/api": apiTarget,
                "/uploads": apiTarget,
            },
        },
    };
});
