package org.com.modules.session.domain.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum GroupJoinModeEnum {
    FREE_ENTRY(1),
    REVIEW_NEEDED(2);

    private Integer status;
}
