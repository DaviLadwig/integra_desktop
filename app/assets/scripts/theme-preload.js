(function () {
    try {
        const saved = localStorage.getItem('siaps_theme');
        const theme = saved === 'dark' || saved === 'light' ? saved : 'light';
        document.documentElement.setAttribute('data-theme', theme);
    } catch (error) {
        document.documentElement.setAttribute('data-theme', 'light');
    }
})();
