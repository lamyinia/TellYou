package org.com.modules.user.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import lombok.RequiredArgsConstructor;
import org.com.modules.user.domain.entity.UserInfo;
import org.com.modules.user.mapper.UserInfoMapper;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

/**
* @author lanye
* @description 针对表【user_info(用户信息)】的数据库操作Service实现
* @createDate 2025-07-22 20:27:43
*/
@Service
@RequiredArgsConstructor
public class UserInfoDao extends ServiceImpl<UserInfoMapper, UserInfo> {
    public UserInfo getByEmail(String email){
        return getOne(new LambdaQueryWrapper<UserInfo>().eq(UserInfo::getEmail, email));
    }

    @Cacheable(value = "identifierCache", key = "#id")
    public String getIdentifierById(Long id){
        return (String) lambdaQuery()
                .eq(UserInfo::getUserId, id)
                .one().getIdentifier();
    }
}




