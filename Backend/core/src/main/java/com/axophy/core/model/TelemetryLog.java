package com.axophy.core.model;

import jakarta.persistence.*;
import java.time.ZonedDateTime;

@Entity
@Table(name = "telemetry_log")
public class TelemetryLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    private Long logId;

    @ManyToOne
    @JoinColumn(name = "asset_id", nullable = false)
    private Asset asset;

    @Column
    private Double temperature;

    @Column
    private Double humidity;

    @Column(name = "current_amps")
    private Double currentAmps;

    @Column(name = "vibration_x")
    private Double vibrationX;

    @Column(name = "system_status", length = 20)
    private String systemStatus;

    @Column(name = "created_at", insertable = false, updatable = false)
    private ZonedDateTime createdAt;

    public TelemetryLog() {}

    // Getters e Setters
    public Long getLogId() { return logId; }
    public void setLogId(Long logId) { this.logId = logId; }

    public Asset getAsset() { return asset; }
    public void setAsset(Asset asset) { this.asset = asset; }

    public Double getTemperature() { return temperature; }
    public void setTemperature(Double temperature) { this.temperature = temperature; }

    public Double getHumidity() { return humidity; }
    public void setHumidity(Double humidity) { this.humidity = humidity; }

    public Double getCurrentAmps() { return currentAmps; }
    public void setCurrentAmps(Double currentAmps) { this.currentAmps = currentAmps; }

    public Double getVibrationX() { return vibrationX; }
    public void setVibrationX(Double vibrationX) { this.vibrationX = vibrationX; }

    public String getSystemStatus() { return systemStatus; }
    public void setSystemStatus(String systemStatus) { this.systemStatus = systemStatus; }

    public ZonedDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(ZonedDateTime createdAt) { this.createdAt = createdAt; }
}