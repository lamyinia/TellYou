package org.com.gate.domain.route;

import java.util.Objects;

/**
 * 路径模式值对象
 */
public class PathPattern {
    private final String pattern;
    private final boolean isPublic;
    
    public PathPattern(String pattern, boolean isPublic) {
        if (pattern == null || pattern.isBlank()) {
            throw new IllegalArgumentException("路径模式不能为空");
        }
        this.pattern = pattern;
        this.isPublic = isPublic;
    }
    
    public PathPattern(String pattern) {
        this(pattern, false);
    }
    
    public String getPattern() {
        return pattern;
    }
    
    public boolean isPublic() {
        return isPublic;
    }
    
    /**
     * 检查路径是否匹配模式
     */
    public boolean matches(String path) {
        return matchesAntPattern(pattern, path);
    }
    
    private boolean matchesAntPattern(String pattern, String path) {
        String[] patternParts = pattern.split("/");
        String[] pathParts = path.split("/");
        
        int patternIndex = 0;
        int pathIndex = 0;
        
        while (patternIndex < patternParts.length && pathIndex < pathParts.length) {
            String patternPart = patternParts[patternIndex];
            
            if ("**".equals(patternPart)) {
                return true;
            }
            
            if ("*".equals(patternPart)) {
                patternIndex++;
                pathIndex++;
                continue;
            }
            
            if (!patternPart.equals(pathParts[pathIndex])) {
                return false;
            }
            
            patternIndex++;
            pathIndex++;
        }
        
        return patternIndex == patternParts.length && pathIndex == pathParts.length;
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        PathPattern that = (PathPattern) o;
        return isPublic == that.isPublic && Objects.equals(pattern, that.pattern);
    }
    
    @Override
    public int hashCode() {
        return Objects.hash(pattern, isPublic);
    }
}
