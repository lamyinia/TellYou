package org.com.gate.domain.route;

import java.util.Optional;

/**
 * 路由匹配领域服务
 */
public class RouteMatcher {
    
    private final RouteRepository routeRepository;
    
    public RouteMatcher(RouteRepository routeRepository) {
        this.routeRepository = routeRepository;
    }
    
    /**
     * 匹配路由
     */
    public Optional<Route> match(String path, String method) {
        return routeRepository.findAll().stream()
            .filter(route -> route.matches(path, method))
            .findFirst();
    }
    
    /**
     * 匹配路由
     */
    public Optional<Route> match(String path, HttpMethod method) {
        return routeRepository.findAll().stream()
            .filter(route -> route.matches(path, method))
            .findFirst();
    }
}
