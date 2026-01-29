package org.com.gate.domain.request;

import java.util.Map;

/**
 * 网关请求值对象
 */
public class GatewayRequest {
    
    /**
     * HTTP Bearer Token 认证方案前缀（符合 RFC 6750 标准）
     */
    private static final String BEARER_PREFIX = "Bearer ";
    
    private final String path;
    private final String method;
    private final Map<String, Object> parameters;
    private final Map<String, String> headers;
    
    public GatewayRequest(String path, String method, Map<String, Object> parameters, Map<String, String> headers) {
        this.path = path;
        this.method = method;
        this.parameters = Map.copyOf(parameters);
        this.headers = Map.copyOf(headers);
    }
    
    public String getPath() {
        return path;
    }
    
    public String getMethod() {
        return method;
    }
    
    public Map<String, Object> getParameters() {
        return Map.copyOf(parameters);
    }
    
    public Map<String, String> getHeaders() {
        return Map.copyOf(headers);
    }
    
    /**
     * 提取Token
     * 从 Authorization header 中提取 Bearer Token（格式：Bearer &lt;token&gt;）
     */
    public String extractToken() {
        String authHeader = headers.get("Authorization");
        if (authHeader != null && authHeader.startsWith(BEARER_PREFIX)) {
            return authHeader.substring(BEARER_PREFIX.length());
        }
        return null;
    }
    
    /**
     * 检查是否有Token
     */
    public boolean hasToken() {
        return extractToken() != null;
    }
}
