package org.com.auth.infrastructure.persistence.mapper;

import org.com.auth.infrastructure.persistence.po.UserAuthDO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.Optional;

/**
 * 用户认证表 Mapper
 */
@Mapper
public interface UserAuthMapper {
    
    /**
     * 插入用户认证信息
     */
    void insert(UserAuthDO userAuthDO);
    
    /**
     * 更新用户认证信息
     */
    void update(UserAuthDO userAuthDO);
    
    /**
     * 根据用户ID查询
     */
    UserAuthDO selectById(@Param("userId") Long userId);
    
    /**
     * 根据邮箱查询
     */
    UserAuthDO selectByEmail(@Param("email") String email);
    
    /**
     * 检查邮箱是否存在
     */
    boolean existsByEmail(@Param("email") String email);
    
    /**
     * 删除用户认证信息
     */
    void deleteById(@Param("userId") Long userId);
}
