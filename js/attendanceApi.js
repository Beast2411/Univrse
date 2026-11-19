const configuredApiUrl = document.querySelector('meta[name="api-base-url"]')?.content;
const API_BASE_URL = (window.UNIVRSE_API_BASE || window.UNIVRSE_API_BASE_URL || configuredApiUrl || "http://localhost:5000/api")
    .replace(/\/+$/, "");

async function request(path, options = {}) {
    let response;
    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            credentials: "include",
            headers: {
                Accept: "application/json",
                ...(options.body ? {"Content-Type": "application/json"} : {}),
                ...(options.headers || {})
            }
        });
    } catch {
        throw new Error(`Cannot connect to the attendance API at ${API_BASE_URL}.`);
    }

    const text = await response.text();
    let payload = null;
    if (text) {
        try {
            payload = JSON.parse(text);
        } catch {
            throw new Error("The attendance API returned a non-JSON response.");
        }
    }
    if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || payload?.error || `Attendance API request failed (HTTP ${response.status}).`);
    }
    return payload?.success === true ? payload.data : payload;
}

window.attendanceApi = {
    list: () => request("/attendance"),
    create: subject => request("/attendance", {
        method: "POST",
        body: JSON.stringify(subject)
    }),
    update: (id, subject) => request(`/attendance/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(subject)
    }),
    mark: (id, status) => request(`/attendance/${encodeURIComponent(id)}/mark`, {
        method: "PATCH",
        body: JSON.stringify({status})
    }),
    remove: id => request(`/attendance/${encodeURIComponent(id)}`, {method: "DELETE"})
};
