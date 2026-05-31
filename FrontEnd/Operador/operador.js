const ASSET_ID = 1;
const client = mqtt.connect('ws://localhost:9001');

// Elementos da IHM
const connStatus = document.getElementById('conn-status');
const statusBadge = document.getElementById('status-badge');
const valTemp = document.getElementById('val-temp');
const valCurr = document.getElementById('val-curr');
const valVib = document.getElementById('val-vib');
const valHum = document.getElementById('val-hum');

// Gerenciamento de Conexão
client.on('connect', () => {
    connStatus.innerText = 'COM. ONLINE';
    connStatus.className = 'text-xs font-bold px-2 py-1 bg-green-900 text-green-300 border border-green-700 rounded uppercase';
    
    // Inscreve para receber a telemetria do Motor 1
    client.subscribe(`axophy/plant01/machine/${ASSET_ID}/telemetry`);
});

client.on('offline', () => {
    connStatus.innerText = 'COM. OFFLINE';
    connStatus.className = 'text-xs font-bold px-2 py-1 bg-red-900 text-red-300 border border-red-700 rounded uppercase';
    statusBadge.className = 'state-STOPPED border-2 text-white font-black px-8 py-2 rounded text-xl uppercase tracking-widest';
    statusBadge.innerText = 'DESCONECTADO';
});

// Recebimento de Dados do Digital Twin
client.on('message', (topic, message) => {
    try {
        const data = JSON.parse(message.toString());
        
        // Garante que a IHM só leia os dados do motor correto
        if(data.asset_id !== ASSET_ID) return;

        // Atualiza Visores Numéricos
        valTemp.innerText = data.temperature.toFixed(1);
        valCurr.innerText = data.current_amps.toFixed(1);
        valVib.innerText = data.vibration_x.toFixed(1);
        valHum.innerText = data.humidity.toFixed(1);

        // Alerta visual de limites diretamente nos números
        valTemp.className = data.temperature >= 60.0 ? "text-4xl md:text-5xl font-black text-red-500 font-mono animate-pulse" : "text-4xl md:text-5xl font-light text-blue-300 font-mono";
        valCurr.className = data.current_amps >= 14.0 ? "text-4xl md:text-5xl font-black text-red-500 font-mono animate-pulse" : "text-4xl md:text-5xl font-light text-green-300 font-mono";
        valVib.className = data.vibration_x >= 10.0 ? "text-4xl md:text-5xl font-black text-red-500 font-mono animate-pulse" : "text-4xl md:text-5xl font-light text-yellow-300 font-mono";

        // Atualiza a Badge de Status Principal
        const state = data.system_status;
        statusBadge.innerText = state.replace('_', ' '); // Tira o underline para display
        statusBadge.className = `state-${state} border-2 text-white font-black px-8 py-2 rounded text-xl uppercase tracking-widest transition-colors`;

    } catch (error) {
        console.error("Erro ao processar pacote da IHM:", error);
    }
});

// Função acionada pelos botões físicos na tela
window.sendCommand = function(cmd) {
    if (!client.connected) {
        alert("Sem comunicação com o Broker MQTT.");
        return;
    }
    
    // Monta o JSON exato definido no seu contrato de arquitetura
    const payload = JSON.stringify({
        asset_id: ASSET_ID,
        command: cmd
    });

    // Publica no tópico de comando
    client.publish(`axophy/plant01/machine/${ASSET_ID}/cmd`, payload);
    console.log(`Comando enviado: ${cmd}`);
};