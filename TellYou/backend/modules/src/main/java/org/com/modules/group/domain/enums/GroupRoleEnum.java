package org.com.modules.group.domain.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum GroupRoleEnum {
    NORMAL(0),
    MEMBER(1),
    MANAGER(2),
    OWNER(3);

    private final Integer role;
}
