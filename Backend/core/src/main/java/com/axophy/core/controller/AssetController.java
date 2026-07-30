package com.axophy.core.controller;

import com.axophy.core.model.Asset;
import com.axophy.core.repository.AssetRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/assets")
@CrossOrigin(origins = "*") // Fundamental: Permite que os seus arquivos HTML locais conversem com o Java sem serem bloqueados pelo navegador (Erro de CORS)
public class AssetController {

    @Autowired
    private AssetRepository assetRepository;

    @Autowired
    private com.axophy.core.service.MqttMessagingService mqttService;

    // Endpoint 1: GET /api/assets
    // Retorna a lista de todos os motores cadastrados (usado por todas as IHMs)
    @GetMapping
    public List<Asset> getAllAssets() {
        return assetRepository.findAll();
    }

    // Endpoint 2: POST /api/assets
    // Recebe o JSON do diretor.html e salva/atualiza no PostgreSQL
    @PostMapping
    public Asset createOrUpdateAsset(@RequestBody Asset asset) {
        // Se o estado vier nulo na criação, definimos como OFFLINE por padrão
        if (asset.getState() == null) {
            asset.setState("OFFLINE");
        }
        return assetRepository.save(asset);
    }

    // Endpoint 3: DELETE /api/assets/{id}
    // Recebe a ordem do diretor.html para apagar uma máquina
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAsset(@PathVariable Integer id) {
        assetRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // Endpoint 4: POST /api/assets/{id}/activate
    // Este é o gatilho que o Operador vai apertar para trocar a identidade do Digital Twin!
    @PostMapping("/{id}/activate")
    public ResponseEntity<?> activateAsset(@PathVariable Integer id) {
        // Formata o JSON de comando exatamente como definido no Tópico 7.2.2
        String commandJson = "{\"asset_id\": 1, \"command\": \"SWITCH_ID\", \"new_id\": " + id + "}";
        
        // Pede para o serviço enviar o MQTT
        mqttService.publishCommand(1, commandJson);
        
        return ResponseEntity.ok("Comando de ativação enviado para a máquina ID: " + id);
    }
}