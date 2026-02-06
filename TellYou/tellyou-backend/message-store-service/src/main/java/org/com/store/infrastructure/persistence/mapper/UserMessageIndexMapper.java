package org.com.store.infrastructure.persistence.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.com.store.infrastructure.persistence.po.UserMessageIndexDO;

import java.util.List;

@Mapper
public interface UserMessageIndexMapper {

    int batchInsertIgnore(List<UserMessageIndexDO> items);
}
