package org.com.social.infrastructure.persistence.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.com.social.infrastructure.persistence.po.GroupRelationDO;

import java.util.List;

@Mapper
public interface GroupRelationMapper {

    GroupRelationDO selectOne(@Param("groupId") Long groupId, @Param("userId") Long userId);

    List<GroupRelationDO> selectActiveByUserId(@Param("userId") Long userId);

    long countActiveByGroupId(@Param("groupId") Long groupId);

    List<GroupRelationDO> selectActivePageByGroupId(@Param("groupId") Long groupId, @Param("offset") long offset, @Param("limit") int limit);

    int updateRole(@Param("groupId") Long groupId, @Param("userId") Long userId, @Param("role") Integer role);

    int deactivate(@Param("groupId") Long groupId, @Param("userId") Long userId, @Param("leaveTime") java.time.LocalDateTime leaveTime);

    int insertBatch(@Param("relations") List<GroupRelationDO> relations);
}
