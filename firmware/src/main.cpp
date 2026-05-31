#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHTesp.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>

// --- Configuração de Pinos ---
#define PINO_DHT    15
#define PINO_POT    34
#define PINO_LED    12 
#define PINO_SERVO  13
#define ENDERECO_I2C 0x27

// --- Credenciais de Rede (Padrão Wokwi) ---
const char* ssid = "Wokwi-GUEST";
const char* senha = "";
const char* servidor_mqtt = "broker.hivemq.com"; 

WiFiClient cliente_esp;
PubSubClient cliente_mqtt(cliente_esp);
LiquidCrystal_I2C lcd(ENDERECO_I2C, 20, 4);
DHTesp dht;
Adafruit_MPU6050 mpu;
Servo motor_torno;

// --- Variáveis do Core Axophy ---
int id_ativo = 1; // ID Dinâmico Inicial
String estado_atual = "OFFLINE"; // Mantido em inglês pelo contrato do BD

// Limites de Segurança (Podem ser atualizados via nuvem futuramente)
float limite_temp = 60.0;
float limite_corr = 14.0;
float limite_vib = 10.0;

// Variáveis de Controle e Intertravamento (Trip)
unsigned long ultima_mensagem = 0;
unsigned long tempo_inicio_falha = 0;
bool em_falha = false;
int posicao_servo = 0;
int passo_servo = 5;

// --- Recebimento MQTT (Guardião de Sessão e Máquina de Estados) ---
void receber_mensagem_mqtt(char* topico, byte* payload, unsigned int tamanho) {
  String mensagem = "";
  for (int i = 0; i < tamanho; i++) mensagem += (char)payload[i];
  
  Serial.println("\n[MQTT] Mensagem Recebida: " + mensagem);

  // Deserialização segura do JSON
  StaticJsonDocument<256> doc;
  DeserializationError erro = deserializeJson(doc, mensagem);

  if (erro) {
    Serial.println("[ERRO] Falha ao ler o formato JSON.");
    return;
  }

  // Lemos as chaves do contrato (não traduzir as chaves)
  int id_alvo = doc["asset_id"];
  String comando = doc["command"].as<String>(); 

  // 1. Lógica de Identidade Dinâmica (Comando SWITCH_ID)
  if (comando == "SWITCH_ID" && id_alvo == id_ativo) {
    int novo_id = doc["new_id"];
    if (novo_id > 0) {
      id_ativo = novo_id;
      Serial.println("[AXOPHY] Identidade alterada para Motor #" + String(id_ativo));
      lcd.clear();
      lcd.setCursor(0, 1); lcd.print(" ID ALTERADO PARA: "); lcd.print(id_ativo);
      delay(1500);
      lcd.clear();
    }
    return;
  }

  // Se o comando não for para este motor, ignora
  if (id_alvo != id_ativo) return;

  // 2. Lógica de Máquina de Estados (Tópico 8 do Documento)
  if (estado_atual == "LOCKED_FAILURE") {
    if (comando == "MAINTENANCE") {
      estado_atual = "MAINTENANCE";
      Serial.println("[STATUS] Motor movido para MANUTENÇÃO.");
    } else {
      Serial.println("[BLOQUEIO] Motor travado. Necessário enviar comando MAINTENANCE primeiro.");
    }
  } 
  else if (estado_atual == "MAINTENANCE") {
    if (comando == "RESET") {
      estado_atual = "STOPPED";
      Serial.println("[STATUS] Falha resetada. Motor em modo PARADO (STOPPED).");
    }
  } 
  else {
    // Transições de estados regulares
    if (comando == "START") estado_atual = "OPERATING";
    else if (comando == "STOP") estado_atual = "STOPPED";
    else if (comando == "MAINTENANCE") estado_atual = "MAINTENANCE";
  }
}

void configurar_wifi() {
  Serial.print("Conectando na rede local");
  WiFi.begin(ssid, senha);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500); Serial.print(".");
  }
  Serial.println("\nWiFi Conectado!");
}

