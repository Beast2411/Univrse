(() => {
    const form = document.querySelector("#auth-form");
    const nameField = document.querySelector("#auth-name-field");
    const nameInput = document.querySelector("#auth-name");
    const emailInput = document.querySelector("#auth-email");
    const passwordInput = document.querySelector("#auth-password");
    const submitButton = document.querySelector("#auth-submit");
    const feedback = document.querySelector("#auth-feedback");
    const modeButton = document.querySelector("#auth-mode-toggle");
    const apiBase = (window.UNIVRSE_API_BASE || "http://localhost:5000/api").replace(/\/+$/, "");
    const query = new URLSearchParams(location.search);
    let mode = "login";

    function message(text, isError = false) {
        feedback.textContent = text;
        feedback.classList.toggle("is-error", isError);
        feedback.setAttribute("role", isError ? "alert" : "status");
    }

    function setMode(nextMode) {
        mode = nextMode;
        const registering = mode === "register";
        nameField.hidden = !registering;
        nameInput.required = registering;
        document.querySelector("#auth-title").textContent = registering ? "Create your account" : "Welcome back";
        document.querySelector("#auth-subtitle").textContent = registering
            ? "Set up your Univrse student account to continue."
            : "Log in to continue to your campus dashboard.";
        submitButton.textContent = registering ? "Create account" : "Log in";
        modeButton.textContent = registering ? "I already have an account" : "Create an account";
        passwordInput.autocomplete = registering ? "new-password" : "current-password";
        passwordInput.minLength = registering ? 10 : 0;
        document.querySelector("#password-hint").hidden = !registering;
        message("");
    }

    function safeReturnTarget() {
        const target = query.get("returnTo") || "dashboard.html";
        if (!target.startsWith("/") && !target.includes(":") && !target.startsWith("\\")) return target;
        if (target.startsWith("/") && !target.startsWith("//")) return target;
        return "dashboard.html";
    }

    async function existingSession() {
        try {
            const response = await fetch(`${apiBase}/auth/me`, { credentials: "include", headers: { Accept: "application/json" } });
            if (!response.ok) {
                if (response.status !== 401) message("The Univrse API is unavailable. Start the backend and try again.", true);
                return false;
            }
            const payload = await response.json();
            if (payload?.success !== true || !payload.data?.user) return false;
            location.replace(safeReturnTarget());
            return true;
        } catch {
            message("The Univrse API is unavailable. Start the backend and try again.", true);
            return false;
        }
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        message("");
        if (!form.reportValidity()) return;
        submitButton.disabled = true;
        submitButton.textContent = mode === "register" ? "Creating account..." : "Logging in...";
        const endpoint = mode === "register" ? "/auth/register" : "/auth/login";
        const body = { email: emailInput.value.trim(), password: passwordInput.value };
        if (mode === "register") body.name = nameInput.value.trim();
        try {
            const response = await fetch(`${apiBase}${endpoint}`, {
                method: "POST",
                credentials: "include",
                headers: { Accept: "application/json", "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            const payload = await response.json();
            if (!response.ok || payload?.success !== true) throw new Error(payload?.message || "Authentication failed.");
            location.replace(safeReturnTarget());
        } catch (error) {
            message(error.message || "Could not connect to the Univrse API.", true);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = mode === "register" ? "Create account" : "Log in";
        }
    });

    modeButton.addEventListener("click", () => setMode(mode === "login" ? "register" : "login"));
    setMode(query.get("mode") === "register" ? "register" : "login");
    void existingSession();
})();
