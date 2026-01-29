package org.com.auth.domain.user;

import java.util.Optional;

/**
 * 用户仓储接口（领域层）
 * 定义用户聚合的持久化操作
 */
public interface UserRepository {
    
    /**
     * 保存用户（新增或更新）
     */
    void save(User user);
    
    /**
     * 根据用户ID查找
     */
    Optional<User> findById(UserId userId);
    
    /**
     * 根据邮箱查找
     */
    Optional<User> findByEmail(Email email);
    
    /**
     * 检查邮箱是否存在
     */
    boolean existsByEmail(Email email);
    
    /**
     * 删除用户
     */
    void delete(UserId userId);
}