void reconectar_mqtt() {
  while (!cliente_mqtt.connected()) {
    Serial.print("Conectando ao Broker MQTT...");
    String id_cliente = "Axophy_Edge_" + String(random(0xffff), HEX);
    
    if (cliente_mqtt.connect(id_cliente.c_str())) {
      Serial.println("OK");
      // O Wokwi assina usando Wildcard (+) para escutar comandos de qualquer ID
      cliente_mqtt.subscribe("axophy/plant01/machine/+/cmd");
      if (estado_atual == "OFFLINE") estado_atual = "STOPPED";
    } else {
      Serial.print("Falhou (codigo=");
      Serial.print(cliente_mqtt.state());
      Serial.println("). Tentando novamente em 5s...");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  configurar_wifi();
  cliente_mqtt.setServer(servidor_mqtt, 1883);
  cliente_mqtt.setCallback(receber_mensagem_mqtt);

  pinMode(PINO_LED, OUTPUT);
  ESP32PWM::allocateTimer(0);
  motor_torno.setPeriodHertz(50);
  motor_torno.attach(PINO_SERVO, 500, 2400);

  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(3, 1); lcd.print("SISTEMA AXOPHY");
  lcd.setCursor(2, 2); lcd.print("INICIANDO EDGE...");

  dht.setup(PINO_DHT, DHTesp::DHT22);
  mpu.begin();
  
  delay(2000);
  lcd.clear();
}

void loop() {
  if (!cliente_mqtt.connected()) {
    estado_atual = "OFFLINE";
    reconectar_mqtt();
  }
  cliente_mqtt.loop();

  // --- Aquisição de Dados Físicos ---
  TempAndHumidity dados_dht = dht.getTempAndHumidity();
  float t = isnan(dados_dht.temperature) ? 0.0 : dados_dht.temperature;
  float h = isnan(dados_dht.humidity) ? 0.0 : dados_dht.humidity;
  float corrente_simulada = (analogRead(PINO_POT) / 4095.0) * 15.0; 
  
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  float vib_x = a.acceleration.x;

  // --- Lógica de Intertravamento (Segurança Ativa - 5 Segundos) ---
  bool condicao_critica = (t >= limite_temp) || (corrente_simulada >= limite_corr) || (vib_x >= limite_vib);

  if (condicao_critica && estado_atual == "OPERATING") {
    if (!em_falha) {
      em_falha = true;
      tempo_inicio_falha = millis();
    } else if (millis() - tempo_inicio_falha >= 5000) {
      estado_atual = "LOCKED_FAILURE"; // Disparo do trip de segurança
      em_falha = false;
      Serial.println("\n[ALARME CRÍTICO] Limites violados por 5s. DESLIGAMENTO DE EMERGÊNCIA!");
    }
  } else {
    em_falha = false; // Reseta a contagem se a situação estabilizar
  }

  // --- Atuação de Hardware baseada no Estado ---
  if (estado_atual == "OPERATING") {
    digitalWrite(PINO_LED, HIGH); 
    posicao_servo += passo_servo;
    if(posicao_servo >= 180 || posicao_servo <= 0) passo_servo = -passo_servo;
    motor_torno.write(posicao_servo);
    delay(15); 
  } else {
    // Parada Segura (Pisca o LED se estiver em falha crítica)
    digitalWrite(PINO_LED, (estado_atual == "LOCKED_FAILURE") ? (millis() % 500 < 250) : LOW); 
    motor_torno.write(90); 
  }

  // --- Atualização da Tela (LCD) ---
  lcd.setCursor(0, 0);
  lcd.print("T:"); lcd.print(t, 1); lcd.print("C ");
  lcd.print("I:"); lcd.print(corrente_simulada, 1); lcd.print("A  ");
  
  lcd.setCursor(0, 1);
  lcd.print("Vib X: "); lcd.print(vib_x, 2); lcd.print(" g   ");
  
  lcd.setCursor(0, 2);
  lcd.print("ID: MTR-"); lcd.print(id_ativo); lcd.print("       ");
  
  lcd.setCursor(0, 3);
  lcd.print("ST: "); lcd.print(estado_atual); lcd.print("       ");

  // --- Telemetria (Envia para nuvem a cada 5 segundos - Req. RNF-002) ---
  long agora = millis();
  if (agora - ultima_mensagem > 5000) {
    ultima_mensagem = agora;
    
    // Construção do Payload - CHAVES MANTIDAS NO PADRÃO DO BANCO DE DADOS
    StaticJsonDocument<256> doc_saida;
    doc_saida["asset_id"] = id_ativo;
    doc_saida["temperature"] = String(t, 2).toFloat(); // Força limite decimal
    doc_saida["humidity"] = String(h, 2).toFloat();
    doc_saida["current_amps"] = String(corrente_simulada, 2).toFloat();
    doc_saida["vibration_x"] = String(vib_x, 2).toFloat();
    doc_saida["system_status"] = estado_atual;

    char buffer_saida[256];
    serializeJson(doc_saida, buffer_saida);
    
    String topico_publicacao = "axophy/plant01/machine/" + String(id_ativo) + "/telemetry";
    cliente_mqtt.publish(topico_publicacao.c_str(), buffer_saida);
    
    Serial.print("[TELEMETRIA] ");
    Serial.println(buffer_saida);
  }
}