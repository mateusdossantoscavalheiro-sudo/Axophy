// --- CONFIGURAÇÃO CAD ---
const GRID_SIZE = 20;

// Banco de Dados Local Simulado
let db = { 
    assets: [], 
    zones: [], 
    nextAssetId: 1, 
    nextZoneId: 1 
};

// Elementos Principais da DOM
const viewport = document.getElementById('viewport');
const floorPlan = document.getElementById('floor-plan');
const svgDict = JSON.parse(document.getElementById('svg-dictionary').textContent);

// Sistema de Transferência (Copiar / Colar) e Seleção
let selectedItem = null; // Guarda { type: 'asset'|'zone', id: 123 }
let clipboard = null;    // Guarda os dados copiados

// Sistema de Câmera (Pan & Zoom)
let camX = 0;
let camY = 0;
let camZoom = 1;
let isPanning = false;
let startPanX, startPanY;

// Atualiza a posição e o zoom do Canvas da Planta Baixa
function updateCamera() { 
    floorPlan.style.transform = `translate(${camX}px, ${camY}px) scale(${camZoom})`; 
}

// ==========================================
// MOUSE E NAVEGAÇÃO
// ==========================================

// Lógica de Zoom (Rodinha do Mouse)
viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomAmount = e.deltaY > 0 ? 0.9 : 1.1; // 10% por scroll
    camZoom *= zoomAmount;
    camZoom = Math.max(0.2, Math.min(camZoom, 3)); // Limite de 20% a 300% de Zoom
    updateCamera();
});

// Lógica de Panning (Clicar e Arrastar o Fundo)
viewport.addEventListener('mousedown', (e) => {
    // Se clicou no fundo, tira a seleção de tudo e inicia o Pan
    if(e.target === viewport || e.target === floorPlan) {
        clearSelection();
        isPanning = true;
        startPanX = e.clientX - camX;
        startPanY = e.clientY - camY;
        viewport.focus(); // Foca na tela para os atalhos de teclado funcionarem
    }
});

// Move a Câmera
window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    camX = e.clientX - startPanX; 
    camY = e.clientY - startPanY; 
    updateCamera();
});

// Solta a Câmera
window.addEventListener('mouseup', () => {
    isPanning = false;
});


// ==========================================
// SELEÇÃO E ATALHOS DE TECLADO
// ==========================================

function clearSelection() {
    selectedItem = null;
    document.querySelectorAll('.cad-element').forEach(el => el.classList.remove('selected'));
    resetAssetForm();
}

function selectElement(type, id, htmlElement) {
    clearSelection();
    selectedItem = { type, id };
    htmlElement.classList.add('selected');
    
    if (type === 'asset') {
        loadAssetToForm(id);
    }
}

// Captura do Teclado Global
document.addEventListener('keydown', (e) => {
    // Não executa atalhos se o Diretor estiver digitando no formulário
    if(e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    // 1. DELETE: Apaga o item selecionado
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedItem) {
        if (selectedItem.type === 'asset') {
            db.assets = db.assets.filter(a => a.id !== selectedItem.id);
        } else {
            db.zones = db.zones.filter(z => z.id !== selectedItem.id);
        }
        clearSelection();
        rebuildFactory();
    }

    // 2. CTRL + C: Copia o item
    if (e.ctrlKey && e.key === 'c' && selectedItem) {
        if (selectedItem.type === 'asset') {
            clipboard = { type: 'asset', data: {...db.assets.find(a => a.id === selectedItem.id)} };
        } else {
            clipboard = { type: 'zone', data: {...db.zones.find(z => z.id === selectedItem.id)} };
        }
    }

    // 3. CTRL + V: Cola o item com um pequeno deslocamento
    if (e.ctrlKey && e.key === 'v' && clipboard) {
        let clone = {...clipboard.data};
        clone.pos_x += 40; // Desloca para não cair exatamente em cima do original
        clone.pos_y += 40; 
        
        if (clipboard.type === 'asset') {
            clone.id = db.nextAssetId++;
            clone.name = clone.name + "_Copia";
            db.assets.push(clone);
        } else {
            clone.id = db.nextZoneId++;
            db.zones.push(clone);
        }
        rebuildFactory();
    }
});


// ==========================================
// INICIALIZAÇÃO & IMPORT/EXPORT JSON
// ==========================================

window.onload = () => {
    const savedData = localStorage.getItem('axophy_project');
    if (savedData) { 
        db = JSON.parse(savedData); 
        rebuildFactory(); 
    }
    
    // Centraliza a câmera no início
    camX = (viewport.clientWidth - 3000) / 2; 
    camY = (viewport.clientHeight - 2000) / 2;
    updateCamera();
};

function exportJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    const a = document.createElement('a'); 
    a.href = dataStr; 
    a.download = "Axophy_Planta_Completa.json"; 
    a.click();
}

function importJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try { 
            db = JSON.parse(e.target.result); 
            saveProjectToMemory(); 
            rebuildFactory(); 
            alert("Planta importada com sucesso!"); 
        } 
        catch(err) { 
            alert("Erro ao ler JSON. O arquivo pode estar corrompido."); 
        }
    };
    reader.readAsText(file);
}

function rebuildFactory() {
    floorPlan.innerHTML = '';
    
    // Renderiza zonas primeiro para ficarem no fundo
    db.zones.forEach(zone => renderZoneUI(zone));
    
    // Renderiza os ativos por cima
    db.assets.forEach(asset => renderAssetUI(asset));
}

// ==========================================
// SISTEMA DE ABAS E FORMULÁRIOS
// ==========================================

function switchTab(tabName) {
    document.getElementById('content-assets').classList.add('hidden');
    document.getElementById('content-layout').classList.add('hidden');
    
    document.getElementById('tab-assets').className = "flex-1 py-3 text-slate-500 hover:text-slate-300 transition-colors";
    document.getElementById('tab-layout').className = "flex-1 py-3 text-slate-500 hover:text-slate-300 transition-colors";
    
    document.getElementById(`content-${tabName}`).classList.remove('hidden');
    document.getElementById(`tab-${tabName}`).className = "flex-1 py-3 text-blue-400 border-b-2 border-blue-500 bg-slate-800 transition-colors";
}

// Elementos do Form
const fId = document.getElementById('asset-id');
const fName = document.getElementById('asset-name');
const fIcon = document.getElementById('asset-icon');
const fTemp = document.getElementById('asset-temp');
const fCurr = document.getElementById('asset-curr');
const fVib = document.getElementById('asset-vib');
const btnSave = document.getElementById('btn-save');
const btnCancel = document.getElementById('btn-cancel');

document.getElementById('crud-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (fId.value) {
        // EDIÇÃO
        const asset = db.assets.find(a => a.id == fId.value);
        asset.name = fName.value; 
        asset.icon = fIcon.value;
        asset.limittemp = fTemp.value; 
        asset.limitcurr = fCurr.value; 
        asset.limitvib = fVib.value;
        rebuildFactory();
    } else {
        // CRIAÇÃO
        const newAsset = {
            id: db.nextAssetId++, 
            name: fName.value, 
            icon: fIcon.value,
            limittemp: fTemp.value, 
            limitcurr: fCurr.value, 
            limitvib: fVib.value,
            // Matemática para fazer a máquina nascer exatamente no centro visível da Câmera
            pos_x: Math.round((-camX + viewport.clientWidth/2)/GRID_SIZE)*GRID_SIZE,
            pos_y: Math.round((-camY + viewport.clientHeight/2)/GRID_SIZE)*GRID_SIZE
        };
        db.assets.push(newAsset);
        renderAssetUI(newAsset);
    }
    resetAssetForm();
});

function resetAssetForm() {
    fId.value = ''; 
    fName.value = ''; 
    fIcon.value = 'motor';
    fTemp.value = '60.0'; 
    fCurr.value = '14.0'; 
    fVib.value = '10.0';
    btnSave.innerText = "Adicionar Ativo"; 
    btnCancel.classList.add('hidden');
}

function loadAssetToForm(id) {
    const asset = db.assets.find(a => a.id == id);
    if(!asset) return;
    
    switchTab('assets');
    fId.value = asset.id; 
    fName.value = asset.name; 
    fIcon.value = asset.icon;
    fTemp.value = asset.limittemp; 
    fCurr.value = asset.limitcurr; 
    fVib.value = asset.limitvib;
    
    btnSave.innerText = "Salvar Edição"; 
    btnCancel.classList.remove('hidden');
}

// ==========================================
// RENDERIZAÇÃO E MOTOR CAD
// ==========================================

function addZone(type) {
    // Paredes nascem mais finas, passagens nascem como quadrados
    let w = type === 'wall' ? 100 : 200; 
    let h = type === 'wall' ? 20 : 200;
    
    const newZone = {
        id: db.nextZoneId++, 
        type: type,
        pos_x: Math.round((-camX + viewport.clientWidth/2)/GRID_SIZE)*GRID_SIZE,
        pos_y: Math.round((-camY + viewport.clientHeight/2)/GRID_SIZE)*GRID_SIZE,
        width: w, 
        height: h
    };
    
    db.zones.push(newZone); 
    renderZoneUI(newZone);
}

function renderAssetUI(asset) {
    const div = document.createElement('div');
    div.className = 'cad-element draggable-asset';
    div.style.left = `${asset.pos_x}px`; 
    div.style.top = `${asset.pos_y}px`;
    div.innerHTML = `
        <div class="asset-icon">${svgDict[asset.icon]}</div>
        <div class="asset-label">${asset.name}</div>
    `;
    
    // Selecionar ao Clicar
    div.addEventListener('mousedown', (e) => {
        e.stopPropagation(); 
        selectElement('asset', asset.id, div);
    });
    
    // Duplo clique para abrir form
    div.addEventListener('dblclick', () => {
        loadAssetToForm(asset.id);
    });
    
    makeDraggable(div, asset);
    floorPlan.appendChild(div);
}

