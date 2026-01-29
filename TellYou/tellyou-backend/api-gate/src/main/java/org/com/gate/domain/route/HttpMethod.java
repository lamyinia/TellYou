package org.com.gate.domain.route;

import java.util.Objects;

/**
 * HTTP方法值对象
 */
public class HttpMethod {
    private final String value;
    
    public HttpMethod(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("HTTP方法不能为空");
        }
        this.value = value.toUpperCase();
    }
    
    public static HttpMethod of(String value) {
        return new HttpMethod(value);
    }
    
    public String getValue() {
        return value;
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        HttpMethod that = (HttpMethod) o;
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
