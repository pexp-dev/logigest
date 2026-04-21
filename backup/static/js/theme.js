// theme.js - Gerenciamento de tema claro/escuro
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;

    // Função para definir o tema (garante que apenas uma classe está presente)
    function setTheme(theme) {
        // Remove ambas as classes primeiro
        document.body.classList.remove('theme-dark', 'theme-light');
        // Adiciona a classe desejada
        document.body.classList.add(`theme-${theme}`);
        // Guarda no localStorage
        localStorage.setItem('theme', theme);
        // Atualiza o ícone do botão
        updateToggleIcon(theme);
    }

    // Função para atualizar o ícone/texto do botão
    function updateToggleIcon(theme) {
        if (themeToggle) {
            themeToggle.innerHTML = theme === 'dark' 
                ? '<i class="fas fa-sun"></i> Claro' 
                : '<i class="fas fa-moon"></i> Escuro';
        }
    }

    // Carregar tema salvo ou padrão (dark)
    let savedTheme = localStorage.getItem('theme');
    if (!savedTheme || (savedTheme !== 'dark' && savedTheme !== 'light')) {
        savedTheme = 'dark';
    }
    setTheme(savedTheme);

    // Evento de clique para alternar
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.body.classList.contains('theme-dark') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    });
});