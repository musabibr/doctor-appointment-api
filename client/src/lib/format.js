const LOCALE = "en-US";
const CURRENCY = import.meta.env.VITE_CURRENCY || "USD";

// The API sends calendar days as "YYYY-MM-DD" (or an ISO date at UTC midnight).
export const toDateKey = (value) =>
    typeof value === "string" ? value.slice(0, 10) : new Date(value).toISOString().slice(0, 10);

const fromKey = (key) => new Date(`${toDateKey(key)}T00:00:00Z`);

const pad = (n) => String(n).padStart(2, "0");

// Today in the browser's time zone, as "YYYY-MM-DD".
export const localTodayKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export const addDaysToKey = (key, days) => {
    const date = fromKey(key);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
};

export const formatDate = (value, options = { weekday: "short", month: "short", day: "numeric", year: "numeric" }) =>
    new Intl.DateTimeFormat(LOCALE, { ...options, timeZone: "UTC" }).format(fromKey(value));

export const formatDayLabel = (value) => {
    const key = toDateKey(value);
    const today = localTodayKey();
    if (key === today) return "Today";
    if (key === addDaysToKey(today, 1)) return "Tomorrow";
    return formatDate(key, { weekday: "short", month: "short", day: "numeric" });
};

export const formatTime = (hhmm) => {
    if (!hhmm) return "";
    const [hours, minutes] = hhmm.split(":").map(Number);
    return new Intl.DateTimeFormat(LOCALE, { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(
        Date.UTC(2000, 0, 1, hours, minutes)
    );
};

export const formatTimeRange = (start, end) => `${formatTime(start)} – ${formatTime(end)}`;

export const formatMoney = (amount) =>
    new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY, maximumFractionDigits: 2 }).format(amount || 0);

export const formatDateTime = (iso) =>
    new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

export const initials = (name = "") =>
    name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase() || "?";

export const plural = (count, word, pluralWord = `${word}s`) => `${count} ${count === 1 ? word : pluralWord}`;

export const capitalize = (text = "") => text.charAt(0).toUpperCase() + text.slice(1);

export const clinicLabel = (clinic) => {
    if (!clinic) return "";
    const city = clinic.location?.city;
    return city ? `${clinic.name} · ${city}` : clinic.name;
};
