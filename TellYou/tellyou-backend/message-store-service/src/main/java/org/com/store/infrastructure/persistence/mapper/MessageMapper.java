package org.com.store.infrastructure.persistence.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.com.store.infrastructure.persistence.po.MessageDO;

@Mapper
public interface MessageMapper {

    void insert(MessageDO messageDO);
}
