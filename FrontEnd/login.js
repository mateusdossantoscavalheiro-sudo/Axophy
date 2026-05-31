document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault(); // Evita o recarregamento da página

    const user = document.getElementById('username').value.trim().toLowerCase();
    const pass = document.getElementById('password').value.trim();
    const errorBox = document.getElementById('error-message');

    // Base de dados simulada
    const credentials = {
        'digitaltwin': { pass: '1', url: '../DigitalTwin/digitaltwin.html' },
        'operador': { pass: '1', url: 'Operador/operador.html' },
        'gestor': { pass: '1', url: 'Gestor/gestor.html' },
        'diretor': { pass: '1', url: 'Diretor/diretor.html' }
    };

    // Validação
    if (credentials[user] && credentials[user].pass === pass) {
        // Sucesso: esconde o erro (se estiver visível) e redireciona
        errorBox.classList.add('hidden');
        window.location.href = credentials[user].url;
    } else {
        // Falha: mostra a mensagem de erro
        errorBox.classList.remove('hidden');
        // Limpa o campo de senha
        document.getElementById('password').value = '';
    }
});