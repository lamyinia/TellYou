package org.com.shared.infrastructure.grpc;

/**
 * gRPC 客户端异常
 *
 * @author lanye
 */
public class GrpcClientException extends RuntimeException {

    public GrpcClientException(String message) {
        super(message);
    }

    public GrpcClientException(String message, Throwable cause) {
        super(message, cause);
    }
}
