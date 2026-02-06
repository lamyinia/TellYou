package org.com.store.infrastructure.persistence.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.com.store.infrastructure.persistence.po.MessageDedupDO;

@Mapper
public interface MessageDedupMapper {

    void insert(MessageDedupDO messageDedupDO);

    MessageDedupDO selectByClientMessageId(@Param("clientMessageId") String clientMessageId);

    int updateMsgIdAndSeqByClientMessageId(
            @Param("clientMessageId") String clientMessageId,
            @Param("msgId") long msgId,
            @Param("seq") long seq
    );
}
