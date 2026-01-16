// Theme Toggle Logic
// This script should be included in <head> to prevent flash of wrong theme

(function () {
    const theme = localStorage.getItem('theme');

    function applyTheme(mode) {
        if (mode === 'dark') {
            document.documentElement.classList.add('dark');
        } else if (mode === 'light') {
            document.documentElement.classList.remove('dark');
        } else {
            // System preference
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
    }

    // Apply on load
    applyTheme(theme);

    // Expose globally for toggle buttons
    window.setTheme = function (mode) {
        localStorage.setItem('theme', mode);
        applyTheme(mode);
    };

    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme') || localStorage.getItem('theme') === 'system') {
            applyTheme('system');
        }
    });
})();
