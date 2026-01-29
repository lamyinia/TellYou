package org.com.social.infrastructure.persistence.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.com.social.infrastructure.persistence.po.UserProfileDO;

@Mapper
public interface UserProfileMapper {

    void insert(UserProfileDO userProfileDO);

    void update(UserProfileDO userProfileDO);

    UserProfileDO selectById(@Param("userId") Long userId);

    UserProfileDO selectByImId(@Param("imId") String imId);

    boolean existsByImId(@Param("imId") String imId);

    void deleteById(@Param("userId") Long userId);
}
