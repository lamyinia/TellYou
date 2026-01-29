package org.com.auth.infrastructure.persistence;

import org.com.auth.domain.user.*;
import org.com.auth.infrastructure.persistence.mapper.UserAuthMapper;
import org.com.auth.infrastructure.persistence.po.UserAuthDO;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * MyBatis 用户仓储实现
 * 负责领域对象与持久化对象之间的转换
 */
@Repository
public class MyBatisUserRepository implements UserRepository {
    
    private final UserAuthMapper userAuthMapper;
    
    public MyBatisUserRepository(UserAuthMapper userAuthMapper) {
        this.userAuthMapper = userAuthMapper;
    }
    
    @Override
    public void save(User user) {
        UserId userId = user.getId();
        Long userIdValue = userId.getValue();
        
        // 检查用户是否存在
        UserAuthDO existingAuth = userAuthMapper.selectById(userIdValue);
        
        if (existingAuth == null) {
            // 新增用户
            insertUser(user);
        } else {
            // 更新用户
            updateUser(user);
        }
    }
    
    /**
     * 插入新用户
     */
    private void insertUser(User user) {
        // 插入 user_auth
        UserAuthDO authDO = toUserAuthDO(user);
        userAuthMapper.insert(authDO);
    }
    
    /**
     * 更新用户
     */
    private void updateUser(User user) {
        // 更新 user_auth
        UserAuthDO authDO = toUserAuthDO(user);
        userAuthMapper.update(authDO);
    }
    
    @Override
    public Optional<User> findById(UserId userId) {
        Long userIdValue = userId.getValue();
        
        // 查询 user_auth
        UserAuthDO authDO = userAuthMapper.selectById(userIdValue);
        if (authDO == null) {
            return Optional.empty();
        }

        // 转换为领域对象
        User user = toDomainUser(authDO);
        return Optional.of(user);
    }
    
    @Override
    public Optional<User> findByEmail(Email email) {
        UserAuthDO authDO = userAuthMapper.selectByEmail(email.getValue());
        if (authDO == null) {
            return Optional.empty();
        }
        
        return findById(UserId.of(authDO.getUserId()));
    }
    
    @Override
    public boolean existsByEmail(Email email) {
        return userAuthMapper.existsByEmail(email.getValue());
    }
    
    @Override
    public void delete(UserId userId) {
        Long userIdValue = userId.getValue();
        userAuthMapper.deleteById(userIdValue);
    }
    
    /**
     * 将领域对象转换为 UserAuthDO
     */
    private UserAuthDO toUserAuthDO(User user) {
        UserAuthDO authDO = new UserAuthDO();
        authDO.setUserId(user.getId().getValue());
        authDO.setEmail(user.getEmail().getValue());
        authDO.setPasswordHash(user.getPassword().getHash());
        authDO.setAccountStatus(user.getAccountStatus().getCode());
        authDO.setCreateTime(user.getCreateTime());
        return authDO;
    }
    
    /**
     * 将持久化对象转换为领域对象
     */
    private User toDomainUser(UserAuthDO authDO) {
        // 转换值对象
        UserId userId = UserId.of(authDO.getUserId());
        Email email = Email.of(authDO.getEmail());
        Password password = Password.fromHash(authDO.getPasswordHash());
        AccountStatus accountStatus = AccountStatus.fromCode(authDO.getAccountStatus());
        
        // 重建领域对象
        // 注意：这里需要 updateTime，但数据库中没有，使用 createTime 作为默认值
        LocalDateTime updateTime = authDO.getCreateTime(); // 实际应该从数据库获取，这里简化处理

        return User.reconstitute(userId, email, password, accountStatus, authDO.getCreateTime(), updateTime);
    }
}
