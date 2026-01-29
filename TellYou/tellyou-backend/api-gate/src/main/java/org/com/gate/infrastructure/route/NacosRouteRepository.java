package org.com.gate.infrastructure.route;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.TypeReference;
import com.alibaba.nacos.api.config.ConfigService;
import com.alibaba.nacos.api.config.listener.Listener;
import com.alibaba.nacos.api.exception.NacosException;
import lombok.extern.slf4j.Slf4j;
import org.com.gate.domain.route.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

import javax.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executor;

/**
 * 从Nacos配置中心读取路由的仓储实现（动态路由）
 */
@Repository
@Slf4j
public class NacosRouteRepository implements RouteRepository {

    @Value("${nacos.server-addr:localhost:8848}")
    private String nacosServerAddr;

    @Value("${nacos.namespace:public}")
    private String namespace;

    @Value("${nacos.group:DEFAULT_GROUP}")
    private String group;

    @Value("${gateway.route.config-data-id:gateway-routes}")
    private String configDataId;

    private ConfigService configService;
    private final ConcurrentHashMap<RouteID, Route> routes = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() throws NacosException {
        // 初始化Nacos ConfigService
        this.configService = com.alibaba.nacos.api.NacosFactory.createConfigService(
            createProperties()
        );

        // 初始加载路由
        refresh();

        // 监听配置变化
        configService.addListener(configDataId, group, new Listener() {
            @Override
            public void receiveConfigInfo(String configInfo) {
                log.info("路由配置更新，重新加载...");
                refresh();
            }

            @Override
            public Executor getExecutor() {
                return null;
            }
        });

        log.info("Nacos路由仓储初始化完成，当前路由数: {}", routes.size());
    }

    private java.util.Properties createProperties() {
        java.util.Properties properties = new java.util.Properties();
        properties.put("serverAddr", nacosServerAddr);
        properties.put("namespace", namespace);
        return properties;
    }

    @Override
    public List<Route> findAll() {
        return new ArrayList<>(routes.values());
    }

    @Override
    public Optional<Route> findById(RouteID id) {
        return Optional.ofNullable(routes.get(id));
    }

    @Override
    public void save(Route route) {
        routes.put(route.getId(), route);
        log.info("保存路由: {}", route.getId());
    }

    @Override
    public void remove(RouteID id) {
        routes.remove(id);
        log.info("删除路由: {}", id);
    }

    @Override
    public void refresh() {
        try {
            String config = configService.getConfig(configDataId, group, 5000);
            if (config == null || config.isEmpty()) {
                log.warn("路由配置为空，使用默认配置");
                loadDefaultRoutes();
                return;
            }

            List<RouteConfigDTO> routeConfigs = JSON.parseObject(config, new TypeReference<List<RouteConfigDTO>>() {});
            routes.clear();

            for (RouteConfigDTO dto : routeConfigs) {
                Route route = convertToRoute(dto);
                routes.put(route.getId(), route);
            }

            log.info("路由刷新完成，当前路由数: {}", routes.size());
        } catch (NacosException e) {
            log.error("刷新路由失败，使用默认配置", e);
            loadDefaultRoutes();
        }
    }

    private void loadDefaultRoutes() {
        // 从application.yml加载默认路由（如果Nacos配置不可用）
        routes.clear();
        // 这里可以从Spring的配置属性中读取
    }

    private Route convertToRoute(RouteConfigDTO dto) {
        RouteID id = new RouteID(dto.getId() != null ? dto.getId() : generateRouteId(dto));
        PathPattern pathPattern = new PathPattern(dto.getPath(), dto.isPublic());
        ServiceName serviceName = new ServiceName(dto.getService());
        HttpMethods httpMethods = new HttpMethods(dto.getMethods() != null ? dto.getMethods() : "*");

        return new Route(id, pathPattern, serviceName, httpMethods, dto.isRequiresAuth());
    }

    private String generateRouteId(RouteConfigDTO dto) {
        return dto.getPath() + ":" + dto.getService();
    }

    /**
     * 路由配置DTO（用于从Nacos读取）
     */
    private static class RouteConfigDTO {
        private String id;
        private String path;
        private String service;
        private String methods;
        private boolean isPublic;
        private boolean requiresAuth;

        // Getters and Setters
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getPath() { return path; }
        public void setPath(String path) { this.path = path; }
        public String getService() { return service; }
        public void setService(String service) { this.service = service; }
        public String getMethods() { return methods; }
        public void setMethods(String methods) { this.methods = methods; }
        public boolean isPublic() { return isPublic; }
        public void setPublic(boolean aPublic) { isPublic = aPublic; }
        public boolean isRequiresAuth() { return requiresAuth; }
        public void setRequiresAuth(boolean requiresAuth) { this.requiresAuth = requiresAuth; }
    }
}
