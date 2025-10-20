package org.com.modules.group.domain.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum GroupChatModeEnum {
    ALL_PERSON(1),
    ONLY_POWER(2);

    private Integer status;
}
