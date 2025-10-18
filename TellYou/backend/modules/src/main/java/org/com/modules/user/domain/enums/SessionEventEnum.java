package org.com.modules.user.domain.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum SessionEventEnum {
    BUILD(1, "创建"),
    DELETE(2, "删除");

    private final Integer status;
    private final String sessionType;
}
