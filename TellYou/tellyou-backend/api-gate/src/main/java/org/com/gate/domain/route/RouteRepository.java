package org.com.gate.domain.route;

import java.util.List;
import java.util.Optional;

/**
 * 路由仓储接口（领域层）
 */
public interface RouteRepository {

    /**
     * 查找所有路由
     */
    List<Route> findAll();

    /**
     * 根据ID查找路由
     */
    Optional<Route> findById(RouteID id);

    /**
     * 保存路由
     */
    void save(Route route);

    /**
     * 删除路由
     */
    void remove(RouteID id);

    /**
     * 刷新路由（从数据源重新加载）
     */
    void refresh();
}
