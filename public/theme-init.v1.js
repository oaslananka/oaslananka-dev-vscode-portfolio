(() => {
  try {
    const allowedThemes = ["github-dark","dracula","ayu-dark","ayu-mirage","nord","night-owl"];
    const root = document.documentElement;
    const savedTheme = localStorage.getItem('theme');
    const configuredDefault = root.dataset.defaultTheme;
    let theme = "github-dark";

    if (savedTheme && allowedThemes.includes(savedTheme)) {
      theme = savedTheme;
    } else if (configuredDefault && allowedThemes.includes(configuredDefault)) {
      theme = configuredDefault;
    }

    root.dataset.theme = theme;
  } catch {
    // Theme initialization is best-effort; CSS defaults remain usable.
  }
})();
