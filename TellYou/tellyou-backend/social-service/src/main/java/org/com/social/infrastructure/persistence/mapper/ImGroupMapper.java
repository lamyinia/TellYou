package org.com.social.infrastructure.persistence.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.com.social.infrastructure.persistence.po.ImGroupDO;

@Mapper
public interface ImGroupMapper {

    ImGroupDO selectBySessionId(@Param("sessionId") Long sessionId);

    ImGroupDO selectById(@Param("groupId") Long groupId);

    java.util.List<ImGroupDO> selectByIds(@Param("groupIds") java.util.List<Long> groupIds);

    int insert(ImGroupDO group);

    int updateName(@Param("groupId") Long groupId, @Param("groupName") String groupName);

    int updateNotification(@Param("groupId") Long groupId, @Param("notification") String notification);

    int updateCard(@Param("groupId") Long groupId, @Param("card") String card);

    int updateSpeakMode(@Param("groupId") Long groupId, @Param("speakMode") Integer speakMode);

    int updateOwner(@Param("groupId") Long groupId, @Param("ownerId") Long ownerId);

    int updateState(@Param("groupId") Long groupId, @Param("state") Integer state);

    int updateMemberCount(@Param("groupId") Long groupId, @Param("memberCount") Integer memberCount);
}
