package com.axophy.core.service;

import jakarta.annotation.PostConstruct;
import org.eclipse.paho.client.mqttv3.*;
import org.springframework.stereotype.Service;

@Service
public class MqttMessagingService {

    private MqttClient client;

    @PostConstruct
    public void init() {
        try {
            // Conecta no broker Mosquitto local na porta TCP 1883
            client = new MqttClient("tcp://localhost:1883", MqttClient.generateClientId());
            MqttConnectOptions options = new MqttConnectOptions();
            options.setAutomaticReconnect(true);
            options.setCleanSession(true);

            client.connect(options);
            System.out.println("✅ Backend conectado ao Mosquitto MQTT com sucesso!");

            // Inscrever no tópico de telemetria (Upstream) - Tópico 7.1.1
            String telemetryTopic = "axophy/plant01/machine/+/telemetry";
            client.subscribe(telemetryTopic, 1, (topic, message) -> {
                String payload = new String(message.getPayload());
                System.out.println("📥 Telemetria recebida no tópico " + topic + ": " + payload);
                // No nosso próximo passo, vamos pegar esse JSON e gravar no PostgreSQL!
            });

        } catch (MqttException e) {
            System.err.println("❌ Erro ao conectar no Mosquitto: " + e.getMessage());
        }
    }

    // Método para enviar ordens para as máquinas (Downstream) - Tópico 7.1.2
    public void publishCommand(Integer assetId, String commandJson) {
        if (client != null && client.isConnected()) {
            try {
                String topic = "axophy/plant01/machine/" + assetId + "/cmd";
                MqttMessage message = new MqttMessage(commandJson.getBytes());
                message.setQos(2); // QoS Nível 2 (Exactly once) exigido pela arquitetura
                client.publish(topic, message);
                System.out.println("📤 Comando enviado para " + topic + ": " + commandJson);
            } catch (MqttException e) {
                e.printStackTrace();
            }
        }
    }
}