package org.com.gate.domain.route;

import lombok.Getter;

import java.util.Objects;

/**
 * 路由ID值对象
 */
@Getter
public class RouteID {
    private final String value;

    public RouteID(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("路由ID不能为空");
        }
        this.value = value;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        RouteID routeId = (RouteID) o;
        return Objects.equals(value, routeId.value);
    }

    @Override
    public int hashCode() {
        return Objects.hash(value);
    }

    @Override
    public String toString() {
        return value;
    }
}