function renderZoneUI(zone) {
    const div = document.createElement('div');
    div.className = `cad-element floor-zone zone-${zone.type}`;
    div.style.left = `${zone.pos_x}px`; 
    div.style.top = `${zone.pos_y}px`;
    div.style.width = `${zone.width}px`; 
    div.style.height = `${zone.height}px`;

    // Selecionar ao Clicar
    div.addEventListener('mousedown', (e) => {
        e.stopPropagation(); 
        selectElement('zone', zone.id, div);
    });

    makeResizable(div, zone); // Motor de 4 âncoras
    makeDraggable(div, zone); // Arrastar
    
    floorPlan.appendChild(div);
}

// ==========================================
// MATEMÁTICA DE GRID (SNAP TO GRID)
// ==========================================

function makeDraggable(element, dbRef) {
    let isDragging = false;
    let startMouseX, startMouseY, startElemX, startElemY;

    element.addEventListener('mousedown', (e) => {
        // Se clicar nas bolinhas de redimensionar, não arrasta
        if(e.target.className.includes('resize')) return; 
        
        isDragging = true; 
        e.preventDefault();
        
        startMouseX = e.clientX; 
        startMouseY = e.clientY;
        startElemX = dbRef.pos_x; 
        startElemY = dbRef.pos_y;
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        // Posição baseada no movimento do mouse ajustado pelo zoom da câmera
        let rawX = startElemX + (e.clientX - startMouseX) / camZoom;
        let rawY = startElemY + (e.clientY - startMouseY) / camZoom;
        
        // SNAP TO GRID (Trava de 20 em 20 pixels)
        dbRef.pos_x = Math.round(rawX / GRID_SIZE) * GRID_SIZE;
        dbRef.pos_y = Math.round(rawY / GRID_SIZE) * GRID_SIZE;
        
        element.style.left = `${dbRef.pos_x}px`;
        element.style.top = `${dbRef.pos_y}px`;
    });
    
    window.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

// O Poderoso Motor de Redimensionamento em 4 Direções
function makeResizable(div, zone) {
    const handles = ['nw', 'ne', 'sw', 'se'];
    
    handles.forEach(dir => {
        const handle = document.createElement('div');
        handle.className = `resize-handle resize-${dir}`;
        div.appendChild(handle);

        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation(); 
            e.preventDefault();
            
            let startX = e.clientX;
            let startY = e.clientY;
            let startW = zone.width;
            let startH = zone.height;
            let startLeft = zone.pos_x;
            let startTop = zone.pos_y;

            function doDrag(e) {
                let dx = (e.clientX - startX) / camZoom;
                let dy = (e.clientY - startY) / camZoom;

                let newW = startW, newH = startH, newL = startLeft, newT = startTop;

                // Lógica de direção baseada no ponto que foi clicado
                if (dir.includes('e')) newW = startW + dx;
                if (dir.includes('s')) newH = startH + dy;
                if (dir.includes('w')) { newW = startW - dx; newL = startLeft + dx; }
                if (dir.includes('n')) { newH = startH - dy; newT = startTop + dy; }

                // Snap para o Grid (Nunca permite tamanho menor que 1 bloco de 20px)
                newW = Math.max(GRID_SIZE, Math.round(newW/GRID_SIZE)*GRID_SIZE);
                newH = Math.max(GRID_SIZE, Math.round(newH/GRID_SIZE)*GRID_SIZE);
                
                // Compensa o movimento esquerdo/superior (Left/Top)
                if (dir.includes('w')) newL = startLeft + (startW - newW);
                if (dir.includes('n')) newT = startTop + (startH - newH);

                zone.width = newW; 
                zone.height = newH;
                zone.pos_x = newL; 
                zone.pos_y = newT;

                div.style.width = `${newW}px`; 
                div.style.height = `${newH}px`;
                div.style.left = `${newL}px`; 
                div.style.top = `${newT}px`;
            }
            
            function stopDrag() { 
                window.removeEventListener('mousemove', doDrag); 
                window.removeEventListener('mouseup', stopDrag); 
            }
            
            window.addEventListener('mousemove', doDrag);
            window.addEventListener('mouseup', stopDrag);
        });
    });
}

// ==========================================
// PERSISTÊNCIA GERAL
// ==========================================

function saveProjectToMemory() {
    localStorage.setItem('axophy_project', JSON.stringify(db));
    alert("Projeto gravado na memória do navegador com sucesso!");
}

function clearAllData() {
    if(confirm("ATENÇÃO! Isso apagará todas as máquinas e o layout. Deseja continuar?")) {
        localStorage.removeItem('axophy_project');
        db = { assets: [], zones: [], nextAssetId: 1, nextZoneId: 1 };
        rebuildFactory();
    }
}