const env = require("../config/env");

// Calendar dates are stored as UTC midnight and handled as "YYYY-MM-DD" keys.
// Slot times are "HH:MM" wall-clock times in APP_TIMEZONE, so comparing
// "YYYY-MM-DD HH:MM" strings is enough to tell past from future.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const isDateKey = (value) => {
    if (typeof value !== "string" || !DATE_RE.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

const isTime = (value) => typeof value === "string" && TIME_RE.test(value);

const parseDateKey = (value) => new Date(`${value}T00:00:00.000Z`);

const toDateKey = (date) => new Date(date).toISOString().slice(0, 10);

const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: env.APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
});

const now = () => {
    const parts = Object.fromEntries(
        formatter.formatToParts(new Date()).map(({ type, value }) => [type, value])
    );
    return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
};

const todayKey = () => now().date;

// True when the given date + time is at or before the current moment.
const hasPassed = (dateKey, time) => {
    const current = now();
    return `${dateKey} ${time}` <= `${current.date} ${current.time}`;
};

const addDays = (dateKey, days) => {
    const date = parseDateKey(dateKey);
    date.setUTCDate(date.getUTCDate() + days);
    return toDateKey(date);
};

module.exports = { isDateKey, isTime, parseDateKey, toDateKey, now, todayKey, hasPassed, addDays };
