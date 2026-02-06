package org.com.pull.infrastructure.persistence.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.com.pull.infrastructure.persistence.po.MessageDO;

import java.util.List;

@Mapper
public interface MessageQueryMapper {

    List<MessageDO> listBySessionAfterSeq(
            @Param("sessionId") long sessionId,
            @Param("afterSeq") long afterSeq,
            @Param("limit") int limit
    );

    List<MessageDO> listByMsgIds(@Param("msgIds") List<Long> msgIds);
}
