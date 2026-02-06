package org.com.social.infrastructure.persistence.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.com.social.infrastructure.persistence.po.GroupPartitionDO;

@Mapper
public interface GroupPartitionMapper {

    boolean exists(@Param("groupId") Long groupId, @Param("partitionId") Integer partitionId);

    int insert(GroupPartitionDO partition);
}
