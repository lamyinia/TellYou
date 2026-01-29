package org.com.gate.domain.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.com.gate.infrastructure.adapter.GrpcResponse;

/**
 * 网关响应DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GatewayResponseDTO {
    private int code;
    private String message;
    private Object data;

    public static GatewayResponseDTO success(Object data) {
        return new GatewayResponseDTO(200, "success", data);
    }

    public static GatewayResponseDTO error(String message) {
        return new GatewayResponseDTO(500, message, null);
    }

    public static GatewayResponseDTO error(int code, String message) {
        return new GatewayResponseDTO(code, message, null);
    }

    public static GatewayResponseDTO from(GrpcResponse grpcResponse) {
        return new GatewayResponseDTO(
            grpcResponse.getCode(),
            grpcResponse.getMessage(),
            grpcResponse.getData()
        );
    }
}
