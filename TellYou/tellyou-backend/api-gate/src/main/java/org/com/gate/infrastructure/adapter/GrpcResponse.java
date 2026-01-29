package org.com.gate.infrastructure.adapter;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * gRPC响应
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GrpcResponse {
    private int code;
    private String message;
    private Object data;
    
    public static GrpcResponse success(Object data) {
        return new GrpcResponse(200, "success", data);
    }
    
    public static GrpcResponse error(String message) {
        return new GrpcResponse(500, message, null);
    }
    
    public static GrpcResponse error(int code, String message) {
        return new GrpcResponse(code, message, null);
    }
}
