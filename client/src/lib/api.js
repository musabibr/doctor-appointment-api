// Thin wrapper around fetch for the REST API.
// Successful responses resolve to the `data` field of the JSON body; failures
// throw an ApiError carrying the status, an optional code and field errors.

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const TOKEN_KEY = "doctorri.token";

export class ApiError extends Error {
    constructor(message, { status = 0, code, errors } = {}) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.code = code;
        this.errors = errors || {};
    }
}

export const tokenStore = {
    get() {
        try {
            return localStorage.getItem(TOKEN_KEY);
        } catch {
            return null;
        }
    },
    set(token) {
        try {
            localStorage.setItem(TOKEN_KEY, token);
        } catch {
            // storage unavailable (private mode): the session lasts until reload
        }
    },
    clear() {
        try {
            localStorage.removeItem(TOKEN_KEY);
        } catch {
            // ignore
        }
    },
};

const buildUrl = (path, query) => {
    const url = new URL(`${API_URL}/api/v1${path}`, window.location.origin);
    for (const [key, value] of Object.entries(query || {})) {
        if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
    }
    return url;
};

export async function request(path, { method = "GET", body, query, signal } = {}) {
    const headers = {};
    const token = tokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`;

    let payload = body;
    if (body !== undefined && !(body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
        payload = JSON.stringify(body);
    }

    let response;
    try {
        response = await fetch(buildUrl(path, query), { method, headers, body: payload, signal });
    } catch (error) {
        if (error.name === "AbortError") throw error;
        throw new ApiError("Cannot reach the server. Check your connection and make sure the API is running.");
    }

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
        if (response.status === 401 && token) window.dispatchEvent(new CustomEvent("auth:expired"));
        throw new ApiError(json.message || `Request failed (${response.status})`, {
            status: response.status,
            code: json.code,
            errors: json.errors,
        });
    }
    return json.data;
}

export const api = {
    get: (path, query) => request(path, { query }),
    post: (path, body) => request(path, { method: "POST", body: body ?? {} }),
    put: (path, body) => request(path, { method: "PUT", body: body ?? {} }),
    patch: (path, body) => request(path, { method: "PATCH", body: body ?? {} }),
    delete: (path) => request(path, { method: "DELETE" }),
};

// Uploaded files are returned as "/uploads/..." paths relative to the API.
export const assetUrl = (url) => {
    if (!url) return null;
    return /^https?:\/\//.test(url) ? url : `${API_URL}${url}`;
};
