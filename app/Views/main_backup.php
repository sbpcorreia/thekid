<!DOCTYPE html>
<html>
<head>
    <title>WebSocket Client</title>
</head>
<body>
    <h1>WebSocket Test</h1>
    <pre id="output"></pre>

    <script>
        const output = document.getElementById('output');

        function log(message) {
            console.log(message);
            output.textContent += message + '\n';
        }

        let socket;

        function connectWebSocket() {
            socket = new WebSocket('ws://127.0.0.1:8081');

            socket.onopen = () => {
                log('[✔️] Conectado ao WebSocket');

                // Exemplo: pedir a lista de robôs
                socket.send(JSON.stringify({
                    type: 'get_robot_info'
                }));
            };

            socket.onmessage = (event) => {
                log('[📥] Mensagem recebida:');
                log(event.data);
            };

            socket.onerror = (error) => {
                log('[❌] Erro no WebSocket');
                console.error(error);
            };

            socket.onclose = () => {
                log('[🔌] Conexão fechada, tentando reconectar em 3s...');
                setTimeout(connectWebSocket, 3000);
            };
        }

        // Inicia a conexão
        connectWebSocket();
    </script>
</body>
</html>