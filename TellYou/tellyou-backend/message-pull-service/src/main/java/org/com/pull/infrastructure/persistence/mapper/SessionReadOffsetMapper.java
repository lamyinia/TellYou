package org.com.pull.infrastructure.persistence.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.com.pull.infrastructure.persistence.po.SessionReadOffsetDO;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface SessionReadOffsetMapper {

    List<SessionReadOffsetDO> batchSelectByUserAndSessions(
            @Param("userId") long userId,
            @Param("sessionIds") List<Long> sessionIds
    );

    int updateLastSeqIfGreater(
            @Param("sessionId") long sessionId,
            @Param("userId") long userId,
            @Param("lastSeq") long lastSeq,
            @Param("updatedAt") LocalDateTime updatedAt
    );

    int insertIgnore(
            @Param("sessionId") long sessionId,
            @Param("userId") long userId,
            @Param("lastMsgId") long lastMsgId,
            @Param("lastSeq") long lastSeq,
            @Param("updatedAt") LocalDateTime updatedAt
    );

    Long selectLastSeq(
            @Param("sessionId") long sessionId,
            @Param("userId") long userId
    );
}
