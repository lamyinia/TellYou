package org.com.gate.domain.route;

import java.util.Objects;

/**
 * 服务名称值对象
 */
public class ServiceName {
    private final String value;
    
    public ServiceName(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("服务名称不能为空");
        }
        this.value = value;
    }
    
    public String getValue() {
        return value;
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ServiceName that = (ServiceName) o;
        return Objects.equals(value, that.value);
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
