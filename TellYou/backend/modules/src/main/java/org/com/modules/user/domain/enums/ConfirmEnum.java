package org.com.modules.user.domain.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum ConfirmEnum {
    WAITING(0, "待处理"),
    ACCEPTED(1, "已同意");

    private final Integer status;
    private final String option;
}
