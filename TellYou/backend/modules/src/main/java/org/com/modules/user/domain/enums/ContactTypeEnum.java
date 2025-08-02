package org.com.modules.user.domain.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum ContactTypeEnum {
    FRIEND(0, "好友"),
    GROUP(1, "群组");

    private final Integer status;
    private final String option;
}
