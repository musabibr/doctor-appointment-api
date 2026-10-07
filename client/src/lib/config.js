export const APP_NAME = import.meta.env.VITE_APP_NAME || "Doctorri";

export const pageTitle = (title) => (title ? `${title} · ${APP_NAME}` : APP_NAME);
