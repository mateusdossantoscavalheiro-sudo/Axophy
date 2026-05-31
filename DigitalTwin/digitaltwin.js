// --- NÚCLEO DO DIGITAL TWIN ---
const ASSET_ID = 1;
const LIMIT_TEMP = 60.0;
const LIMIT_CURR = 14.0;
const LIMIT_VIB = 10.0;

let currentState = "STOPPED";
let isFaulting = false;
let faultStartTime = 0;

// Elementos da Interface UI
const uiContainer = document.getElementById('machine-svg-container');
const uiLabel = document.getElementById('state-label');
const uiAlert = document.getElementById('critical-alert');
const sysLog = document.getElementById('sys-log');

function logMsg(msg, type="info") {
    const time = new Date().toLocaleTimeString('pt-BR', {hour12: false, fractionalSecondDigits: 2});
    let color = "text-slate-300";
    if(type === "rx") color = "text-purple-400";
    if(type === "tx") color = "text-blue-400";
    if(type === "err") color = "text-red-400";
    if(type === "warn") color = "text-yellow-400";
    
    sysLog.innerHTML += `<div class="${color} whitespace-nowrap">> [${time}] ${msg}</div>`;
    sysLog.scrollTop = sysLog.scrollHeight;
}

function updateSCADAVisuals() {
    uiContainer.className = `relative z-20 flex flex-col items-center justify-center my-8 md:my-0 transition-all duration-500 status-${currentState}`;
    uiLabel.innerText = currentState;
    
    if(currentState === "LOCKED_FAILURE") {
        uiAlert.classList.remove('hidden');
        uiAlert.classList.add('flex');
    } else {
        uiAlert.classList.add('hidden');
        uiAlert.classList.remove('flex');
    }
}

// --- PROTOCOLO MQTT (WebSockets) ---
const client = mqtt.connect('ws://localhost:9001');

client.on('connect', () => {
    const statusIndicator = document.getElementById('connection-status');
    statusIndicator.innerText = 'MQTT ONLINE';
    statusIndicator.className = 'px-3 py-1 rounded text-xs font-bold bg-green-900 text-green-300 border border-green-700 uppercase tracking-widest';
    logMsg("Conexão WebSocket estabelecida (Porta 9001).", "info");
    client.subscribe(`axophy/plant01/machine/+/cmd`);
});

client.on('message', (topic, message) => {
    logMsg(`RX [${topic}]: ${message.toString()}`, "rx");
    try {
        const doc = JSON.parse(message.toString());
        if (doc.asset_id !== ASSET_ID) return;
        
        const cmd = doc.command;

        // Lógica de Estado Industrial
        if (currentState === "LOCKED_FAILURE") {
            if (cmd === "MAINTENANCE") {
                currentState = "MAINTENANCE";
                logMsg("Trava de hardware liberada via rede. Modo MANUTENÇÃO.", "warn");
            } else {
                logMsg("Rejeitado: Ativo Intertravado. Exige MANUTENÇÃO.", "err");
            }
        } 
        else if (currentState === "MAINTENANCE") {
            if (cmd === "RESET") {
                currentState = "STOPPED";
                logMsg("Reset de falha confirmado via rede. Ativo PARADO.", "warn");
            }
        } 
        else {
            if (cmd === "START") currentState = "OPERATING";
            else if (cmd === "STOP") currentState = "STOPPED";
            else if (cmd === "MAINTENANCE") currentState = "MAINTENANCE";
        }
        updateSCADAVisuals();
    } catch (e) {
        logMsg("Falha de Parse JSON no Payload.", "err");
    }
});

// --- HARDWARE ENGINE (Rodando a 1Hz) ---
let tick = 0;
setInterval(() => {
    const t = parseFloat(document.getElementById('sim-temp').value);
    const c = currentState === "OPERATING" ? parseFloat(document.getElementById('sim-curr').value) : 0.0;
    const v = currentState === "OPERATING" ? parseFloat(document.getElementById('sim-vib').value) : 0.0;

    document.getElementById('hud-temp').innerText = t.toFixed(1);
    document.getElementById('hud-temp').className = t >= LIMIT_TEMP ? "text-3xl lg:text-4xl font-bold text-red-500" : "text-3xl lg:text-4xl font-light text-white transition-colors";
    
    document.getElementById('hud-curr').innerText = c.toFixed(1);
    document.getElementById('hud-curr').className = c >= LIMIT_CURR ? "text-3xl lg:text-4xl font-bold text-red-500" : "text-3xl lg:text-4xl font-light text-white transition-colors";
    
    document.getElementById('hud-vib').innerText = v.toFixed(1);
    document.getElementById('hud-vib').className = v >= LIMIT_VIB ? "text-3xl lg:text-4xl font-bold text-red-500" : "text-3xl lg:text-4xl font-light text-white transition-colors";

    const isCritical = (t >= LIMIT_TEMP) || (c >= LIMIT_CURR) || (v >= LIMIT_VIB);

    if (isCritical && currentState === "OPERATING") {
        if (!isFaulting) {
            isFaulting = true;
            faultStartTime = Date.now();
            logMsg("Alerta: Limites operacionais violados. Iniciando contagem de desarme.", "warn");
        } else if (Date.now() - faultStartTime >= 5000) {
            currentState = "LOCKED_FAILURE";
            isFaulting = false;
            updateSCADAVisuals();
            logMsg("SHUTDOWN DE EMERGÊNCIA: Violação de 5s confirmada.", "err");
        }
    } else {
        if(isFaulting) logMsg("Sensores estabilizados. Contagem de desarme abortada.", "info");
        isFaulting = false; 
    }

    tick++;
    if (tick >= 5 && client.connected) {
        tick = 0;
        const outDoc = {
            asset_id: ASSET_ID,
            temperature: parseFloat(t.toFixed(2)),
            humidity: 45.00,
            current_amps: parseFloat(c.toFixed(2)),
            vibration_x: parseFloat(v.toFixed(2)),
            system_status: currentState
        };
        const payload = JSON.stringify(outDoc);
        client.publish(`axophy/plant01/machine/${ASSET_ID}/telemetry`, payload);
        logMsg(`TX: ${payload}`, "tx");
    }
}, 1000);