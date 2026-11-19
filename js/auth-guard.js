(() => {
    const currentFile = location.pathname.split("/").pop() || "dashboard.html";
    if (currentFile === "login.html") return;

    document.documentElement.classList.add("auth-checking");
    const apiBase = (window.UNIVRSE_API_BASE || "http://localhost:5000/api").replace(/\/+$/, "");

    function redirectToLogin(reason) {
        const returnTo = `${location.pathname}${location.search}${location.hash}`;
        const query = new URLSearchParams({ returnTo });
        if (reason) query.set("reason", reason);
        location.replace(`login.html?${query.toString()}`);
    }

    async function checkSession() {
        try {
            const response = await fetch(`${apiBase}/auth/me`, {
                credentials: "include",
                headers: { Accept: "application/json" }
            });
            const payload = await response.json();
            if (!response.ok || payload?.success !== true || !payload.data?.user) {
                redirectToLogin(response.status === 401 ? "session" : "unavailable");
                return;
            }
            window.UNIVRSE_USER = payload.data.user;
            updateProfile(payload.data.user);
            document.documentElement.classList.remove("auth-checking");
        } catch {
            redirectToLogin("unavailable");
        }
    }

    function updateProfile(user) {
        const initials = user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
        document.querySelectorAll(".app-initials").forEach((node) => {
            node.textContent = initials || "U";
            node.setAttribute("aria-label", user.name);
            node.title = user.email;
        });
        document.querySelectorAll(".sidebar-bottom p").forEach((node) => { node.textContent = user.name; });
        document.querySelectorAll("#dashboard-greeting").forEach((node) => {
            const hour = new Date().getHours();
            const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
            node.textContent = `${greeting}, ${user.name.split(/\s+/)[0]}`;
        });
        const profiles = document.querySelectorAll(".app-profile");
        profiles.forEach((profile) => {
            if (profile.querySelector("[data-auth-logout]")) return;
            const button = document.createElement("button");
            button.type = "button";
            button.className = "auth-logout-button";
            button.dataset.authLogout = "true";
            button.textContent = "Log out";
            button.addEventListener("click", async () => {
                button.disabled = true;
                try {
                    await fetch(`${apiBase}/auth/logout`, { method: "POST", credentials: "include", headers: { Accept: "application/json" } });
                } finally {
                    location.replace("login.html");
                }
            });
            profile.append(button);
        });
    }

    void checkSession();
})();
