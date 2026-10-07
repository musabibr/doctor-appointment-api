// Applies the saved theme before the page renders, so there is no flash of the
// wrong theme. Kept as a tiny external file because the production
// Content-Security-Policy does not allow inline scripts.
(function () {
    var theme = "light";
    try {
        var saved = localStorage.getItem("doctorri.theme");
        var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        theme = saved === "dark" || (saved !== "light" && prefersDark) ? "dark" : "light";
    } catch {
        // Storage blocked: fall back to the light theme.
    }
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
})();
