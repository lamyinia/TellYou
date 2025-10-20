package org.com.modules.contact.domain.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum SessionTypeEnum {
    PRIVATE(1, "单聊"),
    PUBLIC(2, "群聊");

    private final Integer status;
    private final String sessionType;
}
