package org.com.gate.infrastructure.adapter.invoker;

import org.com.gate.domain.request.GatewayRequest;
import org.com.gate.domain.route.Route;
import org.com.gate.infrastructure.adapter.GrpcResponse;

/**
 * 服务调用器接口
 */
public interface ServiceInvoker {

    /**
     * 调用服务
     */
    GrpcResponse invoke(Route route, GatewayRequest request, Long userId);
}
