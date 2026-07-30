package com.axophy.core.repository;

import com.axophy.core.model.TelemetryLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TelemetryLogRepository extends JpaRepository<TelemetryLog, Long> {
    
    // Aqui nós criamos um método personalizado para o Gestor:
    // Buscar as últimas 50 leituras de um motor específico, ordenado das mais recentes para as mais antigas.
    List<TelemetryLog> findTop50ByAssetIdOrderByCreatedAtDesc(Integer assetId);
}