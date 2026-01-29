package org.com.gate.interfaces.rest;

import lombok.extern.slf4j.Slf4j;
import org.com.gate.domain.response.GatewayResponseDTO;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 健康检查控制器
 */
@RestController
@Slf4j
public class HealthController {

    @GetMapping("/health")
    public GatewayResponseDTO health() {
        return GatewayResponseDTO.success(Map.of("status", "ok", "service", "api-gateway"));
    }
}
