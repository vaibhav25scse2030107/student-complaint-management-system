// Create toggle button
const toggleBtn = document.createElement('button');
toggleBtn.className = 'theme-toggle-btn';
toggleBtn.title = "Toggle Day/Night Mode";
document.body.appendChild(toggleBtn);

// Set initial theme
const currentTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', currentTheme);
updateIcon(currentTheme);

// Toggle event
toggleBtn.addEventListener('click', () => {
    let theme = document.documentElement.getAttribute('data-theme');
    let newTheme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateIcon(newTheme);
});

function updateIcon(theme) {
    toggleBtn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
}
