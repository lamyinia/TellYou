package org.com.gate.domain.route;

import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * HTTP方法集合值对象
 */
public class HttpMethods {
    private final Set<HttpMethod> methods;
    
    public HttpMethods(Set<HttpMethod> methods) {
        this.methods = new HashSet<>(methods);
    }
    
    public HttpMethods(String methods) {
        if (methods == null || methods.trim().isEmpty() || "*".equals(methods.trim())) {
            this.methods = Set.of(); // 空集合表示允许所有方法
        } else {
            this.methods = Set.of(methods.split(",")).stream()
                .map(String::trim)
                .map(HttpMethod::of)
                .collect(Collectors.toSet());
        }
    }
    
    /**
     * 检查是否包含指定方法
     */
    public boolean contains(HttpMethod method) {
        if (methods.isEmpty()) {
            return true; // 空集合表示允许所有方法
        }
        return methods.contains(method);
    }
    
    /**
     * 检查是否包含指定方法（字符串）
     */
    public boolean contains(String method) {
        return contains(HttpMethod.of(method));
    }
    
    public Set<HttpMethod> getMethods() {
        return new HashSet<>(methods);
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        HttpMethods that = (HttpMethods) o;
        return Objects.equals(methods, that.methods);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(methods);
    }
}
