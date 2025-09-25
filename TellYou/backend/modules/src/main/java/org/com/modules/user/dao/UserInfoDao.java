package org.com.modules.user.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.com.modules.user.domain.entity.UserInfo;
import org.com.modules.user.domain.vo.resp.SearchByUidResp;
import org.com.modules.user.mapper.UserInfoMapper;
import org.com.modules.user.service.adapter.UserInfoAdapter;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

/**
* @author lanye
* @description 针对表 user_info(用户信息) 的数据库操作Service实现
* @createDate 2025-07-22 20:27:43
*/
@Service
public class UserInfoDao extends ServiceImpl<UserInfoMapper, UserInfo> {
    public UserInfo getByEmail(String email){
        return getOne(new LambdaQueryWrapper<UserInfo>().eq(UserInfo::getEmail, email));
    }

    @Cacheable(value = "identifierCache", key = "#id")
    public String getIdentifierById(Long id){
        UserInfo one = lambdaQuery()
                .eq(UserInfo::getUserId, id)
                .select(UserInfo::getIdentifier)
                .one();
        return one != null ? one.getIdentifier() : null;
    }

    public SearchByUidResp getBaseInfo(Long uid){
        return UserInfoAdapter.buildSearchByUidResp(
                lambdaQuery()
                        .eq(UserInfo::getUserId, uid)
                        .select(UserInfo::getUserId, UserInfo::getNickName, UserInfo::getAvatar, UserInfo::getSex, UserInfo::getPersonalSignature)
                        .one()
        );
    }
}




