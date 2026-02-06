package org.com.pull.infrastructure.persistence.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.com.pull.infrastructure.persistence.po.UserMessageIndexDO;

import java.util.List;

@Mapper
public interface UserMessageIndexQueryMapper {

    List<UserMessageIndexDO> listOfflineIndex(
            @Param("userId") long userId,
            @Param("cursorMsgId") long cursorMsgId,
            @Param("limit") int limit
    );
}
