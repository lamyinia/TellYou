package org.com.modules.contact.domain.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum SessionEventEnum {
    BUILD_PRIVATE(1, "创建单聊"),
    DELETE_PRIVATE(2, "删除单聊"),
    BUILD_PUBLIC(3, "创建群聊"),
    DELETE_PUBLIC(4, "删除群聊");

    private final Integer status;
    private final String sessionType;
}
