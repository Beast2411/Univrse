(() => {
    const THEME_KEY = "univrse.theme";
    const root = document.documentElement;

    function readTheme() {
        try {
            return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
        } catch (error) {
            return "light";
        }
    }

    function applyTheme(theme) {
        root.dataset.theme = theme;
    }

    function updateToggle(toggle) {
        const isDark = root.dataset.theme === "dark";
        toggle.setAttribute("aria-pressed", String(isDark));
        toggle.title = isDark ? "Switch to light mode" : "Switch to dark mode";
        const label = document.querySelector("#themeToggleLabel");
        const icon = document.querySelector("#themeToggleIcon");
        if (label) label.textContent = isDark ? "Light mode" : "Dark mode";
        if (icon) icon.textContent = isDark ? "\u2600" : "\u263E";
    }

    // Apply before stylesheets finish loading to avoid a light-theme flash.
    applyTheme(readTheme());

    document.addEventListener("DOMContentLoaded", () => {
        const toggle = document.querySelector("#themeToggle");
        if (!toggle) return;
        updateToggle(toggle);
        toggle.addEventListener("click", () => {
            const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
            applyTheme(nextTheme);
            updateToggle(toggle);
            try {
                localStorage.setItem(THEME_KEY, nextTheme);
            } catch (error) {
                console.warn("The selected theme could not be saved:", error);
            }
        });
    });

    window.addEventListener("storage", (event) => {
        if (event.key === THEME_KEY || event.key === null) {
            applyTheme(readTheme());
            const toggle = document.querySelector("#themeToggle");
            if (toggle) updateToggle(toggle);
        }
    });
})();
