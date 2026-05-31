// Configurações globais do Chart.js para combinar com o tema Escuro/Industrial
Chart.defaults.color = '#64748b'; // Slate-500
Chart.defaults.font.family = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.9)';
Chart.defaults.plugins.tooltip.titleColor = '#fff';
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.borderColor = '#334155';
Chart.defaults.plugins.tooltip.borderWidth = 1;

// 1. Gráfico de Tendência Temporal (Linha dupla)
const trendCtx = document.getElementById('trendChart').getContext('2d');
new Chart(trendCtx, {
    type: 'line',
    data: {
        labels: ['10:30', '10:32', '10:34', '10:36', '10:38', '10:40', '10:42', 'Agora'],
        datasets: [
            {
                label: 'Temperatura (°C)',
                data: [35, 36, 38, 45, 46, 44, 43, 43.5],
                borderColor: '#f87171', // Red-400
                backgroundColor: 'rgba(248, 113, 113, 0.1)',
                borderWidth: 2,
                tension: 0.4, // Suaviza a curva
                yAxisID: 'y'
            },
            {
                label: 'Corrente (A)',
                data: [5, 5.2, 5.5, 12, 12.5, 11, 10.5, 10.8],
                borderColor: '#60a5fa', // Blue-400
                borderWidth: 2,
                tension: 0.4,
                yAxisID: 'y1'
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
            x: { grid: { color: '#1e293b' } },
            y: { type: 'linear', display: true, position: 'left', grid: { color: '#1e293b' } },
            y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false } }
        },
        plugins: { legend: { display: false } } // Escondemos a legenda para um visual mais limpo
    }
});

