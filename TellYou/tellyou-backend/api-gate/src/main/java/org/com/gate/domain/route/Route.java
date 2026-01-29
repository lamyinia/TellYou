package org.com.gate.domain.route;

import java.util.Objects;

/**
 * 路由聚合根
 */
public class Route {
    private final RouteID id;
    private final PathPattern pathPattern;
    private final ServiceName targetService;
    private final HttpMethods allowedMethods;
    private final boolean requiresAuth;

    public Route(RouteID id, PathPattern pathPattern, ServiceName targetService, HttpMethods allowedMethods, boolean requiresAuth) {
        this.id = Objects.requireNonNull(id);
        this.pathPattern = Objects.requireNonNull(pathPattern);
        this.targetService = Objects.requireNonNull(targetService);
        this.allowedMethods = Objects.requireNonNull(allowedMethods);
        this.requiresAuth = requiresAuth;
    }

    public Route(RouteID id, PathPattern pathPattern, ServiceName targetService, HttpMethods allowedMethods) {
        this(id, pathPattern, targetService, allowedMethods, !pathPattern.isPublic());
    }

    /**
     * 检查路由是否匹配指定的路径和方法
     */
    public boolean matches(String path, String method) {
        return pathPattern.matches(path) && allowedMethods.contains(method);
    }

    /**
     * 检查路由是否匹配指定的路径和方法
     */
    public boolean matches(String path, HttpMethod method) {
        return pathPattern.matches(path) && allowedMethods.contains(method);
    }

    public RouteID getId() {
        return id;
    }

    public PathPattern getPathPattern() {
        return pathPattern;
    }

    public ServiceName getTargetService() {
        return targetService;
    }

    public HttpMethods getAllowedMethods() {
        return allowedMethods;
    }

    public boolean requiresAuth() {
        return requiresAuth;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Route route = (Route) o;
        return Objects.equals(id, route.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
