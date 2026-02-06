package org.com.social.infrastructure.persistence.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.com.social.infrastructure.persistence.po.ImSessionDO;

@Mapper
public interface ImSessionMapper {

    ImSessionDO selectById(@Param("sessionId") Long sessionId);

    int insert(ImSessionDO session);

    int updateState(@Param("sessionId") Long sessionId, @Param("state") Integer state);
}
