package org.com.social.infrastructure.persistence.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.com.social.infrastructure.persistence.po.SessionMemberDO;

import java.util.List;

@Mapper
public interface SessionMemberMapper {

    SessionMemberDO selectOne(@Param("sessionId") Long sessionId, @Param("userId") Long userId);

    List<SessionMemberDO> selectBySessionId(@Param("sessionId") Long sessionId);

    int insertBatch(@Param("members") List<SessionMemberDO> members);

    int updateRole(@Param("sessionId") Long sessionId, @Param("userId") Long userId, @Param("role") Integer role);

    int deactivate(@Param("sessionId") Long sessionId, @Param("userId") Long userId, @Param("leaveTime") java.time.LocalDateTime leaveTime);
}