// 2. Matriz de Correlação (Gráfico de Dispersão / Scatter)
// Mostra que quando a corrente sobe, a temperatura sobe (física real do motor simulada)
const scatterCtx = document.getElementById('scatterChart').getContext('2d');
new Chart(scatterCtx, {
    type: 'scatter',
    data: {
        datasets: [{
            label: 'Amostras de Telemetria',
            data: [
                {x: 2, y: 28}, {x: 3, y: 30}, {x: 5, y: 35}, {x: 5.5, y: 38}, 
                {x: 10, y: 45}, {x: 12, y: 50}, {x: 14, y: 58}, {x: 15, y: 62} // Ponto anômalo de falha
            ],
            backgroundColor: '#a78bfa', // Purple-400
            borderColor: '#8b5cf6',
            borderWidth: 1,
            pointRadius: 4,
            pointHoverRadius: 6
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: { title: { display: true, text: 'Corrente (A)' }, grid: { color: '#1e293b' } },
            y: { title: { display: true, text: 'Temperatura (°C)' }, grid: { color: '#1e293b' } }
        },
        plugins: { legend: { display: false } }
    }
});

// 3. Gráfico de Pareto (Causa-Raiz)
// Combinação de Barra (Frequência) e Linha (Percentual Acumulado)
const paretoCtx = document.getElementById('paretoChart').getContext('2d');
new Chart(paretoCtx, {
    type: 'bar',
    data: {
        labels: ['Sobrecorrente', 'Vibração Alta', 'Sobretemperatura', 'Queda de Rede'],
        datasets: [
            {
                type: 'line',
                label: '% Acumulado',
                data: [45, 75, 90, 100], // Regra 80/20
                borderColor: '#fbbf24', // Amber-400
                backgroundColor: '#fbbf24',
                borderWidth: 2,
                yAxisID: 'y1'
            },
            {
                type: 'bar',
                label: 'Ocorrências',
                data: [25, 16, 8, 5],
                backgroundColor: '#38bdf8', // Sky-400
                borderRadius: 4,
                yAxisID: 'y'
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: { grid: { display: false } },
            y: { position: 'left', grid: { color: '#1e293b' } },
            y1: { position: 'right', min: 0, max: 100, grid: { drawOnChartArea: false } }
        },
        plugins: { legend: { display: false } }
    }
});

// 4. Gráfico de Disponibilidade (Rosca / Doughnut)
const doughnutCtx = document.getElementById('doughnutChart').getContext('2d');
new Chart(doughnutCtx, {
    type: 'doughnut',
    data: {
        labels: ['Operando', 'Parado (Ocioso)', 'Manutenção / Falha'],
        datasets: [{
            data: [85, 10, 5],
            backgroundColor: [
                '#22c55e', // Green-500
                '#64748b', // Slate-500
                '#ef4444'  // Red-500
            ],
            borderWidth: 0,
            hoverOffset: 4
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '80%', // Deixa o buraco no meio bem grande para o texto do HTML
        plugins: {
            legend: { display: false }
        }
    }
});


async function exportToPDF() {
    // Feedback visual para o usuário não clicar várias vezes
    const btn = document.querySelector('button[onclick="exportToPDF()"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Gerando PDF... Aguarde';
    btn.disabled = true;

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let currentY = 20;

        // Puxa o nome dinâmico do equipamento no Dropdown
        const assetSelect = document.getElementById('asset-selector');
        const assetName = assetSelect.options[assetSelect.selectedIndex].text;

        // Cabeçalho do Documento PDF
        doc.setFontSize(18);
        doc.setTextColor(59, 130, 246); // Azul AXOPHY
        doc.text("AXOPHY - Relatorio de Saude do Ativo", margin, currentY);
        currentY += 10;
        
        doc.setFontSize(11);
        doc.setTextColor(80, 80, 80);
        doc.text(`Equipamento: ${assetName}`, margin, currentY);
        doc.text(`Data de Emissao: ${new Date().toLocaleString('pt-BR')}`, margin, currentY + 6);
        currentY += 15;

        // Mapeamento das seções para renderização com proteção de quebra de página
        const sections = [
            { id: '#pdf-kpi', title: '1. Indice Global de Saude (AHI)' },
            { id: '#pdf-trend', title: '2. Analise de Tendencia Termica e Carga' },
            { id: '#pdf-scatter', title: '3. Matriz de Correlacao (Fisica do Ativo)' },
            { id: '#pdf-pareto', title: '4. Diagrama de Pareto (Causa-Raiz)' },
            { id: '#pdf-doughnut', title: '5. Distribuicao de Disponibilidade' },
            { id: '#pdf-log', title: '6. Linha do Tempo e Diagnosticos' }
        ];

        for (const section of sections) {
            const element = document.querySelector(section.id);
            if (element) {
                // Tira a "foto" do componente usando o fundo escuro do AXOPHY
                const canvas = await html2canvas(element, { 
                    backgroundColor: "#0f172a", 
                    scale: 2, // Scale 2 garante resolução HD para os gráficos
                    logging: false 
                });
                
                const imgData = canvas.toDataURL("image/png");
                const pdfWidth = pageWidth - (margin * 2);
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

                // Lógica de Quebra de Página (se passar de 270mm, vai para a próxima folha)
                if (currentY + pdfHeight > 270) {
                    doc.addPage();
                    currentY = 20;
                }

                // Subtítulo da Seção
                doc.setFontSize(12);
                doc.setTextColor(20, 20, 20);
                doc.text(section.title, margin, currentY);
                currentY += 5;
                
                // Cola a imagem renderizada
                doc.addImage(imgData, 'PNG', margin, currentY, pdfWidth, pdfHeight);
                currentY += pdfHeight + 12; // Adiciona margem para o próximo bloco
            }
        }
        
        // Salva o PDF dinamicamente
        const assetId = assetSelect.value;
        doc.save(`Relatorio_AXOPHY_MTR-0${assetId}.pdf`);

    } catch (error) {
        console.error("Erro critico na renderizacao do PDF: ", error);
        alert("Ocorreu um erro ao gerar o relatório. Verifique o console.");
    } finally {
        // Restaura o botão
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}