package org.com.gate.interfaces.rest;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.com.gate.application.GatewayApplicationService;
import org.com.gate.domain.response.GatewayResponseDTO;
import org.com.gate.domain.request.GatewayRequest;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 网关控制器
 */
@RestController
@RequestMapping("/api")
@Slf4j
@RequiredArgsConstructor
public class GatewayController {

    private final GatewayApplicationService applicationService;

    @RequestMapping(value = "/**", method = {
            RequestMethod.GET,
            RequestMethod.POST,
            RequestMethod.PUT,
            RequestMethod.DELETE,
            RequestMethod.PATCH
    })
    public GatewayResponseDTO gateway(@RequestBody(required = false) Map<String, Object> body, @RequestParam(required = false) Map<String, String> queryParams,
                                      HttpServletRequest request) {
        GatewayRequest gatewayRequest = buildGatewayRequest(request, body, queryParams);
        return applicationService.process(gatewayRequest);
    }

    private GatewayRequest buildGatewayRequest(HttpServletRequest request, Map<String, Object> body, Map<String, String> queryParams) {
        Map<String, Object> parameters = new HashMap<>();
        if (queryParams != null) {
            parameters.putAll(queryParams);
        }
        if (body != null) {
            parameters.putAll(body);
        }

        Map<String, String> headers = new HashMap<>();
        request.getHeaderNames().asIterator().forEachRemaining(name -> {
            headers.put(name, request.getHeader(name));
        });

        return new GatewayRequest(request.getRequestURI(), request.getMethod(), parameters, headers);
    }
}
