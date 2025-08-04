package org.com.modules.user.domain.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum SessionTypeEnum {
    PRIVATE(0, "单聊"),
    PUBLIC(1, "群聊");

    private final Integer status;
    private final String option;
}
