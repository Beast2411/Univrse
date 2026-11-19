(() => {
    const configured = document.querySelector('meta[name="api-base-url"]')?.content;
    const localHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    const localDefault = `http://${window.location.hostname || "localhost"}:5000/api`;
    const base = (window.UNIVRSE_API_BASE || (localHost ? localDefault : configured || localDefault)).replace(/\/+$/, "");
    window.UNIVRSE_API_BASE = base;
    window.UNIVRSE_API = {
        async request(path, options = {}) {
            const response = await fetch(`${base}${path}`, {
                ...options,
                credentials: "include",
                headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers }
            });
            let payload;
            try { payload = await response.json(); }
            catch { throw new Error("The API returned an unreadable response."); }
            if (!response.ok || payload?.success !== true) {
                throw new Error(payload?.message || `The API request failed (${response.status}).`);
            }
            return payload.data;
        }
    };
})();
