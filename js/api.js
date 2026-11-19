(() => {
    const base = (window.UNIVRSE_API_BASE || "http://localhost:5000/api").replace(/\/+$/, "");
    window.UNIVRSE_API_BASE = base;
    window.UNIVRSE_API = {
        async request(path, options = {}) {
            const response = await fetch(`${base}${path}`, {
                ...options,
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
