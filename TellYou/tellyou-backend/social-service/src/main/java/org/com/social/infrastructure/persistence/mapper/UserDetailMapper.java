package org.com.social.infrastructure.persistence.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.com.social.infrastructure.persistence.po.UserDetailDO;

@Mapper
public interface UserDetailMapper {

    void insert(UserDetailDO userDetailDO);

    void update(UserDetailDO userDetailDO);

    UserDetailDO selectById(@Param("userId") Long userId);

    void deleteById(@Param("userId") Long userId);
}
