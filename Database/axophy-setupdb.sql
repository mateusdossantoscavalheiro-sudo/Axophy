-- ==============================================================================
-- AXOPHY CORE SYSTEM - DATABASE SETUP SCRIPT
-- ==============================================================================

-- 1. Limpeza de ambiente (CUIDADO: remove as tabelas se já existirem)
DROP TABLE IF EXISTS telemetry_log CASCADE;
DROP TABLE IF EXISTS assets CASCADE;

-- 2. Criação da entidade principal (Ativos / Motores)
CREATE TABLE assets (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    limittemp NUMERIC(5,2) DEFAULT 60.00,
    limitcurr NUMERIC(5,2) DEFAULT 14.00,
    limitvib NUMERIC(5,2) DEFAULT 10.00,
    state VARCHAR(20) DEFAULT 'OFFLINE'
);

-- 3. Criação da entidade temporal (Histórico de Telemetria)
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

-- 4. Otimização de Performance (Índice B-Tree exigido no Tópico 5.3)
-- Garante que o painel do Gestor carregue o histórico instantaneamente sem lag
CREATE INDEX idx_asset_time ON telemetry_log (asset_id, created_at DESC);

-- 5. Configuração de Permissões (Supabase)
-- Desativamos o RLS (Row Level Security) temporariamente para não bloquear
-- as inserções da API Java durante a fase de desenvolvimento.
ALTER TABLE assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_log DISABLE ROW LEVEL SECURITY;

-- 6. Inserção de Dados Mestre (Mock inicial para testar o Frontend/Backend)
INSERT INTO assets (id, name, limittemp, limitcurr, limitvib, state) VALUES 
(1, 'Main Lathe #01', 60.00, 14.00, 10.00, 'STOPPED'),
(2, 'CNC Milling #01', 45.00, 12.00, 8.00, 'STOPPED'),
(3, 'Cooling Pump #A', 55.00, 10.00, 5.00, 'OFFLINE');