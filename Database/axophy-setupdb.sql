-- ==============================================================================
-- AXOPHY CORE SYSTEM - DATABASE PRODUCTION SCRIPT
-- ==============================================================================

-- 1. Limpeza de ambiente para recriação limpa (CUIDADO: remove tabelas existentes)
DROP TABLE IF EXISTS telemetry_log CASCADE;
DROP TABLE IF EXISTS assets CASCADE;

-- 2. Entidade Principal: Ativos (assets)
-- Armazena o registro cadastral, especificações de limites e estado conhecido
CREATE TABLE assets (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    limittemp NUMERIC(5,2) DEFAULT 60.00,
    limitcurr NUMERIC(5,2) DEFAULT 14.00,
    limitvib NUMERIC(5,2) DEFAULT 10.00,
    state VARCHAR(20) DEFAULT 'OFFLINE'
);

-- 3. Entidade Temporal: Histórico de Telemetria (telemetry_log)
-- Registra as amostras temporais enviadas pelo hardware
-- Utilizamos NUMERIC(5,2) como mecanismo anti-crash para evitar dízimas periódicas no JSON
CREATE TABLE telemetry_log (
    log_id BIGSERIAL PRIMARY KEY,
    asset_id INT NOT NULL,
    temperature NUMERIC(5,2),
    humidity NUMERIC(5,2),
    current_amps NUMERIC(5,2),
    vibration_x NUMERIC(5,2),
    system_status VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_asset
        FOREIGN KEY(asset_id) 
        REFERENCES assets(id)
        ON DELETE CASCADE
);

-- 4. Otimização de Performance
-- Índice Composto B-Tree para evitar Table Scan completo e garantir carregamento rápido no painel do Gestor
CREATE INDEX idx_asset_time ON telemetry_log (asset_id, created_at DESC);

-- 5. Inserção de Dados Mestre Base (Para testes da API Java)
INSERT INTO assets (id, name, limittemp, limitcurr, limitvib, state) VALUES 
(1, 'MTR-01 | Motor de Indução', 60.00, 14.00, 10.00, 'STOPPED'),
(2, 'CNC Milling #01', 45.00, 12.00, 8.00, 'STOPPED'),
(3, 'Cooling Pump #A', 55.00, 10.00, 5.00, 'OFFLINE');