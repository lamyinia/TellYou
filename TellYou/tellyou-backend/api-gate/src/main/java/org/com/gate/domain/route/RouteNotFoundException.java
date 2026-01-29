package org.com.gate.domain.route;

/**
 * 路由未找到异常
 */
public class RouteNotFoundException extends RuntimeException {

    public RouteNotFoundException(String message) {
        super(message);
    }
}
